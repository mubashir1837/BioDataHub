import * as vscode from "vscode"
import * as fs from "fs"
import * as readline from "readline"

// ─── Unified row structure ────────────────────────────────────────────────────
export interface VCFRow {
  rsid: string
  chromosome: string
  position: string
  ref: string
  alt: string
  genotype: string
  qual: string
  filter: string
  info: string
  format: string
  sample: string
  [key: string]: string
}

// Confidence tier of the detected format
export type FormatTier = "tier1" | "tier2" | "tier3"

export interface ParseResult {
  rows: VCFRow[]
  columns: string[]
  formatName: string
  tier: FormatTier
  warnings: string[]
  metaInfo: Record<string, string>
}

// ─── Helper: strip surrounding quotes from a string ──────────────────────────
function stripQuotes(val: string): string {
  return val.replace(/^["']|["']$/g, "").trim()
}

// ─── Helper: parse INFO field into readable key=value pairs ──────────────────
function parseInfoField(info: string): string {
  if (!info || info === ".") return "."
  return info
    .split(";")
    .map((entry) => {
      const [key, val] = entry.split("=")
      return val !== undefined ? `${key}: ${val}` : key
    })
    .join(" | ")
}

// ─── Format detector ─────────────────────────────────────────────────────────
function detectFormat(lines: string[]): {
  format: string
  tier: FormatTier
} {
  const firstFew = lines.slice(0, 25).join("\n").toLowerCase()

  // Tier 1 — Standard GATK/VCF
  if (lines.some((l) => l.startsWith("##fileformat=VCF"))) {
    return { format: "GATK VCF", tier: "tier1" }
  }

  // Tier 2 — AncestryDNA (has allele1 allele2 columns)
  if (
    firstFew.includes("ancestrydna") ||
    lines.some(
      (l) =>
        l.toLowerCase().includes("allele1") &&
        l.toLowerCase().includes("allele2")
    )
  ) {
    return { format: "AncestryDNA", tier: "tier2" }
  }

  // Tier 2 — 23andMe (has # rsid chromosome position genotype)
  if (
    firstFew.includes("23andme") ||
    lines.some(
      (l) =>
        l.toLowerCase().includes("rsid") &&
        l.toLowerCase().includes("genotype")
    )
  ) {
    return { format: "23andMe", tier: "tier2" }
  }

  // Tier 2 — FTDNA Illumina (CSV with RSID,CHROMOSOME,POSITION,RESULT)
  if (
    lines.some(
      (l) =>
        l.toUpperCase().includes("RSID") &&
        l.toUpperCase().includes("RESULT")
    )
  ) {
    return { format: "FTDNA Illumina", tier: "tier2" }
  }

  // Tier 3 — IYG minimal (quoted lines, only 2 columns)
  const firstData = lines.find(
    (l) => l.trim() && !l.startsWith("#")
  )
  if (firstData) {
    const cleaned = stripQuotes(firstData)
    const parts = cleaned.split(/\s+/)
    if (parts.length === 2 && parts[0].startsWith("rs")) {
      return { format: "IYG Minimal", tier: "tier3" }
    }
  }

  return { format: "Unknown", tier: "tier3" }
}

// ─── Individual format parsers ────────────────────────────────────────────────

function parseGATK(lines: string[]): {
  rows: VCFRow[]
  columns: string[]
  metaInfo: Record<string, string>
  warnings: string[]
} {
  const rows: VCFRow[] = []
  const warnings: string[] = []
  const metaInfo: Record<string, string> = {}
  let columns: string[] = []
  let sampleNames: string[] = []

  for (const line of lines) {
    // Collect meta info (##key=value)
    if (line.startsWith("##")) {
      const eqIdx = line.indexOf("=")
      if (eqIdx !== -1) {
        const key = line.slice(2, eqIdx)
        const val = line.slice(eqIdx + 1)
        // Only store short meta values, skip giant command lines
        if (val.length < 100) {
          metaInfo[key] = val
        }
      }
      continue
    }

    // Column header line
    if (line.startsWith("#CHROM")) {
      columns = line.replace("#", "").split("\t").map((c) => c.trim())
      sampleNames = columns.slice(9)
      continue
    }

    if (!line.trim()) continue

    const parts = line.split("\t")

    // Validate required fields
    if (parts.length < 5) {
      warnings.push(`Skipped malformed line: ${line.slice(0, 50)}...`)
      continue
    }

    const row: VCFRow = {
      rsid: parts[2] || ".",
      chromosome: parts[0] || ".",
      position: parts[1] || ".",
      ref: parts[3] || ".",
      alt: parts[4] || ".",
      qual: parts[5] || ".",
      filter: parts[6] || ".",
      info: parseInfoField(parts[7] || "."),
      format: parts[8] || ".",
      genotype: "",
      sample: sampleNames[0] || "Sample",
    }

    // Extract GT from sample column
    if (parts[9] && parts[8]) {
      const formatFields = parts[8].split(":")
      const sampleFields = parts[9].split(":")
      const gtIdx = formatFields.indexOf("GT")
      row.genotype = gtIdx !== -1 ? sampleFields[gtIdx] || "." : parts[9]
    }

    rows.push(row)
  }

  if (columns.length === 0) {
    warnings.push("No #CHROM header found — file may be malformed")
    columns = ["CHROM", "POS", "ID", "REF", "ALT", "QUAL", "FILTER", "INFO"]
  }

  return { rows, columns, metaInfo, warnings }
}

function parse23andMe(lines: string[]): {
  rows: VCFRow[]
  warnings: string[]
} {
  const rows: VCFRow[] = []
  const warnings: string[] = []
  let headerSkipped = false

  for (const line of lines) {
    // Skip comment lines
    if (line.startsWith("#")) continue

    // First non-comment line is the column header
    if (!headerSkipped) {
      headerSkipped = true
      continue
    }

    if (!line.trim()) continue

    const parts = line.split("\t").map((p) => p.trim())

    if (parts.length < 4) {
      warnings.push(`Skipped short line: ${line.slice(0, 40)}`)
      continue
    }

    const genotype = parts[3] === "--" ? "missing" : parts[3]

    rows.push({
      rsid: parts[0] || ".",
      chromosome: parts[1] || ".",
      position: parts[2] || ".",
      ref: ".",
      alt: ".",
      genotype,
      qual: ".",
      filter: ".",
      info: ".",
      format: ".",
      sample: ".",
    })
  }

  return { rows, warnings }
}

function parseFTDNA(lines: string[]): {
  rows: VCFRow[]
  warnings: string[]
} {
  const rows: VCFRow[] = []
  const warnings: string[] = []
  let headerSkipped = false

  for (const line of lines) {
    if (!line.trim()) continue

    // First line is header
    if (!headerSkipped) {
      headerSkipped = true
      continue
    }

    // Split by comma and strip quotes from each field
    const parts = line.split(",").map(stripQuotes)

    if (parts.length < 4) {
      warnings.push(`Skipped short line: ${line.slice(0, 40)}`)
      continue
    }

    rows.push({
      rsid: parts[0] || ".",
      chromosome: parts[1] || ".",
      position: parts[2] || ".",
      ref: ".",
      alt: ".",
      genotype: parts[3] || ".",
      qual: ".",
      filter: ".",
      info: ".",
      format: ".",
      sample: ".",
    })
  }

  return { rows, warnings }
}

function parseAncestryDNA(lines: string[]): {
  rows: VCFRow[]
  warnings: string[]
} {
  const rows: VCFRow[] = []
  const warnings: string[] = []
  let headerSkipped = false

  for (const line of lines) {
    if (line.startsWith("#")) continue

    if (!headerSkipped) {
      headerSkipped = true
      continue
    }

    if (!line.trim()) continue

    const parts = line.split("\t").map((p) => p.trim())

    if (parts.length < 5) {
      warnings.push(`Skipped short line: ${line.slice(0, 40)}`)
      continue
    }

    // Combine allele1 + allele2 into genotype
    const genotype = `${parts[3]}${parts[4]}`

    rows.push({
      rsid: parts[0] || ".",
      chromosome: parts[1] || ".",
      position: parts[2] || ".",
      ref: ".",
      alt: ".",
      genotype,
      qual: ".",
      filter: ".",
      info: ".",
      format: ".",
      sample: ".",
    })
  }

  return { rows, warnings }
}

function parseIYG(lines: string[]): {
  rows: VCFRow[]
  warnings: string[]
} {
  const rows: VCFRow[] = []
  const warnings: string[] = []

  warnings.push(
    "IYG Minimal format detected — chromosome and position data unavailable. Only rsID and genotype will be shown."
  )

  for (const line of lines) {
    if (!line.trim()) continue

    // Strip surrounding quotes from the whole line
    const cleaned = stripQuotes(line)
    const parts = cleaned.split(/\s+/)

    if (parts.length < 2) continue

    rows.push({
      rsid: parts[0] || ".",
      chromosome: ".",
      position: ".",
      ref: ".",
      alt: ".",
      genotype: parts[1] || ".",
      qual: ".",
      filter: ".",
      info: ".",
      format: ".",
      sample: ".",
    })
  }

  return { rows, warnings }
}

// ─── Main provider class ──────────────────────────────────────────────────────
export class VCFDataProvider {
  private cache = new Map<string, ParseResult>()

  async parseFile(uri: vscode.Uri): Promise<ParseResult> {
    const filePath = uri.fsPath

    if (this.cache.has(filePath)) {
      return this.cache.get(filePath)!
    }

    const lines = await this.readLines(filePath)
    const { format, tier } = detectFormat(lines)

    let rows: VCFRow[] = []
    let warnings: string[] = []
    let metaInfo: Record<string, string> = {}
    let columns: string[] = [
      "rsid", "chromosome", "position", "ref", "alt",
      "genotype", "qual", "filter", "info",
    ]

    switch (format) {
      case "GATK VCF": {
        const result = parseGATK(lines)
        rows = result.rows
        warnings = result.warnings
        metaInfo = result.metaInfo
        // For GATK show all standard columns including sample
        columns = [
          "rsid", "chromosome", "position", "ref", "alt",
          "genotype", "qual", "filter", "info",
        ]
        break
      }
      case "23andMe": {
        const result = parse23andMe(lines)
        rows = result.rows
        warnings = result.warnings
        columns = ["rsid", "chromosome", "position", "genotype"]
        break
      }
      case "FTDNA Illumina": {
        const result = parseFTDNA(lines)
        rows = result.rows
        warnings = result.warnings
        columns = ["rsid", "chromosome", "position", "genotype"]
        break
      }
      case "AncestryDNA": {
        const result = parseAncestryDNA(lines)
        rows = result.rows
        warnings = result.warnings
        columns = ["rsid", "chromosome", "position", "genotype"]
        break
      }
      case "IYG Minimal": {
        const result = parseIYG(lines)
        rows = result.rows
        warnings = result.warnings
        columns = ["rsid", "genotype"]
        break
      }
      default:
        warnings.push(
          "Could not detect file format. Please check your file matches a supported format."
        )
    }

    const result: ParseResult = {
      rows,
      columns,
      formatName: format,
      tier,
      warnings,
      metaInfo,
    }

    this.cache.set(filePath, result)
    return result
  }

  // Filter rows by column value
  filterRows(rows: VCFRow[], column: string, value: string): VCFRow[] {
    if (!value.trim()) return rows
    return rows.filter((row) =>
      row[column]?.toLowerCase().includes(value.toLowerCase())
    )
  }

  // Sort rows by column
  sortRows(rows: VCFRow[], column: string, ascending = true): VCFRow[] {
    return [...rows].sort((a, b) => {
      const valA = a[column] || ""
      const valB = b[column] || ""

      // Numeric sort for position
      if (column === "position") {
        const numA = parseInt(valA) || 0
        const numB = parseInt(valB) || 0
        return ascending ? numA - numB : numB - numA
      }

      return ascending
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA)
    })
  }

  private readLines(filePath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const lines: string[] = []
      const rl = readline.createInterface({
        input: fs.createReadStream(filePath),
      })
      rl.on("line", (line) => lines.push(line))
      rl.on("close", () => resolve(lines))
      rl.on("error", reject)
    })
  }
}