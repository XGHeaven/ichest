"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const fs_1 = require("fs");
const constants_1 = require("constants");
const exectable_1 = require("./resources/exectable");
const js_1 = require("./resources/js");
const download_1 = require("./core/download");
const rimraf_1 = __importDefault(require("rimraf"));
const logger_1 = require("./core/logger");
const url_1 = require("url");
var CmdType;
(function (CmdType) {
    CmdType["GROUP"] = "group";
    CmdType["ENTRY"] = "entry";
    CmdType["NPM"] = "npm";
    CmdType["ALIAS"] = "alias";
})(CmdType = exports.CmdType || (exports.CmdType = {}));
const defaultConfig = {};
const defaultStore = {
    cmds: [],
    index: {}
};
class Chest {
    constructor(root) {
        this.root = root;
        this.configPath = path_1.join(root, 'config.json');
        this.storePath = path_1.join(root, 'commands.json');
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
            fs_1.writeFileSync(this.storePath, JSON.stringify(defaultStore), {
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
            ...defaultStore,
            ...JSON.parse(fs_1.readFileSync(this.storePath, 'utf8'))
        };
        process.env.ICHEST_CONFIG = JSON.stringify(config);
        process.env.ICHEST_CONFIG_FILE = this.configPath;
        this.config = config;
        this.store = cache;
    }
    run(cmd, args) {
        if (cmd.startsWith('global/')) {
            // remove global prefix
            cmd = cmd.slice(7);
        }
        let target = this.store.index[cmd];
        if (target) {
            const resource = this.createResource(target);
            if (resource) {
                return resource.execute(args);
            }
            else {
                // delete index, and research new location
                delete this.store.index[cmd];
                this.save();
            }
        }
        target = this.findTarget(cmd) || '';
        if (target) {
            const resource = this.createResource(target);
            if (resource) {
                this.store.index[cmd] = target;
                this.save();
                return resource.execute(args);
            }
        }
        logger_1.log(`Cannot found ${cmd}`);
    }
    async add(target, options = {}) {
        const urlInfo = url_1.parse(target);
        const command = {
            ...options
        };
        let source;
        let type;
        let name;
        if (urlInfo.protocol === 'http:' || urlInfo.protocol === 'https:') {
            // remote scripts, download first
            source = target;
            target = await download_1.download(this.downloadPath, source);
            if (!target) {
                // cannot download
                return;
            }
            const [repo] = target.split(path_1.sep).reverse();
            name = options.name || repo;
            type = options.type || CmdType.GROUP;
        }
        else if (urlInfo.protocol === 'npm:') {
            // npm scripts, use `npm install` to install it
            source = target;
            const packagePath = source.replace('npm://', '');
            if (!packagePath) {
                return;
            }
            const packageName = packagePath.startsWith('@') ? packagePath.split('@').slice(0, 2).join('@') : packagePath.split('@')[0];
            target = await download_1.npmInstall(this.downloadPath, packagePath);
            type = CmdType.NPM;
            name = options.name || packageName;
        }
        else if (!urlInfo.protocol) {
            // local file
            if (!path_1.isAbsolute(target)) {
                target = path_1.resolve(process.cwd(), target);
            }
            const stat = await fs_1.promises.stat(target);
            type = options.type || (stat.isDirectory() ? CmdType.GROUP : CmdType.ENTRY);
            name = options.name || CmdType.NPM ? require(path_1.join(target, 'package.json')).name : path_1.basename(target, path_1.extname(target));
        }
        else {
            // unknow type
            return;
        }
        const aliases = this.store.cmds.map(cmd => cmd.name);
        if (aliases.includes(name)) {
            let i = 1;
            while (!aliases.includes(`${name}-${i}`)) {
                i++;
            }
            // change name if conflict
            name = `${name}-${i}`;
        }
        command.path = target;
        command.source = source;
        command.name = name;
        command.type = type;
        logger_1.log('Added success with', command.name);
        this.store.cmds.push(command);
        this.save();
    }
    async remove(name) {
        const cmd = this.store.cmds.find(cmd => cmd.name === name);
        if (!cmd) {
            console.log('Cannot found cmd');
            return;
        }
        switch (cmd.type) {
            case CmdType.ALIAS:
                // delete cache
                delete this.store.index[cmd.name];
                break;
            case CmdType.NPM:
                await download_1.npmUninstall(this.downloadPath, cmd.source.replace('npm://', ''));
                break;
            default:
                if (cmd.source) {
                    if (cmd.source.startsWith('http://') || cmd.source.startsWith('https://')) {
                        await rimraf_1.default.__promisify__(cmd.path);
                    }
                }
        }
        this.store.cmds = this.store.cmds.filter(c => c !== cmd);
        this.save();
    }
    list() {
        return this.store.cmds;
    }
    getConfig(key) {
        const keys = key.split('.');
        let obj = this.config;
        for (const key of keys) {
            if (obj[key]) {
                obj = obj[key];
            }
        }
        return obj;
    }
    setConfig(key, value) {
        const keys = key.split('.');
        let obj = this.config;
        for (const key of keys.slice(0, -1)) {
            if (typeof obj[key] !== 'object') {
                obj[key] = {};
            }
            obj = obj[key];
        }
        const lastKey = keys[keys.length - 1];
        obj[lastKey] = value;
        this.bindEnv();
        this.save();
    }
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
        const pieces = name.split('/');
        const allCmds = [
            { type: CmdType.GROUP, name: 'custom', path: this.customPath },
            // {type: CmdType.GROUP, path: join(this.downloadPath, '_node_package', 'node_modules', '.bin')},
            ...this.store.cmds
        ];
        if (pieces[0] === 'node') {
            // search node bins command
            const [_, ...names] = pieces;
            name = names.join('/');
            const cmds = allCmds.filter(cmd => cmd.type === CmdType.NPM);
            for (const cmd of cmds) {
                try {
                    const pack = require(path_1.join(cmd.path, 'package.json'));
                    const bin = pack.bin || {};
                    if (name in bin) {
                        return path_1.resolve(cmd.path, bin[name]);
                    }
                }
                catch (e) { }
            }
        }
        // cannot found command, so full search
        for (const cmd of allCmds) {
            if (cmd.type === CmdType.NPM) {
                const joinName = path_1.join(cmd.group || '', cmd.name);
                if (joinName === name) {
                    try {
                        const pack = require(path_1.join(cmd.path, 'package.json'));
                        if (pack.main) {
                            return path_1.resolve(cmd.path, pack.main);
                        }
                    }
                    catch (e) { }
                }
            }
            else if (cmd.type === CmdType.ENTRY) {
                const joinName = path_1.join(cmd.group || '', cmd.name);
                if (joinName === name) {
                    return cmd.path;
                }
            }
            else if (cmd.type === CmdType.GROUP) {
                try {
                    const files = fs_1.readdirSync(cmd.path, { withFileTypes: true }).filter(f => f.isFile() || f.isSymbolicLink());
                    for (const file of files) {
                        if (path_1.basename(file.name) === name) {
                            return path_1.join(cmd.path, file.name);
                        }
                    }
                }
                catch (e) {
                    console.warn('not found', cmd.path);
                    continue;
                }
            }
        }
    }
    bindEnv() {
        process.env.ICHEST_CONFIG = JSON.stringify(this.config);
        process.env.ICHEST_CONFIG_FILE = this.configPath;
    }
    save() {
        fs_1.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
        fs_1.writeFileSync(this.storePath, JSON.stringify(this.store, null, 2), 'utf8');
    }
}
exports.Chest = Chest;
