"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const resource_1 = require("../resource");
const child_process_1 = require("child_process");
class ExecutableResource extends resource_1.Resource {
    constructor(target) {
        super(target);
    }
    execute(args) {
        child_process_1.spawn(this.target, args, {
            stdio: 'inherit'
        });
    }
}
exports.ExecutableResource = ExecutableResource;
