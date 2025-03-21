import * as vscode from "vscode"
import * as path from "path"
import { CSVDataProvider } from "../providers/csvDataProvider"
import * as fsModule from "fs" // Changed from require to import

export class CSVPreviewPanel {
  public static currentPanel: CSVPreviewPanel | undefined
  private readonly _panel: vscode.WebviewPanel
  private readonly _extensionUri: vscode.Uri
  private readonly _csvUri: vscode.Uri
  private _disposables: vscode.Disposable[] = []
  private _csvDataProvider: CSVDataProvider

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, csvUri: vscode.Uri) {
    this._panel = panel
    this._extensionUri = extensionUri
    this._csvUri = csvUri
    this._csvDataProvider = new CSVDataProvider()

    // Set the webview's initial html content
    this._update()

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programmatically
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables)

    // Update the content based on view changes
    this._panel.onDidChangeViewState(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (_e) => {
        if (this._panel.visible) {
          this._update()
        }
      },
      null,
      this._disposables,
    )

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case "filter":
            this._filterData(message.criteria)
            return
          case "sort":
            this._sortData(message.column, message.ascending)
            return
          case "export":
            this._exportData(message.format)
            return
          case "visualize":
            this._visualizeData(message.type)
            return
        }
      },
      null,
      this._disposables,
    )
  }

  public static createOrShow(extensionUri: vscode.Uri, csvUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined

    // If we already have a panel, show it
    if (CSVPreviewPanel.currentPanel) {
      CSVPreviewPanel.currentPanel._panel.reveal(column)
      return
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      "csvPreview",
      `Preview: ${csvUri.path.split("/").pop()}`,
      column || vscode.ViewColumn.One,
      {
        // Enable JavaScript in the webview
        enableScripts: true,
        // Restrict the webview to only load resources from the extension's directory
        localResourceRoots: [extensionUri],
        // Enable retaining the webview content when it becomes hidden
        retainContextWhenHidden: true,
      },
    )

    CSVPreviewPanel.currentPanel = new CSVPreviewPanel(panel, extensionUri, csvUri)
  }

  private async _update() {
    const webview = this._panel.webview
    this._panel.title = `Preview: ${this._csvUri.path.split("/").pop()}`

    // Get paths to the webview files
    const htmlPath = vscode.Uri.file(path.join(this._extensionUri.fsPath, "webviews", "index.html"))
    const cssPath = vscode.Uri.file(path.join(this._extensionUri.fsPath, "webviews", "styles.css"))

    // Convert to webview URIs
    const cssUri = webview.asWebviewUri(cssPath)
    // htmlUri is used in the try block below
    // const htmlUri = webview.asWebviewUri(htmlPath)

    // Read the HTML file
    let htmlContent = ""
    try {
      htmlContent = fsModule.readFileSync(htmlPath.fsPath, "utf8")

      // Replace the style URI placeholder
      htmlContent = htmlContent.replace("{{styleUri}}", cssUri.toString())
    } catch (err) {
      // If we can't read the HTML file, fall back to the inline HTML
      console.error(`Error reading HTML file: ${err instanceof Error ? err.message : String(err)}`)
      htmlContent = this._getHtmlForWebview()
    }

    // Set the HTML content
    webview.html = htmlContent

    try {
      // Parse the CSV file
      const data = await this._csvDataProvider.parseCSVFile(this._csvUri)
      const columns = this._csvDataProvider.getColumnNames(data)

      // Send the data to the webview
      webview.postMessage({
        type: "csvData",
        data: data.slice(0, 1000), // Limit to first 1000 rows for performance
        columns,
      })
    } catch (err) {
      vscode.window.showErrorMessage(`Error parsing CSV file: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  private async _filterData(criteria: { column: string; value: string }[]) {
    try {
      const data = await this._csvDataProvider.parseCSVFile(this._csvUri)
      const filteredData = this._csvDataProvider.filterData(data, criteria)
      const columns = this._csvDataProvider.getColumnNames(data)

      this._panel.webview.postMessage({
        type: "csvData",
        data: filteredData.slice(0, 1000),
        columns,
      })
    } catch (err) {
      vscode.window.showErrorMessage(`Error filtering data: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  private async _sortData(column: string, ascending: boolean) {
    try {
      const data = await this._csvDataProvider.parseCSVFile(this._csvUri)
      const sortedData = this._csvDataProvider.sortData(data, column, ascending)
      const columns = this._csvDataProvider.getColumnNames(data)

      this._panel.webview.postMessage({
        type: "csvData",
        data: sortedData.slice(0, 1000),
        columns,
      })
    } catch (err) {
      vscode.window.showErrorMessage(`Error sorting data: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  private async _exportData(format: string) {
    try {
      vscode.window.showInformationMessage(`Exporting data as ${format}...`)
      // Delegate to the appropriate command
      vscode.commands.executeCommand("biodatahub.exportData", this._csvUri, format)
    } catch (err) {
      vscode.window.showErrorMessage(`Error exporting data: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  private async _visualizeData(type: string) {
    try {
      vscode.window.showInformationMessage(`Visualizing data as ${type} chart...`)
      // Delegate to the visualization provider
      vscode.commands.executeCommand("biodatahub.visualizeData", this._csvUri, type)
    } catch (err) {
      vscode.window.showErrorMessage(`Error visualizing data: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Fallback HTML if we can't read the webview files
  private _getHtmlForWebview(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CSV Preview</title>
        <style>
          body {
            font-family: var(--vscode-font-family);
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 0;
            margin: 0;
          }
          
          .container {
            display: flex;
            flex-direction: column;
            height: 100vh;
          }
          
          .toolbar {
            padding: 10px;
            background-color: var(--vscode-editor-lineHighlightBackground);
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }
          
          .filter-container {
            display: flex;
            gap: 5px;
            align-items: center;
          }
          
          select, input, button {
            background-color: var(--vscode-input-background);
            color  input, button {
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 4px 8px;
            border-radius: 2px;
          }
          
          button {
            cursor: pointer;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
          }
          
          button:hover {
            background-color: var(--vscode-button-hoverBackground);
          }
          
          .data-container {
            flex: 1;
            overflow: auto;
            padding: 10px;
          }
          
          table {
            border-collapse: collapse;
            width: 100%;
          }
          
          th, td {
            border: 1px solid var(--vscode-panel-border);
            padding: 8px;
            text-align: left;
          }
          
          th {
            background-color: var(--vscode-editor-lineHighlightBackground);
            position: sticky;
            top: 0;
            cursor: pointer;
          }
          
          th:hover {
            background-color: var(--vscode-list-hoverBackground);
          }
          
          .loading {
            text-align: center;
            padding: 20px;
          }
          
          .sort-indicator {
            margin-left: 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="toolbar">
            <div class="filter-container">
              <select id="filterColumn">
                <option value="">Select column</option>
              </select>
              <input type="text" id="filterValue" placeholder="Filter value">
              <button id="applyFilter">Apply Filter</button>
              <button id="clearFilter">Clear Filters</button>
            </div>
          </div>
          <div class="data-container">
            <div class="loading">Loading CSV data...</div>
            <table id="dataTable" style="display: none;">
              <thead>
                <tr id="headerRow"></tr>
              </thead>
              <tbody id="tableBody"></tbody>
            </table>
          </div>
        </div>
        
        <script>
          const vscode = acquireVsCodeApi();
          let allColumns = [];
          let currentSortColumn = '';
          let currentSortAscending = true;
          let activeFilters = [];
          
          // Handle messages from the extension
          window.addEventListener('message', event => {
            const message = event.data;
            if (message.type === 'csvData') {
              document.querySelector('.loading').style.display = 'none';
              document.getElementById('dataTable').style.display = 'table';
              displayCSVData(message.data, message.columns);
              populateFilterDropdown(message.columns);
              allColumns = message.columns;
            }
          });
          
          function displayCSVData(data, columns) {
            const headerRow = document.getElementById('headerRow');
            const tableBody = document.getElementById('tableBody');
            
            // Clear existing content
            headerRow.innerHTML = '';
            tableBody.innerHTML = '';
            
            // Create header row
            columns.forEach(column => {
              const th = document.createElement('th');
              th.textContent = column;
              th.addEventListener('click', () => sortTable(column));
              
              // Add sort indicator if this is the current sort column
              if (column === currentSortColumn) {
                const indicator = document.createElement('span');
                indicator.className = 'sort-indicator';
                indicator.textContent = currentSortAscending ? ' ↑' : ' ↓';
                th.appendChild(indicator);
              }
              
              headerRow.appendChild(th);
            });
            
            // Create data rows
            data.forEach(row => {
              const tr = document.createElement('tr');
              columns.forEach(column => {
                const td = document.createElement('td');
                td.textContent = row[column] || '';
                tr.appendChild(td);
              });
              tableBody.appendChild(tr);
            });
          }
          
          function populateFilterDropdown(columns) {
            const filterColumn = document.getElementById('filterColumn');
            
            // Clear existing options except the first one
            while (filterColumn.options.length > 1) {
              filterColumn.remove(1);
            }
            
            // Add column options
            columns.forEach(column => {
              const option = document.createElement('option');
              option.value = column;
              option.textContent = column;
              filterColumn.appendChild(option);
            });
          }
          
          function sortTable(column) {
            if (column === currentSortColumn) {
              // Toggle sort direction
              currentSortAscending = !currentSortAscending;
            } else {
              currentSortColumn = column;
              currentSortAscending = true;
            }
            
            vscode.postMessage({
              command: 'sort',
              column: column,
              ascending: currentSortAscending
            });
          }
          
          // Set up event listeners
          document.getElementById('applyFilter').addEventListener('click', () => {
            const column = document.getElementById('filterColumn').value;
            const value = document.getElementById('filterValue').value;
            
            if (column && value) {
              // Add to active filters
              activeFilters.push({ column, value });
              
              vscode.postMessage({
                command: 'filter',
                criteria: activeFilters
              });
            }
          });
          
          document.getElementById('clearFilter').addEventListener('click', () => {
            activeFilters = [];
            document.getElementById('filterColumn').selectedIndex = 0;
            document.getElementById('filterValue').value = '';
            
            vscode.postMessage({
              command: 'filter',
              criteria: []
            });
          });
        </script>
      </body>
      </html>
    `
  }

  public dispose() {
    CSVPreviewPanel.currentPanel = undefined

    // Clean up our resources
    this._panel.dispose()

    while (this._disposables.length) {
      const x = this._disposables.pop()
      if (x) {
        x.dispose()
      }
    }
  }
}

