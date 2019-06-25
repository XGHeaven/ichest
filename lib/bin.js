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
    .option('dir', {
    alias: 'd'
})
    .scriptName('ichest')
    .command('help <command>', 'Show help', args => args, args => {
    console.log(args);
})
    .command('list', 'List installed commands', {}, args => {
    const chest = createChest(args);
    const list = chest.list();
    ink_1.render(react_1.default.createElement(resource_table_1.ResourceTable, { data: list }));
})
    .command('add [alias] <target>', 'Add commands with alias', {
    target: {
        type: 'string',
        required: true,
    },
    alias: {
        type: 'string',
    },
    type: {
        alias: 't',
        type: 'string',
        choices: Object.values(chest_1.CmdType),
    }
}, (args) => {
    const { alias, target, type } = args;
    const chest = createChest(args);
    if (alias) {
        chest.add(alias, { alias: target, type: type });
    }
    else {
        chest.add(target, { type: type });
    }
})
    .command('*', 'Run installed command', {}, args => {
    const [command, ...commandArgs] = args._;
    const chest = createChest(args);
    chest.run(command, commandArgs);
})
    .parse();
function createChest(config) {
    const chest = new chest_1.Chest(config.dir || HOME);
    chest.init();
    return chest;
}
