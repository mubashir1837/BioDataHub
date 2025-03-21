import * as vscode from "vscode"
import { CSVDataProvider } from "./providers/csvDataProvider"
import { CSVPreviewPanel } from "./panels/csvPreviewPanel"
import { DatasetSearchProvider } from "./providers/datasetSearchProvider"
import { MetadataProvider } from "./providers/metadataProvider"
import { VisualizationProvider } from "./providers/visualizationProvider"
import { showOnlineDatasetSearchInterface } from "./commands/searchDatasets"
import { downloadDataset } from "./commands/downloadDataset"

export function activate(context: vscode.ExtensionContext) {
  console.log("BioDataHub extension is now active")

  // Register data providers
  const csvDataProvider = new CSVDataProvider()
  const datasetSearchProvider = new DatasetSearchProvider()
  const metadataProvider = new MetadataProvider()
  const visualizationProvider = new VisualizationProvider(vscode.Uri.file(context.extensionPath))

  // Register commands
  const searchCommand = vscode.commands.registerCommand("biodatahub.searchDatasets", () => {
    datasetSearchProvider.showSearchInterface()
  })

  const searchOnlineCommand = vscode.commands.registerCommand("biodatahub.searchOnlineDatasets", () => {
    showOnlineDatasetSearchInterface()
  })

  const downloadDatasetCommand = vscode.commands.registerCommand("biodatahub.downloadDataset", (dataset) => {
    downloadDataset(dataset)
  })

  const previewCommand = vscode.commands.registerCommand("biodatahub.previewCSV", (uri: vscode.Uri) => {
    CSVPreviewPanel.createOrShow(vscode.Uri.file(context.extensionPath), uri)
  })

  const generateMetadataCommand = vscode.commands.registerCommand("biodatahub.generateMetadata", (uri: vscode.Uri) => {
    metadataProvider.generateAndShowMetadata(uri)
  })

  const visualizeDataCommand = vscode.commands.registerCommand("biodatahub.visualizeData", (uri: vscode.Uri) => {
    visualizationProvider.showVisualizationOptions(uri)
  })

  // Register CSV file content provider for preview
  const csvContentProvider = vscode.workspace.registerTextDocumentContentProvider("biodatahub-csv", csvDataProvider)

  // Register tree view for dataset search results
  const datasetTreeView = vscode.window.createTreeView("biodatahubDatasets", {
    treeDataProvider: datasetSearchProvider,
    showCollapseAll: true,
  })

  // Add all disposables to context
  context.subscriptions.push(
    searchCommand,
    searchOnlineCommand,
    downloadDatasetCommand,
    previewCommand,
    generateMetadataCommand,
    visualizeDataCommand,
    csvContentProvider,
    datasetTreeView,
  )
}

export function deactivate() {
  console.log("BioDataHub extension is now deactivated")
}

