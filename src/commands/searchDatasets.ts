import * as vscode from "vscode"

// Types for online datasets
interface OnlineDataset {
  id: string
  title: string
  description: string
  source: "Kaggle" | "Zenodo"
  url: string
  size: string
  datePublished: string
  tags: string[]
}

/**
 * Search for datasets on online repositories (Kaggle, Zenodo)
 */
export async function searchOnlineDatasets(query: string): Promise<OnlineDataset[]> {
  // Show progress notification
  return vscode.window.withProgress<OnlineDataset[]>(
    {
      location: vscode.ProgressLocation.Notification,
      title: `Searching online repositories for "${query}"`,
      cancellable: true,
    },
    async (progress, token) => {
      progress.report({ increment: 0 })

      try {
        // Search Kaggle datasets
        const kaggleResults = await searchKaggleDatasets(query, token)
        progress.report({ increment: 50, message: "Searching Zenodo..." })

        // Search Zenodo datasets
        const zenodoResults = await searchZenodoDatasets(query, token)
        progress.report({ increment: 50, message: "Completed" })

        // Combine results
        return [...kaggleResults, ...zenodoResults]
      } catch (error) {
        vscode.window.showErrorMessage(`Error searching online datasets: ${error}`)
        return []
      }
    },
  )
}

/**
 * Search for datasets on Kaggle
 * Note: This is a simplified implementation. In a real extension, you would use Kaggle API
 */
async function searchKaggleDatasets(query: string, token: vscode.CancellationToken): Promise<OnlineDataset[]> {
  // Simulate API call with delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  if (token.isCancellationRequested) {
    return []
  }

  // Mock data for demonstration
  return [
    {
      id: "kaggle-1",
      title: "Gene Expression Dataset",
      description: "Comprehensive gene expression data for cancer research",
      source: "Kaggle" as const, // Explicitly cast to the literal type
      url: "https://www.kaggle.com/datasets/crawford/gene-expression",
      size: "2.3 GB",
      datePublished: "2023-05-15",
      tags: ["gene", "expression", "cancer", "bioinformatics"],
    },
    {
      id: "kaggle-2",
      title: "Protein Structure Database",
      description: "Collection of protein structures with annotations",
      source: "Kaggle" as const, // Explicitly cast to the literal type
      url: "https://www.kaggle.com/datasets/shahir/protein-data-set",
      size: "1.5 GB",
      datePublished: "2023-03-22",
      tags: ["protein", "structure", "bioinformatics"],
    },
  ].filter((dataset) => {
    // Filter by query
    const searchText = `${dataset.title} ${dataset.description} ${dataset.tags.join(" ")}`.toLowerCase()
    return searchText.includes(query.toLowerCase())
  })
}

/**
 * Search for datasets on Zenodo
 */
async function searchZenodoDatasets(query: string, token: vscode.CancellationToken): Promise<OnlineDataset[]> {
  // Simulate API call with delay

  await new Promise((resolve) => setTimeout(resolve, 1500))

  if (token.isCancellationRequested) {
    return []
  }

  // Mock data for demonstration
  return [
    {
      id: "zenodo-1",
      title: "Genomic Sequencing Data",
      description: "Next-generation sequencing data for genomic analysis",
      source: "Zenodo" as const, // Explicitly cast to the literal type
      url: "https://zenodo.org/records/1040361",
      size: "5.7 GB",
      datePublished: "2023-06-10",
      tags: ["genomic", "sequencing", "bioinformatics", "NGS"],
    },
    {
      id: "zenodo-2",
      title: "Metabolomic Profiles",
      description: "Metabolomic profiles from mass spectrometry experiments",
      source: "Zenodo" as const, // Explicitly cast to the literal type
      url: "https://zenodo.org/records/4575489",
      size: "850 MB",
      datePublished: "2023-04-05",
      tags: ["metabolomics", "mass-spectrometry", "bioinformatics"],
    },
  ].filter((dataset) => {
    // Filter by query
    const searchText = `${dataset.title} ${dataset.description} ${dataset.tags.join(" ")}`.toLowerCase()
    return searchText.includes(query.toLowerCase())
  })
}

