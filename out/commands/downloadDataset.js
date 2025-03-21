"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadDataset = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
/**
 * Download a dataset from Kaggle or Zenodo
 */
async function downloadDataset(dataset) {
    // Ask user for download location
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage("No workspace folder is open. Please open a folder first.");
        return;
    }
    // Create a datasets directory if it doesn't exist
    const datasetsDir = path.join(workspaceFolders[0].uri.fsPath, "datasets");
    if (!fs.existsSync(datasetsDir)) {
        fs.mkdirSync(datasetsDir);
    }
    // Create a directory for this dataset
    const datasetName = dataset.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const datasetDir = path.join(datasetsDir, datasetName);
    if (!fs.existsSync(datasetDir)) {
        fs.mkdirSync(datasetDir);
    }
    // Show progress notification
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Downloading ${dataset.title}`,
        cancellable: true,
    }, async (progress, token) => {
        progress.report({ increment: 0 });
        try {
            // Different download logic based on source
            if (dataset.source === "Kaggle") {
                await downloadKaggleDataset(dataset, datasetDir, progress, token);
            }
            else if (dataset.source === "Zenodo") {
                await downloadZenodoDataset(dataset, datasetDir, progress, token);
            }
            // Create metadata file
            const metadataPath = path.join(datasetDir, "metadata.json");
            fs.writeFileSync(metadataPath, JSON.stringify(dataset, null, 2));
            vscode.window
                .showInformationMessage(`Dataset "${dataset.title}" downloaded successfully to ${datasetDir}`, "Open Folder")
                .then((selection) => {
                if (selection === "Open Folder") {
                    vscode.commands.executeCommand("revealFileInOS", vscode.Uri.file(datasetDir));
                }
            });
        }
        catch (error) {
            if (error instanceof Error && error.message === "Cancelled") {
                vscode.window.showInformationMessage(`Download of "${dataset.title}" was cancelled.`);
            }
            else {
                vscode.window.showErrorMessage(`Error downloading dataset: ${error}`);
            }
        }
    });
}
exports.downloadDataset = downloadDataset;
/**
 * Download a dataset from Kaggle
 * Note: This is a simplified implementation. In a real extension, you would use Kaggle API
 */
async function downloadKaggleDataset(dataset, targetDir, progress, token) {
    // Mock implementation (same as original)
    const csvPath = path.join(targetDir, "data.csv");
    const csvContent = `id,gene,expression_level,condition
1,BRCA1,0.85,control
2,BRCA2,0.92,control
3,TP53,0.78,control
4,BRCA1,1.24,treatment
5,BRCA2,1.36,treatment
6,TP53,0.95,treatment
`;
    for (let i = 0; i <= 10; i++) {
        if (token.isCancellationRequested) {
            throw new Error("Cancelled");
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
        progress.report({ increment: 10, message: `Downloading... ${i * 10}%` });
    }
    fs.writeFileSync(csvPath, csvContent);
    const readmePath = path.join(targetDir, "README.md");
    const readmeContent = `# ${dataset.title}

${dataset.description}

## Source
Downloaded from Kaggle: ${dataset.url}

## Date Published
${dataset.datePublished}

## Tags
${dataset.tags.join(", ")}
`;
    fs.writeFileSync(readmePath, readmeContent);
}
/**
 * Download a dataset from Zenodo
 */
async function downloadZenodoDataset(dataset, targetDir, progress, token) {
    // Mock implementation (same as original)
    const csvPath = path.join(targetDir, "data.csv");
    const csvContent = `sample_id,metabolite,concentration,condition
1,Glucose,5.2,fasting
2,Lactate,1.8,fasting
3,Pyruvate,0.12,fasting
4,Glucose,7.8,fed
5,Lactate,2.3,fed
6,Pyruvate,0.25,fed
`;
    for (let i = 0; i <= 10; i++) {
        if (token.isCancellationRequested) {
            throw new Error("Cancelled");
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
        progress.report({ increment: 10, message: `Downloading... ${i * 10}%` });
    }
    fs.writeFileSync(csvPath, csvContent);
    const readmePath = path.join(targetDir, "README.md");
    const readmeContent = `# ${dataset.title}

${dataset.description}

## Source
Downloaded from Zenodo: ${dataset.url}

## Date Published
${dataset.datePublished}

## Tags
${dataset.tags.join(", ")}
`;
    fs.writeFileSync(readmePath, readmeContent);
}
// Removed unused downloadFile function
//# sourceMappingURL=downloadDataset.js.map