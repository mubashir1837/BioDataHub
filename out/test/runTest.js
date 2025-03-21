"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const cp = require("child_process");
async function run() {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');
        const extensionTestsPath = path.resolve(__dirname, './suite');
        const result = cp.spawnSync('vscode-test', [
            '--extensionDevelopmentPath=' + extensionDevelopmentPath,
            '--extensionTestsPath=' + extensionTestsPath,
            '--xvfb'
        ], {
            stdio: 'inherit',
            shell: true
        });
        process.exit(result.status || 0);
    }
    catch {
        console.error('Failed to run tests');
        process.exit(1);
    }
}
run();
//# sourceMappingURL=runTest.js.map