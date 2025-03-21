"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const vscode = require("vscode");
const mocha_1 = require("mocha"); // 
(0, mocha_1.describe)("Extension Test Suite", () => {
    (0, mocha_1.it)("should activate extension", async () => {
        assert.ok(vscode.extensions, "vscode.extensions is undefined");
        const extension = vscode.extensions.getExtension("Mubashir-Ali.biodatahub");
        assert.ok(extension, "Extension not found");
    });
});
//# sourceMappingURL=extension.test.js.map