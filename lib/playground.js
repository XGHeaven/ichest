"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chest_1 = require("./chest");
const path_1 = require("path");
;
(async () => {
    const chest = new chest_1.Chest(path_1.join(__dirname, '..', '.cache', 'ichest'));
    chest.init();
    // chest.add(join(homedir(), '.x'), {type: CmdType.GROUP})
    await chest.add('https://github.com/XGHeaven/nos-node-sdk', { type: chest_1.CmdType.GROUP });
    // chest.run('test.js', ['a', 'b'])
    // console.log(resource)
    // if (resource) {
    // resource.execute(['xxx'])
    // }
})().catch(console.error);
