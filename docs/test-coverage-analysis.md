# Test Coverage Analysis

_Analysis of the BioDataHub test suite, its gaps, and a prioritised plan to close them._

## 1. Where we are today

| Measure | Value |
| --- | --- |
| Production TypeScript | 4,127 lines across 13 modules |
| Test code | 39 lines across 3 files |
| Modules imported by any test | 1 of 13 (`visualizationProvider`) |
| Product functions asserted on | 1 (`getPcaClusteringHtml`, a private HTML builder) |
| Coverage tooling in the repo | none (`nyc` / `c8` are not dependencies) |
| CI running tests | none (`.github/` contains only `FUNDING.yml`) |

The three test files are:

- `src/test/suite/sample.test.ts` — asserts `1 === 1`.
- `src/test/extension.test.ts` — asserts the extension is installed.
- `src/test/suite/pca.test.ts` — asserts a PCA HTML string contains `<!DOCTYPE html>`.

No parser, no statistic, no data transformation, and no command in the extension is
covered by an assertion.

## 2. The suite does not actually run

Before coverage can be improved, the harness has to work. Three defects were confirmed
by running the commands:

### 2.1 `npm test` executes zero tests and exits 0

```
"test": "node node_modules/@vscode/test-electron/out/runTest.js --extensionDevelopmentPath=. --extensionTestsPath=out/test"
```

`@vscode/test-electron/out/runTest.js` is a library module that exports `runTests()`. It has
no CLI entry point — no `require.main` guard, no `process.argv` handling. Running it directly
loads the module, does nothing, and exits successfully:

```
$ node node_modules/@vscode/test-electron/out/runTest.js --extensionDevelopmentPath=. --extensionTestsPath=out/test
$ echo $?
0
```

This is the worst possible failure mode: a green signal that means nothing. Any CI job wired
to `npm test` today would pass on a completely broken codebase.

### 2.2 The Mocha runner uses the wrong interface

`src/test/suite/index.ts` configures Mocha with `ui: 'tdd'` (which provides `suite`/`test`),
but every test file is written in BDD style with `describe`/`it`. Under that runner the files
fail to load:

```
$ npx mocha --ui tdd out/test/suite/sample.test.js
Exception during run: ReferenceError: describe is not defined
```

### 2.3 Two competing, mutually inconsistent runner configs

- `.vscode-test.mjs` points `@vscode/test-cli` at `out/test/**/*.test.js` (defaults to BDD).
- `src/test/runTest.ts` shells out to a `vscode-test` binary with `--extensionTestsPath=out/test/suite`.
- `package.json`'s `test` script points at `out/test`, where no `index.js` exists — the loader
  is at `out/test/suite/index.js`.

Three configurations, no two of which agree.

### 2.4 The one integration test asserts against the wrong extension ID

`extension.test.ts` looks up `Mubashir-Ali.biodatahub`. The real identifier is
`publisher.name` = `Mubashir-Ali.bio-data-hub`. The assertion would fail the moment it
actually ran — which, per 2.1, it never has.

## 3. Bugs currently sitting in untested code

These were found by exercising the untested modules directly against the fixtures already
committed in `resources/sample-data/`. Each is the kind of defect a single unit test would
have caught, and each is a reason to prioritise the areas in §4.

### 3.1 The 23andMe parser silently drops the first variant

`parse23andMe` skips all `#`-prefixed lines, then discards the **next** line as a column header.
But in real 23andMe exports the header *is* a comment (`# rsid chromosome position genotype`),
so the line it discards is the first data row.

Verified against `resources/sample-data/23andme_vcf.txt`:

| | |
| --- | --- |
| Non-comment data lines in file | 638,463 |
| Rows returned by the parser | 638,462 |
| First data line in the file | `rs548049170  1  69869  TT` |
| First row the parser returns | `rs13328684  1  74792  --` |

