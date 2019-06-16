import { Resource } from "./resource";
import { basename, extname, join, isAbsolute, resolve } from "path";
import { existsSync, statSync, promises, mkdirSync, writeFileSync, readFileSync, readdir, readdirSync } from "fs";
import { X_OK } from "constants";
import { ExecutableResource } from "./resources/exectable";
import { JavaScriptResource } from "./resources/js";
import { download } from "./core/download";

export interface ChestConfig {

}

export interface ChestCache {
  cmds: ChestCmdCache[],
  index: Record<string, string>
}

export interface ChestCmdCache {
  type: CmdType,
  path: string,
  alias?: string
  source?: string
}

export enum CmdType {
  GROUP = 'group',
  ENTRY = 'entry',
}

const defaultConfig: ChestConfig = {}
const defaultCache: ChestCache = {
  cmds: [],
  index: {}
}

export class Chest {
  private cmds = new Map<string, Resource>()
  private configPath: string
  private cachePath: string
  private downloadPath: string
  private customPath: string
  public config!: ChestConfig
  public cache!: ChestCache

  constructor(public root: string) {
    this.configPath = join(root, 'config.json')
    this.cachePath = join(root, 'commands.json')
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
      writeFileSync(this.cachePath, JSON.stringify(defaultCache), {
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
      ...defaultCache,
      ...JSON.parse(readFileSync(this.cachePath, 'utf8'))
    }

    this.config = config
    this.cache = cache
  }

  run(cmd: string, args: string[]) {
    let target = this.cache.index[cmd]
    if (target) {
      const resource = this.createResource(target)
      if (resource) {
        return resource.execute(args)
      } else {
        // delete index, and research new location
        delete this.cache.index[cmd]
        this.save()
      }
    }

    target = this.findTarget(cmd) || ''
    if (target) {
      const resource = this.createResource(target)
      if (resource) {
        this.cache.index[cmd] = target
        this.save()
        return resource.execute(args)
      }
    }

    console.log(`Cannot found ${cmd}`)
  }

  async add(target: string, options: {
    alias?: string,
    type?: CmdType.GROUP
  } = {}) {
    let source: string | undefined
    if (target.startsWith('http://') || target.startsWith('https://')) {
      // remote scripts, download first
      source = target
      target = await download(this.downloadPath, source)

      if (!target) {
        // cannot download
        return
      }
    }
    if (!isAbsolute(target)) {
      target = resolve(process.cwd(), target)
    }

    this.cache.cmds.push({
      type: options.type || CmdType.ENTRY,
      path: target,
      alias: options.alias,
      source,
    })

    this.save()
  }

  list() {
    return this.cache.cmds
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
    const cmds = [{type: CmdType.GROUP, path: this.customPath}, ...this.cache.cmds]
    for (const cmd of cmds) {
      if (cmd.type === CmdType.ENTRY && (cmd.alias === name || basename(cmd.path) === name)) {
        return cmd.path
      }

      if (cmd.type === CmdType.GROUP) {
        const files = readdirSync(cmd.path, {withFileTypes: true}).filter(f => f.isFile())
        for (const file of files) {
          if (basename(file.name) === name) {
            return join(cmd.path, file.name)
          }
        }
      }
    }
  }

  private save() {
    writeFileSync(this.configPath, JSON.stringify(this.config), 'utf8')
    writeFileSync(this.cachePath, JSON.stringify(this.cache), 'utf8')
  }
}
