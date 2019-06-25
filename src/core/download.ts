import { parse } from "url";
import { git, npm, npmSlience } from "./shell";
import { join } from "path";
import { mkdirSync, readdirSync, writeFileSync } from "fs";

const GIT_SERVERS = ['gitee.com', 'github.com']
const defaultPackageJSON = {
  "name": "@ichest/private-node-package",
  "version": "0.0.0",
  "description": "Internal private package",
  private: true
}

export async function download(place: string, url: string): Promise<string> {
  const urlObj = parse(url)
  const { hostname = '', pathname = '' } = urlObj

  if (GIT_SERVERS.includes(hostname)) {
    const path = pathname.slice(1) // remove leading /
    if (path.split('/').length === 2) {
      // repo
      const target = join(place, hostname, path)
      await git('clone', '--depth', '1', `git@${hostname}:${path}.git`, target)
      return target
    }
    // TODO: check if is gist
  }

  return ''
}

export async function npmInstall(place: string, pack: string): Promise<string> {
  place = join(place, '_node_package')
  await tryInitNodePackage(place)
  await npm(place, 'install', pack, '--save')
  const infoString = await npmSlience(place, 'ls', pack, '--json', '--long')
  const info = JSON.parse(infoString)
  place = Object.values<any>(info.dependencies)[0].path
  return join(place)
}

export async function tryInitNodePackage(place: string) {
  mkdirSync(place, { recursive: true })
  const files = readdirSync(place)
  if (!files.includes('package.json')) {
    writeFileSync(join(place, 'package.json'), JSON.stringify(defaultPackageJSON, null, 2))
  } else {
    return
  }
}
