"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
function sh(options, ...args) {
    let command;
    let opts = {};
    if (typeof options === 'string') {
        command = options;
    }
    else {
        command = args[0];
        args = args.slice(1);
    }
    if (typeof options === 'object') {
        opts = options;
    }
    return new Promise((resolve, reject) => {
        const cp = child_process_1.spawn(command, args, {
            ...opts
        });
        const chunks = [];
        if (cp.stdout) {
            cp.stdout.on('data', (buf) => chunks.push(buf));
        }
        cp.on('exit', code => {
            if (!code) {
                return resolve(Buffer.concat(chunks).toString('utf8'));
            }
            reject();
        });
    });
}
exports.sh = sh;
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
function npm(project, ...args) {
    return sh({
        stdio: 'inherit',
        cwd: project
    }, 'npm', ...args);
}
exports.npm = npm;
function npmSlience(project, ...args) {
    return sh({
        stdio: 'pipe',
        cwd: project
    }, 'npm', ...args);
}
exports.npmSlience = npmSlience;
