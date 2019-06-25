import { spawn, SpawnOptions } from "child_process";

export function sh(command: string, ...args: string[]): Promise<string>
export function sh(options: SpawnOptions, command: string, ...args: string[]): Promise<string>
export function sh(options: SpawnOptions | string, ...args: string[]): Promise<string> {
  let command: string
  let opts: SpawnOptions = {}
  if (typeof options === 'string') {
    command = options
  } else {
    command = args[0]
    args = args.slice(1)
  }

  if (typeof options === 'object') {
    opts = options
  }

  return new Promise((resolve, reject) => {
    const cp = spawn(command, args, {
      ...opts
    })

    const chunks: Buffer[] = []
    if (cp.stdout) {
      cp.stdout.on('data', (buf) => chunks.push(buf))
    }

    cp.on('exit', code => {
      if (!code) {
        return resolve(Buffer.concat(chunks).toString('utf8'))
      }

      reject()
    })
  })
}

export function git(...args: string[]) {
  return new Promise((resolve, reject) => {
    const cp = spawn(`git`, args, {
      stdio: 'inherit'
    })

    cp.on('exit', code => {
      if (code) {
        return reject(code)
      }

      resolve()
    })
  })
}

export function npm(project: string, ...args: string[]) {
  return sh({
    stdio: 'inherit',
    cwd: project
  }, 'npm', ...args)
}

export function npmSlience(project: string, ...args: string[]) {
  return sh({
    stdio: 'pipe',
    cwd: project
  }, 'npm', ...args)
}
