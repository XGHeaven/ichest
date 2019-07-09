import { Resource } from "./resource";
import { basename, extname, join, isAbsolute, resolve, dirname, sep } from "path";
import { existsSync, statSync, promises, mkdirSync, writeFileSync, readFileSync, readdir, readdirSync } from "fs";
import { X_OK } from "constants";
import { ExecutableResource } from "./resources/exectable";
import { JavaScriptResource } from "./resources/js";
import { download, npmInstall, npmUninstall } from "./core/download";
import rimraf from 'rimraf'
import { log } from "./core/logger";
import { parse } from "url";

export type ChestConfig = any

export interface ChestStore {
  cmds: ChestCommandConfig[],
  index: Record<string, string>
}

export interface CommandBaseConfig {
  name: string
  path: string
  config?: any
}

export interface NpmCommandConfig extends CommandBaseConfig {
  type: CmdType.NPM
  source: string
  group?: string
}

export interface EntryCommandConfig extends CommandBaseConfig {
  type: CmdType.ENTRY
  source?: string
  group?: string
}

export interface GroupCommandConfig extends CommandBaseConfig {
  type: CmdType.GROUP
  source?: string
  group?: string
}

export interface AliasCommandConfig extends CommandBaseConfig {
  type: CmdType.ALIAS
}

export type ChestCommandConfig = NpmCommandConfig | EntryCommandConfig | GroupCommandConfig | AliasCommandConfig

export enum CmdType {
  GROUP = 'group',
  ENTRY = 'entry',
  NPM = 'npm',
  ALIAS = 'alias'
}

const defaultConfig: ChestConfig = {}
const defaultStore: ChestStore = {
  cmds: [],
  index: {}
}

export class Chest {
  private configPath: string
  private storePath: string
  private downloadPath: string
  private customPath: string
  public config!: ChestConfig
  public store!: ChestStore

  constructor(public root: string) {
    this.configPath = join(root, 'config.json')
    this.storePath = join(root, 'commands.json')
    this.downloadPath = join(root, 'remote')
    this.customPath = join(root, 'custom')
  }

  init(): void {
    mkdirSync(this.root, {recursive: true})

    try {
      writeFileSync(this.configPath, JSON.stringify(defaultConfig), {
        encoding: 'utf8',
        flag: 'wx'
      })
    } catch(e) { }

    try {
      writeFileSync(this.storePath, JSON.stringify(defaultStore), {
        encoding: 'utf8',
        flag: 'wx'
      })
    } catch(e) { }

    mkdirSync(this.downloadPath, { recursive: true })
    mkdirSync(this.customPath, { recursive: true })

    const config = {
      ...defaultConfig,
      ...JSON.parse(readFileSync(this.configPath, 'utf8'))
    }

    const cache = {
      ...defaultStore,
      ...JSON.parse(readFileSync(this.storePath, 'utf8'))
    }

    process.env.ICHEST_CONFIG = JSON.stringify(config)
    process.env.ICHEST_CONFIG_FILE = this.configPath

    this.config = config
    this.store = cache
  }

  run(cmd: string, args: string[]) {
    if (cmd.startsWith('global/')) {
      // remove global prefix
      cmd = cmd.slice(7)
    }

    let target = this.store.index[cmd]
    if (target) {
      const resource = this.createResource(target)
      if (resource) {
        return resource.execute(args)
      } else {
        // delete index, and research new location
        delete this.store.index[cmd]
        this.save()
      }
    }

    target = this.findTarget(cmd) || ''
    if (target) {
      const resource = this.createResource(target)
      if (resource) {
        this.store.index[cmd] = target
        this.save()
        return resource.execute(args)
      }
    }

    log(`Cannot found ${cmd}`)
  }

  async add(target: string, options: {
    group?: string
    type?: CmdType
    name?: string
  } = {}) {
    const urlInfo = parse(target)
    const command: ChestCommandConfig = {
      ...options
    } as any

    let source: string | undefined
    let type: CmdType
    let name: string

    if (urlInfo.protocol === 'http:' || urlInfo.protocol === 'https:') {
      // remote scripts, download first
      source = target
      target = await download(this.downloadPath, source)

      if (!target) {
        // cannot download
        return
      }

      const [ repo ] = target.split(sep).reverse()
      name = options.name || repo
      type = options.type || CmdType.GROUP
    } else if (urlInfo.protocol === 'npm:') {
      // npm scripts, use `npm install` to install it
      source = target
      const packagePath = source.replace('npm://', '')

      if (!packagePath) {
        return
      }

      const packageName = packagePath.startsWith('@') ? packagePath.split('@').slice(0, 2).join('@') : packagePath.split('@')[0]
      target = await npmInstall(this.downloadPath, packagePath)
      type = CmdType.NPM
      name = options.name || packageName
    } else if (!urlInfo.protocol) {
      // local file
      if (!isAbsolute(target)) {
        target = resolve(process.cwd(), target)
      }
      const stat = await promises.stat(target)
      type = options.type || (stat.isDirectory() ? CmdType.GROUP : CmdType.ENTRY)
      name = options.name || CmdType.NPM ? require(join(target, 'package.json')).name : basename(target, extname(target))
    } else {
      // unknow type
      return
    }

    const aliases = this.store.cmds.map(cmd => cmd.name)
    if (aliases.includes(name)) {
      let i = 1
      while (!aliases.includes(`${name}-${i}`)) {
        i++
      }
      // change name if conflict
      name = `${name}-${i}`
    }

    command.path = target
    ;(command as any).source = source
    command.name = name
    command.type = type

    log('Added success with', command.name)

    this.store.cmds.push(command)

    this.save()
  }