`rs548049170` is lost with no warning. AncestryDNA and FTDNA are handled correctly because
their headers genuinely are non-comment lines — which is exactly why a per-format fixture
test would have isolated this to 23andMe alone.

### 3.2 Any numeric column with a repeated value is typed `String`

`determineDataType` gates numeric classification on
`numericValues.length === uniqueValues.size` — comparing a count of *rows* against a count of
*distinct values*. Those are equal only when every value in the column is unique, so a normal
integer column with any repetition falls through to `String`.

```
gene,count,score
BRCA1,1,0.5
BRCA2,1,0.7
TP53,2,0.9
```
→ `{ gene: 'String', count: 'String', score: 'Float' }`

`count` holds `1, 1, 2` and is reported as a string column.

### 3.3 Empty cells are counted as the number zero

`Number("")` is `0`, not `NaN`, so blank cells pass the `!isNaN(numValue)` guard and enter the
statistics arrays. A fully empty column gets real-looking statistics:

```
missing_col: min 0, max 0, mean 0   — while simultaneously reporting 3 missing values
```

In a partially populated column this silently drags the mean toward zero. Note that
`VisualizationProvider.getNumericColumns` *does* guard `value !== ""` — the two code paths
disagree about what counts as numeric, and nothing tests either.

### 3.4 `biodatahub.exportData` is never registered

The command is declared in `package.json` under both `contributes.commands` and
`activationEvents`, and `csvPreviewPanel.ts:170` invokes it:

```ts
vscode.commands.executeCommand("biodatahub.exportData", this._csvUri, format)
```

`extension.ts` never registers a handler. Clicking Export in the CSV preview rejects with
"command not found".

### 3.5 The Datasets tree view is registered under the wrong ID

`package.json` contributes the view as `biodatahub-Datasets`; `extension.ts:48` calls
`createTreeView("biodatahubDatasets", ...)`. The view rendered in the sidebar is therefore
never bound to `DatasetSearchProvider`, and `datasetSearchProvider.ts:85`'s
`executeCommand("biodatahubDatasets.focus")` targets the same non-contributed ID.

### 3.6 Webview HTML is built by unescaped string interpolation

All webviews run with `enableScripts: true`, and file-derived text is interpolated into HTML
and JavaScript with no escaping:

- `visualizationProvider.ts:224` builds JS source directly:
  `.domain([${colorValues.map((v) => `"${v}"`).join(", ")}])` — a cell containing `"` ends the
  string literal and the rest is executed.
- `getPcaClusteringHtml` embeds `JSON.stringify(points)` inside a `<script>` block.
  `JSON.stringify` does not escape `/`, so a row label containing `</script>` closes the block:
  ```
  JSON.stringify([{label:"</script><img src=x onerror=alert(1)>"}])
  → [{"label":"</script><img src=x onerror=alert(1)>"}]
  ```
- `metadataProvider.ts` interpolates CSV-derived column names and cell values straight into
  table markup.

This matters more than usual here because the extension's own feature set encourages opening
third-party data: `downloadDataset` fetches datasets from Kaggle and Zenodo, and the payload
is rendered by exactly these panels.

## 4. Proposed priorities

Ordered by (risk closed) ÷ (effort). P0 is a prerequisite for everything else.

### P0 — Make the harness real

Nothing below is worth writing until a failing test can fail the build.

1. Pick **one** runner. `@vscode/test-cli` with `.vscode-test.mjs` is the maintained path;
   delete `src/test/runTest.ts` and `src/test/suite/index.ts` rather than keep three configs.
2. Change `"test"` to `vscode-test` (or `npm run compile && vscode-test`), and verify it
   reports a non-zero exit when a test fails — assert this once, deliberately, with a
   temporary failing test.
3. Split the scripts: `test:unit` (plain Mocha, no Electron) and `test:integration`
   (VS Code host). The unit lane is what contributors and CI will actually run.
