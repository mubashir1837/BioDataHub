import * as assert from "assert";
import * as vscode from "vscode";
import { describe, it } from "mocha"; // 

describe("Extension Test Suite", () => {
    it("should activate extension", async () => {
        assert.ok(vscode.extensions, "vscode.extensions is undefined");

        const extension = vscode.extensions.getExtension("Mubashir-Ali.biodatahub");
        assert.ok(extension, "Extension not found");
    });
});
