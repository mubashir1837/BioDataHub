import * as vscode from "vscode"
import { VCFDataProvider, VCFRow, ParseResult } from "../providers/vcfDataProvider"

export class VCFPreviewPanel {
  public static currentPanel: VCFPreviewPanel | undefined
  private readonly _panel: vscode.WebviewPanel
  private readonly _extensionUri: vscode.Uri
  private readonly _fileUri: vscode.Uri
  private _disposables: vscode.Disposable[] = []
  private _provider: VCFDataProvider
  private _parseResult: ParseResult | undefined

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    fileUri: vscode.Uri
  ) {
    this._panel = panel
    this._extensionUri = extensionUri
    this._fileUri = fileUri
    this._provider = new VCFDataProvider()

    this._update()

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables)

    this._panel.onDidChangeViewState(
      (_e) => {
        if (this._panel.visible) {
          this._update()
        }
      },
      null,
      this._disposables
    )

    this._panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case "filter":
            this._filterData(message.column, message.value)
            return
          case "sort":
            this._sortData(message.column, message.ascending)
            return
        }
      },
      null,
      this._disposables
    )
  }

  public static createOrShow(
    extensionUri: vscode.Uri,
    fileUri: vscode.Uri
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined

    if (VCFPreviewPanel.currentPanel) {
      VCFPreviewPanel.currentPanel._panel.reveal(column)
      return
    }

    const panel = vscode.window.createWebviewPanel(
      "vcfPreview",
      `VCF: ${fileUri.path.split("/").pop()}`,
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri],
        retainContextWhenHidden: true,
      }
    )

    VCFPreviewPanel.currentPanel = new VCFPreviewPanel(
      panel,
      extensionUri,
      fileUri
    )
  }

  private async _update() {
    this._panel.webview.html = this._getLoadingHtml()

    try {
      const result = await this._provider.parseFile(this._fileUri)
      this._parseResult = result
      this._panel.webview.html = this._getWebviewHtml()

      // Send data to webview
      this._panel.webview.postMessage({
        type: "vcfData",
        rows: result.rows.slice(0, 1000),
        columns: result.columns,
        formatName: result.formatName,
        tier: result.tier,
        warnings: result.warnings,
        metaInfo: result.metaInfo,
        totalRows: result.rows.length,
      })
    } catch (err) {
      vscode.window.showErrorMessage(
        `Error parsing file: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  private async _filterData(column: string, value: string) {
    if (!this._parseResult) return

    const filtered = this._provider.filterRows(
      this._parseResult.rows,
      column,
      value
    )

    this._panel.webview.postMessage({
      type: "vcfData",
      rows: filtered.slice(0, 1000),
      columns: this._parseResult.columns,
      formatName: this._parseResult.formatName,
      tier: this._parseResult.tier,
      warnings: this._parseResult.warnings,
      metaInfo: this._parseResult.metaInfo,
      totalRows: filtered.length,
    })
  }

  private async _sortData(column: string, ascending: boolean) {
    if (!this._parseResult) return

    const sorted = this._provider.sortRows(
      this._parseResult.rows,
      column,
      ascending
    )

    this._panel.webview.postMessage({
      type: "vcfData",
      rows: sorted.slice(0, 1000),
      columns: this._parseResult.columns,
      formatName: this._parseResult.formatName,
      tier: this._parseResult.tier,
      warnings: this._parseResult.warnings,
      metaInfo: this._parseResult.metaInfo,
      totalRows: sorted.length,
    })
  }

  private _getLoadingHtml(): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: var(--vscode-font-family);
          background: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
        }
      </style>
    </head>
    <body>
      <p>⏳ Parsing file, please wait...</p>
    </body>
    </html>`
  }

  private _getWebviewHtml(): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>VCF Preview</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: var(--vscode-font-family);
          font-size: var(--vscode-font-size);
          background: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
        }

        /* ── Header bar ── */
        .header {
          padding: 10px 16px;
          background: var(--vscode-editor-lineHighlightBackground);
          border-bottom: 1px solid var(--vscode-panel-border);
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
        }

        .format-badge {
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: bold;
          letter-spacing: 0.5px;
        }
        .tier1 { background: #1a472a; color: #6fcf97; }
        .tier2 { background: #3d2b00; color: #f2994a; }
        .tier3 { background: #3d0000; color: #eb5757; }

        .row-count {
          font-size: 12px;
          color: var(--vscode-descriptionForeground);
        }

        /* ── Warning box ── */
        .warnings {
          margin: 10px 16px;
          padding: 8px 12px;
          background: #3d2b00;
          border-left: 3px solid #f2994a;
          border-radius: 3px;
          font-size: 12px;
          color: #f2994a;
        }

        /* ── Meta info collapsible ── */
        .meta-section {
          margin: 0 16px 10px;
        }
        .meta-toggle {
          cursor: pointer;
          font-size: 12px;
          color: var(--vscode-textLink-foreground);
          background: none;
          border: none;
          padding: 4px 0;
        }
        .meta-content {
          display: none;
          background: var(--vscode-editor-lineHighlightBackground);
          border: 1px solid var(--vscode-panel-border);
          border-radius: 3px;
          padding: 8px;
          font-size: 11px;
          font-family: var(--vscode-editor-font-family);
          max-height: 150px;
          overflow-y: auto;
        }
        .meta-content.open { display: block; }

        /* ── Toolbar ── */
        .toolbar {
          padding: 8px 16px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          border-bottom: 1px solid var(--vscode-panel-border);
        }

        select, input, button {
          background: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          border: 1px solid var(--vscode-input-border);
          padding: 4px 8px;
          border-radius: 3px;
          font-size: 12px;
        }

        button {
          cursor: pointer;
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
        }
        button:hover {
          background: var(--vscode-button-hoverBackground);
        }

        /* ── Table ── */
        .table-container {
          overflow: auto;
          padding: 0 16px 16px;
          max-height: calc(100vh - 200px);
        }

        table {
          border-collapse: collapse;
          width: 100%;
          font-size: 12px;
          margin-top: 10px;
        }

        th {
          background: var(--vscode-editor-lineHighlightBackground);
          border: 1px solid var(--vscode-panel-border);
          padding: 6px 10px;
          text-align: left;
          position: sticky;
          top: 0;
          cursor: pointer;
          white-space: nowrap;
          z-index: 1;
        }
        th:hover { background: var(--vscode-list-hoverBackground); }

        td {
          border: 1px solid var(--vscode-panel-border);
          padding: 5px 10px;
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        tr:hover td { background: var(--vscode-list-hoverBackground); }

        /* genotype colouring */
        .gt-hom-ref { color: #6fcf97; }
        .gt-het     { color: #f2994a; }
        .gt-hom-alt { color: #eb5757; }
        .gt-missing { color: var(--vscode-descriptionForeground); font-style: italic; }

        .sort-arrow { margin-left: 4px; font-size: 10px; }
      </style>
    </head>
    <body>

      <div class="header">
        <strong id="fileName">Loading...</strong>
        <span class="format-badge tier1" id="formatBadge">—</span>
        <span class="row-count" id="rowCount"></span>
      </div>

      <div id="warningBox" class="warnings" style="display:none"></div>

      <div class="meta-section" id="metaSection" style="display:none">
        <button class="meta-toggle" onclick="toggleMeta()">▶ Show file metadata</button>
        <div class="meta-content" id="metaContent"></div>
      </div>

      <div class="toolbar">
        <select id="filterColumn"><option value="">Filter by column...</option></select>
        <input type="text" id="filterValue" placeholder="Search value..." style="width:160px">
        <button onclick="applyFilter()">Apply</button>
        <button onclick="clearFilter()">Clear</button>
      </div>

      <div class="table-container">
        <table id="dataTable">
          <thead><tr id="headerRow"></tr></thead>
          <tbody id="tableBody"></tbody>
        </table>
      </div>

      <script>
        const vscode = acquireVsCodeApi()
        let currentSort = { column: '', ascending: true }
        let currentColumns = []

        window.addEventListener('message', event => {
          const msg = event.data
          if (msg.type === 'vcfData') {
            renderAll(msg)
          }
        })

        function renderAll(msg) {
          // Header
          document.getElementById('fileName').textContent =
            'VCF Preview — ' + msg.formatName
          
          const badge = document.getElementById('formatBadge')
          badge.textContent = msg.formatName
          badge.className = 'format-badge ' + msg.tier

          document.getElementById('rowCount').textContent =
            msg.totalRows.toLocaleString() + ' variants' +
            (msg.totalRows > 1000 ? ' (showing first 1000)' : '')

          // Warnings
          if (msg.warnings && msg.warnings.length > 0) {
            const box = document.getElementById('warningBox')
            box.style.display = 'block'
            box.innerHTML = '⚠️ ' + msg.warnings.join('<br>⚠️ ')
          }

          // Meta info
          if (msg.metaInfo && Object.keys(msg.metaInfo).length > 0) {
            document.getElementById('metaSection').style.display = 'block'
            const content = document.getElementById('metaContent')
            content.innerHTML = Object.entries(msg.metaInfo)
              .map(([k, v]) => '<b>' + k + '</b>: ' + v)
              .join('<br>')
          }

          // Filter dropdown
          const filterCol = document.getElementById('filterColumn')
          filterCol.innerHTML = '<option value="">Filter by column...</option>'
          msg.columns.forEach(col => {
            const opt = document.createElement('option')
            opt.value = col
            opt.textContent = col.toUpperCase()
            filterCol.appendChild(opt)
          })

          currentColumns = msg.columns
          renderTable(msg.rows, msg.columns)
        }

        function renderTable(rows, columns) {
          const headerRow = document.getElementById('headerRow')
          const tableBody = document.getElementById('tableBody')
          headerRow.innerHTML = ''
          tableBody.innerHTML = ''

          // Headers
          columns.forEach(col => {
            const th = document.createElement('th')
            const arrow = currentSort.column === col
              ? (currentSort.ascending ? ' ↑' : ' ↓') : ''
            th.innerHTML = col.toUpperCase() +
              '<span class="sort-arrow">' + arrow + '</span>'
            th.onclick = () => sortBy(col)
            headerRow.appendChild(th)
          })

          // Rows
          rows.forEach(row => {
            const tr = document.createElement('tr')
            columns.forEach(col => {
              const td = document.createElement('td')
              const val = row[col] || '.'
              td.textContent = val
              td.title = val // tooltip on hover for long values

              // Colour genotype column
              if (col === 'genotype') {
                td.className = genotypeClass(val)
              }
              tr.appendChild(td)
            })
            tableBody.appendChild(tr)
          })
        }

        function genotypeClass(gt) {
          if (!gt || gt === '.' || gt === 'missing') return 'gt-missing'
          // VCF style 0/1
          if (gt === '0/0' || gt === '0|0') return 'gt-hom-ref'
          if (gt === '1/1' || gt === '1|1') return 'gt-hom-alt'
          if (gt.includes('/') || gt.includes('|')) return 'gt-het'
          // Consumer style AA, TT, AG
          if (gt.length === 2) {
            if (gt[0] === gt[1]) return gt === '--' ? 'gt-missing' : 'gt-hom-ref'
            return 'gt-het'
          }
          return ''
        }

        function sortBy(column) {
          if (currentSort.column === column) {
            currentSort.ascending = !currentSort.ascending
          } else {
            currentSort.column = column
            currentSort.ascending = true
          }
          vscode.postMessage({
            command: 'sort',
            column,
            ascending: currentSort.ascending
          })
        }

        function applyFilter() {
          const column = document.getElementById('filterColumn').value
          const value = document.getElementById('filterValue').value
          if (!column) return
          vscode.postMessage({ command: 'filter', column, value })
        }

        function clearFilter() {
          document.getElementById('filterColumn').selectedIndex = 0
          document.getElementById('filterValue').value = ''
          vscode.postMessage({ command: 'filter', column: '', value: '' })
        }

        function toggleMeta() {
          const content = document.getElementById('metaContent')
          const btn = document.querySelector('.meta-toggle')
          const isOpen = content.classList.toggle('open')
          btn.textContent = (isOpen ? '▼' : '▶') + ' Show file metadata'
        }
      </script>
    </body>
    </html>`
  }

  public dispose() {
    VCFPreviewPanel.currentPanel = undefined
    this._panel.dispose()
    while (this._disposables.length) {
      const x = this._disposables.pop()
      if (x) x.dispose()
    }
  }
}