4. Fix the extension ID in `extension.test.ts` to `Mubashir-Ali.bio-data-hub`.
5. Add `c8` and publish a coverage number, so this document can be replaced by a metric.
6. Add a `.github/workflows/ci.yml` running `compile`, `lint`, and `test:unit` on PRs, with
   `xvfb-run` for the integration lane.

### P1 — VCF/genotype parsing (`vcfDataProvider.ts`, 484 lines)

**The highest-value target in the repo, and the cheapest.** It compiles with *no* runtime
`require("vscode")`, so it is unit-testable in plain Node today with zero refactoring — and
`resources/sample-data/` already contains one real fixture per supported format.

Cover:

- **Format detection** — one test per tier: GATK (`tier1`), 23andMe / AncestryDNA / FTDNA
  (`tier2`), IYG (`tier3`), plus an unrecognised file asserting the `Unknown` fallback and its
  warning. Detection order is load-bearing (the AncestryDNA branch is checked before 23andMe)
  and nothing pins it.
- **Row-count and first/last-row golden tests** per format — this is precisely the assertion
  that exposes §3.1.
- **Header disambiguation** — a comment-style header vs. a bare header, as its own case.
- **GATK specifics** — `GT` extraction by `FORMAT` index rather than position, `INFO`
  key=value expansion, valueless `INFO` flags, the `<5 columns` malformed-line warning, the
  missing-`#CHROM` fallback columns, and the `metaInfo` 100-character truncation rule.
- **Multi-sample VCFs** — `parseGATK` reads only `sampleNames[0]`; today that limitation is
  undocumented and unasserted. A test should either pin it as intended or fail.
- **CRLF handling** — four of the five fixtures are CRLF; make that explicit rather than
  incidental.
- **`filterRows` / `sortRows`** — pure functions, no I/O: case-insensitive substring match,
  empty-filter passthrough, unknown-column behaviour, numeric sort on `position` vs.
  lexicographic elsewhere, and non-mutation of the input array.
- Trim the giant fixtures to a few hundred representative lines committed under
  `src/test/fixtures/` so the suite stays fast; keep one full-size file for a slow lane if
  parsing 700k rows is a scenario worth guarding.

### P2 — Metadata generation (`metadataGenerator.ts`, 214 lines)

Also free of a runtime `vscode` dependency. This module produces the numbers users will cite
in research contexts, which raises the cost of a silent error.

Cover `determineDataType` across Integer, Float, Boolean (all four configured pairs), Date,
DNA, RNA, Protein and String — the cases in §3.2 and §3.3 belong here as regression tests.
Then `calculateMean` (including the empty-array zero), `formatFileSize` at each unit boundary
(`1023`, `1024`, `1024**3`, and `0`), the 1000-row processing cap, the 5-row sample window,
and missing-value counting.

Two notes worth folding in: `formatFileSize` is duplicated verbatim in
`datasetSearchProvider.ts` (`DatasetItem.formatFileSize`) — test one and have the other import
it. And the DNA/RNA/protein patterns overlap by construction: `"AGC"` is a valid match for all
three, so the tests should pin the intended precedence rather than assume it.

### P3 — Extract and test the pure helpers

Several genuinely pure functions are trapped as module-private or behind `vscode`-importing
classes, which is why `pca.test.ts` resorts to casting through `as unknown as` to reach a
private method. That cast is a smell worth removing: it means the test breaks on rename
without protecting behaviour.

Move to a `src/utils/` module and test directly:

- `getNumericColumns` — the 70%-of-first-10-rows heuristic, and its disagreement with §3.3
  over empty strings.
- `generateColors` — the palette boundary at 10 and the golden-angle HSL generation beyond it.
- `stripQuotes`, `parseInfoField` — currently private in `vcfDataProvider.ts`.
- `extractKeywords`, `calculateRelevanceScore` — private in `aiRecommendationProvider.ts`.
  The scoring is the whole feature: exact matches weighted 2, partial 1, normalised by
  `queryKeywords.length * 2`. Note that substring matching is bidirectional, so a query for
  `"rna"` partially matches `"rnase"` *and* the reverse — pin the intended behaviour.
