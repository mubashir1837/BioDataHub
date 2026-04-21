import * as vscode from "vscode"
import { VCFPreviewPanel } from "../panels/vcfPreviewPanel"

export function registerOpenVcfCommand(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "biodatahub.openVcfFile",
    async (uri?: vscode.Uri) => {
      // If command is called without a file (e.g. from command palette)
      // show a file picker dialog
      if (!uri) {
        const files = await vscode.window.showOpenDialog({
          canSelectMany: false,
          openLabel: "Open VCF / Genotype File",
          filters: {
            "VCF and Genotype Files": ["vcf", "txt", "csv"],
            "All Files": ["*"],
          },
        })

        if (!files || files.length === 0) return
        uri = files[0]
      }

      VCFPreviewPanel.createOrShow(context.extensionUri, uri)
    }
  )

  context.subscriptions.push(disposable)
}