"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
const shell_1 = require("./shell");
const path_1 = require("path");
const GIT_SERVERS = ['gitee.com', 'github.com'];
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
