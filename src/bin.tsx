import React from 'react'
import {render} from 'ink'
import { Chest } from './chest'
import { homedir, EOL } from 'os';
import { join } from 'path';
import yargs from 'yargs'
import { ResourceTable } from './component/resource-table';

const HOME = join(homedir(), '.ichest')

const argv = yargs
  .demandCommand()
  .option('dir', {
    alias: 'd'
  })
  .scriptName('ichest')
  .command('help <command>', 'Show help', args => args, args => {
    console.log(args)
  })
  .command('list', 'List installed commands' , {}, args => {
    const chest = createChest(args)
    const list = chest.list()
    render(<ResourceTable data={list}></ResourceTable>)
  })
  .command('add [alias] <target>', 'Add commands with alias', {
    target: {
      type: 'string',
      required: true,
    },
    alias: {
      type: 'string',
    }
  }, (args) => {
    const {alias, target} = args
    const chest = createChest(args)
    if (alias) {
      chest.add(alias, {alias: target})
    } else {
      chest.add(target, {})
    }
  })
  .command('*', 'Run installed command', {}, args => {
    const [command, ...commandArgs] = args._
    const chest = createChest(args)
    chest.run(command, commandArgs)
  })
  .parse()

function createChest(config: any) {
  const chest = new Chest(config.dir || HOME)
  chest.init()
  return chest
}
