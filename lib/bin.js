"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const ink_1 = require("ink");
const chest_1 = require("./chest");
const os_1 = require("os");
const path_1 = require("path");
const yargs_1 = __importDefault(require("yargs"));
const resource_table_1 = require("./component/resource-table");
const HOME = path_1.join(os_1.homedir(), '.ichest');
const argv = yargs_1.default
    .demandCommand()
    .version()
    .option('dir', {
    alias: 'd',
    desc: 'Store location'
})
    .alias('v', 'version')
    .scriptName('ic')
    .command('list', 'List installed commands', {}, args => {
    const chest = createChest(args);
    const list = chest.list();
    ink_1.render(react_1.default.createElement(resource_table_1.ResourceTable, { data: list }));
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
        choices: Object.values(chest_1.CmdType),
    },
    group: {
        type: 'string',
        alias: 'g',
    }
}, (args) => {
    const { name, target, type, group } = args;
    const chest = createChest(args);
    chest.add(target, { name, group, type: type });
})
    .command('remove <name>', 'Remove command', {
    name: {
        type: 'string',
        required: true
    }
}, args => {
    const chest = createChest(args);
    chest.remove(args.name);
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
    const chest = createChest(args);
    if (!args.value) {
        // get
        return console.log(chest.getConfig(args.key));
    }
    else {
        chest.setConfig(args.value);
    }
})
    .command('*', 'Run installed command', {}, args => {
    const [command, ...commandArgs] = args._;
    if (!command) {
        console.log('Please use ichest <command>');
        return;
    }
    const chest = createChest(args);
    chest.run(command, commandArgs);
})
    .parse();
function createChest(config) {
    const chest = new chest_1.Chest(config.dir || HOME);
    chest.init();
    return chest;
}
