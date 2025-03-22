"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatasetSearchProvider = void 0;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs/promises");
class DatasetSearchProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.searchResults = [];
    }
    refresh() {
        this._onDidChangeTreeData.fire(undefined);
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        return Promise.resolve(element ? [] : this.searchResults);
    }
    async showSearchInterface() {
        const searchOption = await vscode.window.showQuickPick([
            { label: "Search Local Workspace", description: "Search for datasets in your workspace" },
            { label: "Search Online Repositories", description: "Search for datasets on Kaggle, Zenodo, etc." },
        ], { placeHolder: "Select search option" });
        if (!searchOption)
            return;
        if (searchOption.label === "Search Online Repositories") {
            vscode.commands.executeCommand("biodatahub.searchOnlineDatasets");
            return;
        }
        const searchTerm = await vscode.window.showInputBox({
            placeHolder: "Enter search terms (e.g., gene, protein, sequence)",
            prompt: "Search for bioinformatics datasets in workspace",
        });
        if (searchTerm) {
            await this.searchDatasets(searchTerm);
        }
    }
    async searchDatasets(searchTerm) {
        this.searchResults = [];
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showInformationMessage("No workspace folder is open.");
            return;
        }
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Searching for datasets matching "${searchTerm}"`,
            cancellable: true,
        }, async (progress, token) => {
            progress.report({ increment: 0 });
            for (const folder of workspaceFolders) {
                if (token.isCancellationRequested)
                    break;
                await this.searchInFolder(folder.uri.fsPath, searchTerm, progress);
            }
            progress.report({ increment: 100 });
            if (this.searchResults.length === 0) {
                vscode.window.showInformationMessage(`No datasets found matching "${searchTerm}".`);
            }
            else {
                vscode.window.showInformationMessage(`Found ${this.searchResults.length} datasets matching "${searchTerm}".`);
                this.refresh();
                vscode.commands.executeCommand("biodatahubDatasets.focus");
            }
        });
    }
    async searchInFolder(folderPath, searchTerm, progress) {
        try {
            const files = await fs.readdir(folderPath);
            for (const file of files) {
                const filePath = path.join(folderPath, file);
                const stats = await fs.stat(filePath);
                if (stats.isDirectory()) {
                    await this.searchInFolder(filePath, searchTerm, progress);
                }
                else if (stats.isFile() && this.isBioinformaticsFile(file)) {
                    try {
                        const fileContent = await fs.readFile(filePath, "utf8");
                        if (fileContent.toLowerCase().includes(searchTerm.toLowerCase())) {
                            this.searchResults.push(new DatasetItem(path.basename(file), vscode.TreeItemCollapsibleState.None, filePath, stats.size, stats.mtime, this.getFileType(file), {
                                command: "biodatahub.previewCSV",
                                title: "Preview CSV",
                                arguments: [vscode.Uri.file(filePath)],
                            }));
                        }
                    }
                    catch (error) {
                        console.error(`Error reading file ${filePath}:`, error);
                    }
                }
            }
        }
        catch (error) {
            console.error(`Error searching in folder ${folderPath}:`, error);
        }
    }
    isBioinformaticsFile(fileName) {
        const ext = path.extname(fileName).toLowerCase();
        return [".csv", ".tsv", ".fasta", ".fa", ".fastq", ".fq", ".gff", ".gff3", ".vcf", ".bed"].includes(ext);
    }
    getFileType(fileName) {
        const ext = path.extname(fileName).toLowerCase();
        switch (ext) {
            case ".csv":
                return "CSV";
            case ".tsv":
                return "TSV";
            case ".fasta":
            case ".fa":
                return "FASTA";
            case ".fastq":
            case ".fq":
                return "FASTQ";
            case ".gff":
            case ".gff3":
                return "GFF";
            case ".vcf":
                return "VCF";
            case ".bed":
                return "BED";
            default:
                return "Unknown";
        }
    }
}
exports.DatasetSearchProvider = DatasetSearchProvider;
class DatasetItem extends vscode.TreeItem {
    constructor(label, collapsibleState, filePath, fileSize, modifiedDate, fileType, command) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.filePath = filePath;
        this.fileSize = fileSize;
        this.modifiedDate = modifiedDate;
        this.fileType = fileType;
        this.command = command;
        this.tooltip = `${filePath}
Type: ${fileType}
Size: ${this.formatFileSize(fileSize)}
Modified: ${modifiedDate.toLocaleString()}`;
        this.description = `${fileType} - ${this.formatFileSize(fileSize)}`;
        this.iconPath = this.getIcon(fileType);
        this.contextValue = "dataset";
    }
    formatFileSize(bytes) {
        const units = ["B", "KB", "MB", "GB"];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }
    getIcon(fileType) {
        switch (fileType) {
            case "CSV":
            case "TSV":
                return new vscode.ThemeIcon("file");
            case "FASTA":
            case "FASTQ":
                return new vscode.ThemeIcon("database");
            case "GFF":
            case "VCF":
            case "BED":
                return new vscode.ThemeIcon("symbol-structure");
            default:
                return new vscode.ThemeIcon("file");
        }
    }
}
//# sourceMappingURL=datasetSearchProvider.js.map