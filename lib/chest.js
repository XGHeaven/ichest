"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const fs_1 = require("fs");
const constants_1 = require("constants");
const exectable_1 = require("./resources/exectable");
const js_1 = require("./resources/js");
const download_1 = require("./core/download");
var CmdType;
(function (CmdType) {
    CmdType["GROUP"] = "group";
    CmdType["ENTRY"] = "entry";
})(CmdType = exports.CmdType || (exports.CmdType = {}));
const defaultConfig = {};
const defaultCache = {
    cmds: [],
    index: {}
};
class Chest {
    constructor(root) {
        this.root = root;
        this.cmds = new Map();
        this.configPath = path_1.join(root, 'config.json');
        this.cachePath = path_1.join(root, 'commands.json');
        this.downloadPath = path_1.join(root, 'remote');
        this.customPath = path_1.join(root, 'custom');
    }
    init() {
        fs_1.mkdirSync(this.root, { recursive: true });
        try {
            fs_1.writeFileSync(this.configPath, JSON.stringify(defaultConfig), {
                encoding: 'utf8',
                flag: 'wx'
            });
        }
        catch (e) { }
        try {
            fs_1.writeFileSync(this.cachePath, JSON.stringify(defaultCache), {
                encoding: 'utf8',
                flag: 'wx'
            });
        }
        catch (e) { }
        fs_1.mkdirSync(this.downloadPath, { recursive: true });
        fs_1.mkdirSync(this.customPath, { recursive: true });
        const config = {
            ...defaultConfig,
            ...JSON.parse(fs_1.readFileSync(this.configPath, 'utf8'))
        };
        const cache = {
            ...defaultCache,
            ...JSON.parse(fs_1.readFileSync(this.cachePath, 'utf8'))
        };
        this.config = config;
        this.cache = cache;
    }
    run(cmd, args) {
        let target = this.cache.index[cmd];
        if (target) {
            const resource = this.createResource(target);
            if (resource) {
                return resource.execute(args);
            }
            else {
                // delete index, and research new location
                delete this.cache.index[cmd];
                this.save();
            }
        }
        target = this.findTarget(cmd) || '';
        if (target) {
            const resource = this.createResource(target);
            if (resource) {
                this.cache.index[cmd] = target;
                this.save();
                return resource.execute(args);
            }
        }
        console.log(`Cannot found ${cmd}`);
    }
    async add(target, options = {}) {
        let source;
        if (target.startsWith('http://') || target.startsWith('https://')) {
            // remote scripts, download first
            source = target;
            target = await download_1.download(this.downloadPath, source);
            if (!target) {
                // cannot download
                return;
            }
        }
        if (!path_1.isAbsolute(target)) {
            target = path_1.resolve(process.cwd(), target);
        }
        this.cache.cmds.push({
            type: options.type || CmdType.ENTRY,
            path: target,
            alias: options.alias,
            source,
        });
        this.save();
    }
    list() { }
    createResource(target) {
        if (!fs_1.existsSync(target)) {
            return null;
        }
        const ext = path_1.extname(target);
        const stats = fs_1.statSync(target);
        if (stats.isDirectory()) {
            // TODO
        }
        else if (stats.isFile()) {
            if ((stats.mode & constants_1.X_OK) === constants_1.X_OK) {
                // executable
                return new exectable_1.ExecutableResource(target);
            }
            switch (ext) {
                case '.js':
                    return new js_1.JavaScriptResource(target);
                    break;
            }
        }
        return null;
    }
    findTarget(name) {
        // add custom group path to search
        const cmds = [{ type: CmdType.GROUP, path: this.customPath }, ...this.cache.cmds];
        for (const cmd of cmds) {
            if (cmd.type === CmdType.ENTRY && (cmd.alias === name || path_1.basename(cmd.path) === name)) {
                return cmd.path;
            }
            if (cmd.type === CmdType.GROUP) {
                const files = fs_1.readdirSync(cmd.path, { withFileTypes: true }).filter(f => f.isFile());
                for (const file of files) {
                    if (path_1.basename(file.name) === name) {
                        return path_1.join(cmd.path, file.name);
                    }
                }
            }
        }
    }
    save() {
        fs_1.writeFileSync(this.configPath, JSON.stringify(this.config), 'utf8');
        fs_1.writeFileSync(this.cachePath, JSON.stringify(this.cache), 'utf8');
    }
}
exports.Chest = Chest;