/**
 * Show online dataset search interface
 */
export async function showOnlineDatasetSearchInterface() {
  const query = await vscode.window.showInputBox({
    placeHolder: "Enter search terms (e.g., gene expression, protein structure)",
    prompt: "Search for bioinformatics datasets online",
  })

  if (!query) {
    return
  }

  const datasets = await searchOnlineDatasets(query)

  if (datasets.length === 0) {
    vscode.window.showInformationMessage(`No online datasets found matching "${query}".`)
    return
  }

  // Show results in quick pick
  const items = datasets.map((dataset) => ({
    label: dataset.title,
    description: `[${dataset.source}] ${dataset.size}`,
    detail: dataset.description,
    dataset,
  }))

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: `Found ${datasets.length} datasets matching "${query}"`,
    matchOnDescription: true,
    matchOnDetail: true,
  })

  if (selected) {
    // Show dataset details and options
    const action = await vscode.window.showQuickPick(
      [
        { label: "Download Dataset", id: "download" },
        { label: "View Dataset Details", id: "details" },
        { label: "Open in Browser", id: "browser" },
      ],
      { placeHolder: `Selected: ${selected.label}` },
    )

    if (action) {
      switch (action.id) {
        case "download":
          vscode.commands.executeCommand("biodatahub.downloadDataset", selected.dataset)
          break
        case "details":
          showDatasetDetails(selected.dataset)
          break
        case "browser":
          vscode.env.openExternal(vscode.Uri.parse(selected.dataset.url))
          break
      }
    }
  }
}

/**
 * Show dataset details in a webview panel
 */
function showDatasetDetails(dataset: OnlineDataset) {
  const panel = vscode.window.createWebviewPanel("datasetDetails", `Dataset: ${dataset.title}`, vscode.ViewColumn.One, {
    enableScripts: true,
  })

  panel.webview.html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Dataset Details</title>
      <style>
        body {
          font-family: var(--vscode-font-family);
          background-color: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
          padding: 20px;
        }
        
        h1, h2 {
          color: var(--vscode-editor-foreground);
        }
        
        .dataset-info {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 10px;
        }
        
        .dataset-info div {
          padding: 5px 0;
        }
        
        .tag {
          display: inline-block;
          background-color: var(--vscode-badge-background);
          color: var(--vscode-badge-foreground);
          padding: 3px 8px;
          border-radius: 3px;
          margin-right: 5px;
          margin-bottom: 5px;
        }
        
        .button {
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          padding: 8px 12px;
          cursor: pointer;
          margin-top: 20px;
        }
        
        .button:hover {
          background-color: var(--vscode-button-hoverBackground);
        }
      </style>
    </head>
    <body>
      <h1>${dataset.title}</h1>
      <p>${dataset.description}</p>
      
      <div class="dataset-info">
        <div><strong>Source:</strong></div>
        <div>${dataset.source}</div>
        
        <div><strong>Size:</strong></div>
        <div>${dataset.size}</div>
        
        <div><strong>Published:</strong></div>
        <div>${dataset.datePublished}</div>
        
        <div><strong>URL:</strong></div>
        <div><a href="${dataset.url}" target="_blank">${dataset.url}</a></div>
      </div>
      
      <h2>Tags</h2>
      <div>
        ${dataset.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
      </div>
      
      <button class="button" onclick="downloadDataset()">Download Dataset</button>
      
      <script>
        function downloadDataset() {
          const vscode = acquireVsCodeApi();
          vscode.postMessage({
            command: 'download',
            datasetId: '${dataset.id}'
          });
        }
      </script>
    </body>
    </html>
  `

  // Handle messages from the webview
  panel.webview.onDidReceiveMessage(
    (message) => {
      if (message.command === "download") {
        vscode.commands.executeCommand("biodatahub.downloadDataset", dataset)
      }
    },
    undefined,
    [],
  )
}

