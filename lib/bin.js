"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chest_1 = require("./chest");
const os_1 = require("os");
const [interpreter, filename, command = '', ...args] = process.argv;
const HOME = os_1.homedir();
const chest = new chest_1.Chest(HOME);
chest.init();
switch (command) {
    case '':
        console.log('please use ic <command> [...argument]');
        break;
    case 'add':
        const [alias, target] = args;
        if (target) {
            chest.add(target, { alias });
        }
        else {
            chest.add(alias);
        }
        break;
    default:
        chest.run(command, args);
}
