import { Resource } from "../resource";
import { spawn, exec } from 'child_process'

export class ExecutableResource extends Resource {
  constructor(target: string) {
    super(target)
  }

  execute(args: string[]) {
    spawn(this.target, args, {
      stdio: 'inherit'
    })
  }
}