  async remove(name: string) {
    const cmd = this.store.cmds.find(cmd => cmd.name === name)
    if (!cmd) {
      console.log('Cannot found cmd')
      return
    }

    switch (cmd.type) {
      case CmdType.ALIAS:
        // delete cache
        delete this.store.index[cmd.name]
        break
      case CmdType.NPM:
        await npmUninstall(this.downloadPath, cmd.source.replace('npm://', ''))
        break
      default:
        if (cmd.source) {
          if (cmd.source.startsWith('http://') || cmd.source.startsWith('https://')) {
            await rimraf.__promisify__(cmd.path)
          }
        }
    }

    this.store.cmds = this.store.cmds.filter(c => c !== cmd)

    this.save()
  }

  list() {
    return this.store.cmds
  }

  getConfig(key: string) {
    const keys = key.split('.')
    let obj = this.config
    for (const key of keys) {
      if (obj[key]) {
        obj = obj[key]
      }
    }

    return obj
  }

  setConfig(key: string, value?: string) {
    const keys = key.split('.')
    let obj = this.config

    for (const key of keys.slice(0, -1)) {
      if (typeof obj[key] !== 'object') {
        obj[key] = {}
      }

      obj = obj[key]
    }

    const lastKey = keys[keys.length - 1]
    obj[lastKey] = value
    this.bindEnv()
    this.save()
  }

  private createResource(target: string): Resource | null {
    if (!existsSync(target)) {
      return null
    }

    const ext = extname(target)
    const stats = statSync(target)

    if (stats.isDirectory()) {
      // TODO
    } else if (stats.isFile()) {
      if ((stats.mode & X_OK) === X_OK) {
        // executable
        return new ExecutableResource(target)
      }

      switch(ext) {
        case '.js':
          return new JavaScriptResource(target)
          break
      }
    }

    return null
  }

  private findTarget(name: string) {
    // add custom group path to search
    const pieces = name.split('/')
    const allCmds: ChestCommandConfig[] = [
      {type: CmdType.GROUP, name: 'custom', path: this.customPath},
      // {type: CmdType.GROUP, path: join(this.downloadPath, '_node_package', 'node_modules', '.bin')},
      ...this.store.cmds
    ]

    if (pieces[0] === 'node') {
      // search node bins command
      const [_, ...names] = pieces
      name = names.join('/')
      const cmds = allCmds.filter(cmd => cmd.type === CmdType.NPM)
      for (const cmd of cmds) {
        try {
          const pack = require(join(cmd.path, 'package.json'))
          const bin = pack.bin || {}
          if (name in bin) {
            return resolve(cmd.path, bin[name])
          }
        } catch(e) {}
      }
    }

    // cannot found command, so full search
    for (const cmd of allCmds) {
      if (cmd.type === CmdType.NPM) {
        const joinName = join(cmd.group || '', cmd.name)
        if (joinName === name) {
          try {
            const pack = require(join(cmd.path, 'package.json'))
            if (pack.main) {
              return resolve(cmd.path, pack.main)
            }
          } catch(e) {}
        }
      } else if (cmd.type === CmdType.ENTRY) {
        const joinName = join(cmd.group || '', cmd.name)
        if (joinName === name) {
          return cmd.path
        }
      } else if (cmd.type === CmdType.GROUP) {
        try {
          const files = readdirSync(cmd.path, {withFileTypes: true}).filter(f => f.isFile() || f.isSymbolicLink())
          for (const file of files) {
            if (basename(file.name) === name) {
              return join(cmd.path, file.name)
            }
          }
        } catch(e) {
          console.warn('not found', cmd.path)
          continue
        }
      }
    }
  }

  private bindEnv() {
    process.env.ICHEST_CONFIG = JSON.stringify(this.config)
    process.env.ICHEST_CONFIG_FILE = this.configPath
  }

  private save() {
    writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8')
    writeFileSync(this.storePath, JSON.stringify(this.store, null, 2), 'utf8')
  }
}
