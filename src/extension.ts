import * as vscode from "vscode";
import { CSVDataProvider } from "./providers/csvDataProvider";
import { CSVPreviewPanel } from "./panels/csvPreviewPanel";
import { DatasetSearchProvider } from "./providers/datasetSearchProvider";
import { MetadataProvider } from "./providers/metadataProvider";
import { VisualizationProvider } from "./providers/visualizationProvider";
import { showOnlineDatasetSearchInterface } from "./commands/searchDatasets";
import { downloadDataset } from "./commands/downloadDataset";

export function activate(context: vscode.ExtensionContext) {
  console.log("BioDataHub extension is now active");

  // Register data providers
  const csvDataProvider = new CSVDataProvider();
  const datasetSearchProvider = new DatasetSearchProvider();
  const metadataProvider = new MetadataProvider();
  const visualizationProvider = new VisualizationProvider(vscode.Uri.file(context.extensionPath));

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("biodatahub.searchDatasets", () => {
      datasetSearchProvider.showSearchInterface();
    }),
    vscode.commands.registerCommand("biodatahub.searchOnlineDatasets", () => {
      showOnlineDatasetSearchInterface();
    }),
    vscode.commands.registerCommand("biodatahub.downloadDataset", (dataset) => {
      downloadDataset(dataset);
    }),
    vscode.commands.registerCommand("biodatahub.previewCSV", (uri: vscode.Uri) => {
      CSVPreviewPanel.createOrShow(vscode.Uri.file(context.extensionPath), uri);
    }),
    vscode.commands.registerCommand("biodatahub.generateMetadata", (uri: vscode.Uri) => {
      metadataProvider.generateAndShowMetadata(uri);
    }),
    vscode.commands.registerCommand("biodatahub.visualizeData", (uri: vscode.Uri) => {
      visualizationProvider.showVisualizationOptions(uri);
    }),

    // Register CSV file content provider for preview
    vscode.workspace.registerTextDocumentContentProvider("biodatahub-csv", csvDataProvider),

    // Register tree view for dataset search results
    vscode.window.createTreeView("biodatahubDatasets", {
      treeDataProvider: datasetSearchProvider,
      showCollapseAll: true,
    })
  );
}

export function deactivate() {
  console.log("BioDataHub extension is now deactivated");
}
