import { parse } from "url";
import { git } from "./shell";
import { join } from "path";

const GIT_SERVERS = ['gitee.com', 'github.com']

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
