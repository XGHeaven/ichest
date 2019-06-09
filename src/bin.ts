import { Chest } from './chest'
import { homedir } from 'os';
import { join } from 'path';

const [interpreter, filename, command = '', ...args] = process.argv
const HOME = join(homedir(), '.ichest')

const chest = new Chest(HOME)
chest.init()

switch (command) {
  case '':
    console.log('please use ic <command> [...argument]')
    break
  case 'add':
    const [alias, target] = args
    if (target) {
      chest.add(target, {alias})
    } else {
      chest.add(alias)
    }
    break
  default:
    chest.run(command, args)
}
