import * as vscode from "vscode"
import * as fs from "fs"
import * as csv from "csv-parser"


// Define interfaces for CSV data
interface CSVRow {
  [key: string]: string | number | boolean | null
}

export class CSVDataProvider implements vscode.TextDocumentContentProvider {
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>()
  onDidChange = this._onDidChange.event

  // Cache for parsed CSV data
  private dataCache = new Map<string, CSVRow[]>()

  provideTextDocumentContent(uri: vscode.Uri): string {
    // This method is called when VS Code needs the content for the virtual document
    // We'll return HTML that will be rendered in the webview
    const originalUri = vscode.Uri.parse(uri.query)
    return this.generatePreviewHtml(originalUri)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private generatePreviewHtml(_uri: vscode.Uri): string {
    // The underscore prefix indicates this parameter is intentionally unused
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CSV Preview</title>
        <style>
          body { font-family: var(--vscode-font-family); background-color: var(--vscode-editor-background); color: var(--vscode-editor-foreground); }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid var(--vscode-panel-border); padding: 8px; text-align: left; }
          th { background-color: var(--vscode-editor-lineHighlightBackground); }
          .loading { text-align: center; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="loading">Loading CSV data...</div>
        <script>
          // Script to load and display CSV data
          window.addEventListener('message', event => {
            const message = event.data;
            if (message.type === 'csvData') {
              document.querySelector('.loading').style.display = 'none';
              displayCSVData(message.data, message.columns);
            }
          });

          function displayCSVData(data, columns) {
            const table = document.createElement('table');
            
            // Create header row
            const headerRow = document.createElement('tr');
            columns.forEach(column => {
              const th = document.createElement('th');
              th.textContent = column;
              headerRow.appendChild(th);
            });
            table.appendChild(headerRow);
            
            // Create data rows
            data.forEach(row => {
              const tr = document.createElement('tr');
              columns.forEach(column => {
                const td = document.createElement('td');
                td.textContent = row[column] || '';
                tr.appendChild(td);
              });
              table.appendChild(tr);
            });
            
            document.body.appendChild(table);
          }
        </script>
      </body>
      </html>
    `
  }

  async parseCSVFile(uri: vscode.Uri): Promise<CSVRow[]> {
    const filePath = uri.fsPath
    const cacheKey = filePath

    // Check if we have cached data
    if (this.dataCache.has(cacheKey)) {
      return this.dataCache.get(cacheKey)!
    }

    return new Promise<CSVRow[]>((resolve, reject) => {
      const results: CSVRow[] = []

      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (data: CSVRow) => results.push(data))
        .on("end", () => {
          this.dataCache.set(cacheKey, results)
          resolve(results)
        })
        .on("error", (error: Error) => {
          reject(error)
        })
    })
  }

  getColumnNames(data: CSVRow[]): string[] {
    if (data.length === 0) {
      return []
    }
    return Object.keys(data[0])
  }

  filterData(data: CSVRow[], filterCriteria: { column: string; value: string }[]): CSVRow[] {
    return data.filter((row) => {
      return filterCriteria.every((criteria) => {
        const value = row[criteria.column]
        return value && value.toString().toLowerCase().includes(criteria.value.toLowerCase())
      })
    })
  }

  sortData(data: CSVRow[], sortColumn: string, ascending = true): CSVRow[] {
    return [...data].sort((a, b) => {
      const valueA = a[sortColumn]
      const valueB = b[sortColumn]

      // Try to determine if the values are numeric
      const numA = Number(valueA)
      const numB = Number(valueB)

      if (!isNaN(numA) && !isNaN(numB)) {
        return ascending ? numA - numB : numB - numA
      }

      // Fall back to string comparison
      const strA = String(valueA).toLowerCase()
      const strB = String(valueB).toLowerCase()

      if (strA < strB) {
        return ascending ? -1 : 1
      }
      if (strA > strB) {
        return ascending ? 1 : -1
      }
      return 0
    })
  }
}

