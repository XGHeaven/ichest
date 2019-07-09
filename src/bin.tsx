import React from 'react'
import {render} from 'ink'
import { Chest, CmdType } from './chest'
import { homedir, EOL } from 'os';
import { join } from 'path';
import yargs from 'yargs'
import { ResourceTable } from './component/resource-table';

const HOME = join(homedir(), '.ichest')

const argv = yargs
  .demandCommand()
  .version()
  .option('dir', {
    alias: 'd',
    desc: 'Store location'
  })
  .alias('v', 'version')
  .scriptName('ic')
  .command('list', 'List installed commands' , {}, args => {
    const chest = createChest(args)
    const list = chest.list()
    render(<ResourceTable data={list}></ResourceTable>)
  })
  .command('add <target>', 'Add commands with alias', {
    target: {
      type: 'string',
      required: true,
    },
    name: {
      type: 'string',
      alias: 'n',
    },
    type: {
      alias: 't',
      type: 'string',
      choices: Object.values(CmdType),
    },
    group: {
      type: 'string',
      alias: 'g',
    }
  }, (args) => {
    const {name, target, type, group} = args
    const chest = createChest(args)
    chest.add(target, {name, group, type: type as CmdType})
  })
  .command('remove <name>', 'Remove command', {
    name: {
      type: 'string',
      required: true
    }
  }, args => {
    const chest = createChest(args)
    chest.remove(args.name)
  })
  .command('config <key> [value]', 'Get/Set config value', {
    key: {
      type: 'string',
      required: true,
    },
    value: {
      type: 'string'
    },
  }, args => {
    const chest = createChest(args)
    if (!args.value) {
      // get
      return console.log(chest.getConfig(args.key))
    } else {
      chest.setConfig(args.value)
    }
  })
  .command('*', 'Run installed command', {}, args => {
    const [command, ...commandArgs] = args._
    if (!command) {
      console.log('Please use ichest <command>')
      return
    }
    const chest = createChest(args)
    chest.run(command, commandArgs)
  })
  .parse()

function createChest(config: any) {
  const chest = new Chest(config.dir || HOME)
  chest.init()
  return chest
}