- `isBioinformaticsFile` / `getFileType` — pure, 10 extensions, trivially table-driven.

### P4 — Activation and registration contract

A single integration test that activates the extension and asserts that every command in
`package.json`'s `contributes.commands` appears in `vscode.commands.getCommands(true)`, and
that every contributed view ID is the one the code registers.

That one test catches §3.4 and §3.5 together, and prevents the whole class of
declared-but-unwired regressions permanently. It is roughly twenty lines and reads the command
list from `package.json` rather than hardcoding it, so it stays correct as commands are added.

### P5 — Webview HTML escaping

Add an `escapeHtml` / `escapeJsString` helper and unit-test it against the §3.6 payloads:
`</script>`, `"`, `<img onerror>`, and a lone `'`. Then assert that each HTML builder
(`getScatterPlotHtml`, `getBarChartHtml`, `getLineChartHtml`, `getPcaClusteringHtml`,
`getMetadataHtml`) passes file-derived values through it.

These are string-in/string-out functions, so the tests are cheap. The current PCA test — which
only checks that the output contains `<!DOCTYPE html>` — is the template to avoid: assert on
the *escaping*, not on the boilerplate.

Two hardening changes belong with this work: the webviews load D3 and Chart.js from
`d3js.org` and `cdn.jsdelivr.net`, which fails offline and is unpinned; and no
`Content-Security-Policy` meta tag or nonce is set on any panel, which is the standard
mitigation VS Code recommends for `enableScripts: true`.

### P6 — Panels and commands (lower priority, higher cost)

`csvPreviewPanel` and `vcfPreviewPanel` (952 lines combined) are largely inline browser
JavaScript inside template literals, which cannot be reached without a DOM harness. Rather
than build one now, extract the message-handling logic (`_filterData`, `_sortData`, the
`onDidReceiveMessage` switch) from the rendering, and test that. The singleton
`currentPanel` behaviour in `VCFPreviewPanel.createOrShow` — which reveals the existing panel
and **ignores the new `fileUri`**, so opening a second VCF file shows the first one's data — is
worth an integration test on its own.

`searchDatasets.ts` and `downloadDataset.ts` are currently mock implementations returning
hardcoded fixtures with `setTimeout` delays. Testing them now would pin the mocks rather than
any real behaviour; defer until they call real APIs, then test against recorded responses.

## 5. Suggested sequence

| Step | Scope | Unlocks |
| --- | --- | --- |
| 1 | P0 harness + CI | Any test can fail the build |
| 2 | P1 VCF parser | Largest untested module; fixtures already exist; catches §3.1 |
| 3 | P2 metadata generator | Catches §3.2, §3.3 |
| 4 | P4 registration contract | Catches §3.4, §3.5 in ~20 lines |
| 5 | P3 helper extraction | Removes the `as unknown as` private-method casts |
| 6 | P5 escaping | Closes §3.6 |

Steps 1–4 are the bulk of the value. They cover roughly 700 lines of the highest-risk logic,
need no refactoring or new infrastructure beyond a working runner, and close five of the six
confirmed bugs.

## 6. Suggested coverage targets

Percentage targets across the whole repo would be misleading here, because ~40% of the source
is HTML and inline browser JS inside template literals. Better to set targets per layer:

| Layer | Target | Rationale |
| --- | --- | --- |
| Parsers and statistics (`vcfDataProvider`, `metadataGenerator`) | 90% branch | Pure, high-risk, cheap to test |
| Extracted helpers (`src/utils/`) | 90% branch | Pure by construction |
| Providers (non-HTML methods) | 70% line | Mixed I/O |
| HTML builders | escaping asserted, not % | Output shape is not the risk; injection is |
| Panels, command wiring | smoke + registration contract | Needs the VS Code host |

---

_Findings in §2 and §3 were verified by execution against the committed fixtures, not by
inspection alone._
