"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetadataProvider = void 0;
const vscode = require("vscode");
const metadataGenerator_1 = require("../commands/metadataGenerator");
class MetadataProvider {
    async generateAndShowMetadata(uri) {
        try {
            const metadata = await (0, metadataGenerator_1.generateMetadata)(uri);
            this.showMetadataPanel(uri, metadata);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error generating metadata: ${error}`);
        }
    }
    showMetadataPanel(_uri, metadata) {
        const panel = vscode.window.createWebviewPanel("csvMetadata", `Metadata: ${metadata.fileName}`, vscode.ViewColumn.Beside, {
            enableScripts: true,
        });
        panel.webview.html = this.getMetadataHtml(metadata);
    }
    getMetadataHtml(metadata) {
        return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CSV Metadata</title>
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
          
          .metadata-section {
            margin-bottom: 20px;
          }
          
          .file-info {
            display: grid;
            grid-template-columns: 120px 1fr;
            gap: 10px;
          }
          
          .file-info div {
            padding: 5px 0;
          }
          
          table {
            border-collapse: collapse;
            width: 100%;
            margin-top: 10px;
          }
          
          th, td {
            border: 1px solid var(--vscode-panel-border);
            padding: 8px;
            text-align: left;
          }
          
          th {
            background-color: var(--vscode-editor-lineHighlightBackground);
          }
          
          .sample-data {
            max-height: 300px;
            overflow: auto;
          }
        </style>
      </head>
      <body>
        <h1>Dataset Summary</h1>
        
        <div class="metadata-section">
          <h2>File Information</h2>
          <div class="file-info">
            <div><strong>File Name:</strong></div>
            <div>${metadata.fileName}</div>
            
            <div><strong>File Path:</strong></div>
            <div>${metadata.filePath}</div>
            
            <div><strong>File Size:</strong></div>
            <div>${(0, metadataGenerator_1.formatFileSize)(metadata.fileSize)}</div>
            
            <div><strong>Modified Date:</strong></div>
            <div>${metadata.modifiedDate.toLocaleString()}</div>
            
            <div><strong>Row Count:</strong></div>
            <div>${metadata.rowCount.toLocaleString()}</div>
            
            <div><strong>Column Count:</strong></div>
            <div>${metadata.columns.length}</div>
          </div>
        </div>
        
        <div class="metadata-section">
          <h2>Column Information</h2>
          <table>
            <thead>
              <tr>
                <th>Column Name</th>
                <th>Data Type</th>
                <th>Unique Values</th>
                <th>Missing Values</th>
                <th>Min Value</th>
                <th>Max Value</th>
                <th>Mean Value</th>
              </tr>
            </thead>
            <tbody>
              ${metadata.columns
            .map((column) => `
                <tr>
                  <td>${column}</td>
                  <td>${metadata.dataTypes[column] || "Unknown"}</td>
                  <td>${metadata.uniqueValues[column] !== undefined ? metadata.uniqueValues[column] : "N/A"}</td>
                  <td>${metadata.missingValues[column] !== undefined ? metadata.missingValues[column] : "N/A"}</td>
                  <td>${metadata.minValues[column] !== undefined ? metadata.minValues[column] : "N/A"}</td>
                  <td>${metadata.maxValues[column] !== undefined ? metadata.maxValues[column] : "N/A"}</td>
                  <td>${metadata.meanValues[column] !== undefined ? metadata.meanValues[column]?.toFixed(2) : "N/A"}</td>
                </tr>
              `)
            .join("")}
            </tbody>
          </table>
        </div>
        
        <div class="metadata-section">
          <h2>Sample Data (First 5 Rows)</h2>
          <div class="sample-data">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  ${metadata.columns.map((column) => `<th>${column}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${Array.from({ length: 5 })
            .map((_, rowIndex) => `
                  <tr>
                    <td>${rowIndex + 1}</td>
                    ${metadata.columns
            .map((column) => `
                      <td>${metadata.sampleData[column] && metadata.sampleData[column][rowIndex] !== undefined
            ? metadata.sampleData[column][rowIndex]
            : ""}</td>
                    `)
            .join("")}
                  </tr>
                `)
            .join("")}
              </tbody>
            </table>
          </div>
        </div>
      </body>
      </html>
    `;
    }
}
exports.MetadataProvider = MetadataProvider;
//# sourceMappingURL=metadataProvider.js.map