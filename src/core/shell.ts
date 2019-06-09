import { exec, execSync, spawn } from "child_process";

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
