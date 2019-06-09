"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
function git(...args) {
    return new Promise((resolve, reject) => {
        const cp = child_process_1.spawn(`git`, args, {
            stdio: 'inherit'
        });
        cp.on('exit', code => {
            if (code) {
                return reject(code);
            }
            resolve();
        });
    });
}
exports.git = git;
