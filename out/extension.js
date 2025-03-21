"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const csvDataProvider_1 = require("./providers/csvDataProvider");
const csvPreviewPanel_1 = require("./panels/csvPreviewPanel");
const datasetSearchProvider_1 = require("./providers/datasetSearchProvider");
const metadataProvider_1 = require("./providers/metadataProvider");
const visualizationProvider_1 = require("./providers/visualizationProvider");
const searchDatasets_1 = require("./commands/searchDatasets");
const downloadDataset_1 = require("./commands/downloadDataset");
function activate(context) {
    console.log("BioDataHub extension is now active");
    // Register data providers
    const csvDataProvider = new csvDataProvider_1.CSVDataProvider();
    const datasetSearchProvider = new datasetSearchProvider_1.DatasetSearchProvider();
    const metadataProvider = new metadataProvider_1.MetadataProvider();
    const visualizationProvider = new visualizationProvider_1.VisualizationProvider(vscode.Uri.file(context.extensionPath));
    // Register commands
    const searchCommand = vscode.commands.registerCommand("biodatahub.searchDatasets", () => {
        datasetSearchProvider.showSearchInterface();
    });
    const searchOnlineCommand = vscode.commands.registerCommand("biodatahub.searchOnlineDatasets", () => {
        (0, searchDatasets_1.showOnlineDatasetSearchInterface)();
    });
    const downloadDatasetCommand = vscode.commands.registerCommand("biodatahub.downloadDataset", (dataset) => {
        (0, downloadDataset_1.downloadDataset)(dataset);
    });
    const previewCommand = vscode.commands.registerCommand("biodatahub.previewCSV", (uri) => {
        csvPreviewPanel_1.CSVPreviewPanel.createOrShow(vscode.Uri.file(context.extensionPath), uri);
    });
    const generateMetadataCommand = vscode.commands.registerCommand("biodatahub.generateMetadata", (uri) => {
        metadataProvider.generateAndShowMetadata(uri);
    });
    const visualizeDataCommand = vscode.commands.registerCommand("biodatahub.visualizeData", (uri) => {
        visualizationProvider.showVisualizationOptions(uri);
    });
    // Register CSV file content provider for preview
    const csvContentProvider = vscode.workspace.registerTextDocumentContentProvider("biodatahub-csv", csvDataProvider);
    // Register tree view for dataset search results
    const datasetTreeView = vscode.window.createTreeView("biodatahubDatasets", {
        treeDataProvider: datasetSearchProvider,
        showCollapseAll: true,
    });
    // Add all disposables to context
    context.subscriptions.push(searchCommand, searchOnlineCommand, downloadDatasetCommand, previewCommand, generateMetadataCommand, visualizeDataCommand, csvContentProvider, datasetTreeView);
}
exports.activate = activate;
function deactivate() {
    console.log("BioDataHub extension is now deactivated");
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map