"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
const shell_1 = require("./shell");
const path_1 = require("path");
const fs_1 = require("fs");
const GIT_SERVERS = ['gitee.com', 'github.com'];
const defaultPackageJSON = {
    "name": "@ichest/private-node-package",
    "version": "0.0.0",
    "description": "Internal private package",
    private: true
};
async function download(place, url) {
    const urlObj = url_1.parse(url);
    const { hostname = '', pathname = '' } = urlObj;
    if (GIT_SERVERS.includes(hostname)) {
        const path = pathname.slice(1); // remove leading /
        if (path.split('/').length === 2) {
            // repo
            const target = path_1.join(place, hostname, path);
            await shell_1.git('clone', '--depth', '1', `git@${hostname}:${path}.git`, target);
            return target;
        }
        // TODO: check if is gist
    }
    return '';
}
exports.download = download;
async function npmInstall(place, pack) {
    place = path_1.join(place, '_node_package');
    await tryInitNodePackage(place);
    await shell_1.npm(place, 'install', pack, '--save', '--production');
    const infoString = await shell_1.npmSlience(place, 'ls', pack, '--json', '--long');
    const info = JSON.parse(infoString);
    place = Object.values(info.dependencies)[0].path;
    return path_1.join(place);
}
exports.npmInstall = npmInstall;
async function npmUninstall(place, pack) {
    place = path_1.join(place, '_node_package');
    // TODO: check package is avaliable
    await shell_1.npm(place, 'uninstall', pack, '--save');
}
exports.npmUninstall = npmUninstall;
async function tryInitNodePackage(place) {
    fs_1.mkdirSync(place, { recursive: true });
    const files = fs_1.readdirSync(place);
    if (!files.includes('package.json')) {
        fs_1.writeFileSync(path_1.join(place, 'package.json'), JSON.stringify(defaultPackageJSON, null, 2));
    }
    else {
        return;
    }
}
exports.tryInitNodePackage = tryInitNodePackage;
