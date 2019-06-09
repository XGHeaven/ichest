"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const resource_1 = require("../resource");
const child_process_1 = require("child_process");
class JavaScriptResource extends resource_1.Resource {
    execute(args) {
        child_process_1.spawn('node', [this.target, ...args], { stdio: 'inherit' });
    }
}
exports.JavaScriptResource = JavaScriptResource;
