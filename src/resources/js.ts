import { Resource } from "../resource";
import { spawn } from "child_process";

export class JavaScriptResource extends Resource {
  execute(args: string[]): void {
    spawn('node', [this.target, ...args], { stdio: 'inherit' })
  }
}
