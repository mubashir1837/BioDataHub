---
title: 'BioDataHub: An Integrated VS Code Extension for Streamlined Bioinformatics Dataset Analysis and Visualization'
tags:
  - bioinformatics
  - data visualization
  - dataset management
  - genomics
  - Visual Studio Code
  - TypeScript
authors:
  - name: Mubashir Ali
    orcid: 0009-0006-0222-7585
    corresponding: true
    affiliation: "1, 2"
affiliations:
  - name: University of the People, United States
    index: 1
  - name: Quaid-i-Azam University, Islamabad, Pakistan
    index: 2
date: 23 September 2026
bibliography: paper.bib
---

# Summary

BioDataHub is an open-source Visual Studio Code extension for discovering,
previewing, cataloging, and exploring biological datasets within a familiar
development environment. It provides local and online dataset search, dataset
download, CSV preview, automatic metadata generation, interactive visualization,
principal component analysis (PCA), K-means clustering, data export, and a VCF
file opening workflow. By bringing these activities into VS Code, BioDataHub
reduces the need to move repeatedly between dataset browsers, standalone
viewers, analysis scripts, and visualization tools.

# Statement of need

Bioinformatics workflows commonly combine repository search, file inspection,
metadata recording, exploratory analysis, and visualization. These activities
are often performed with separate web services, spreadsheet applications, and
analysis scripts. The resulting context switching makes it harder to preserve
the relationship between a dataset, its metadata, and the exploratory results.
Although platforms such as Galaxy support reproducible biomedical analysis
[@afgan2018] and Bioconductor provides extensive genomic analysis facilities
[@Huber2015], neither is intended to provide a lightweight dataset exploration
workflow embedded in a general-purpose code editor.

BioDataHub addresses this gap for researchers and students who already use VS
Code or who want a low-configuration entry point for biological data
exploration. It is especially useful for inspecting CSV-based gene-expression
or other tabular datasets before more specialized statistical analysis. The
extension is not intended to replace established domain-specific pipelines,
quality-control tools, or statistical packages.

# State of the field

Galaxy provides a broad web-based environment for accessible, reproducible,
and collaborative biomedical analyses [@afgan2018]. Bioconductor offers a
large R-based ecosystem for statistical analysis and visualization of genomic
data [@Huber2015]. Programmatic visualization libraries such as Matplotlib
[@Hunter2007] and Seaborn [@Waskom2021] are powerful, but their use generally
requires users to write and run separate scripts. Spreadsheet and standalone
CSV viewers provide quick inspection but do not normally combine repository
search, metadata generation, dimensionality reduction, and clustering in the
same interface.

BioDataHub occupies a narrower, complementary position: it integrates dataset
discovery and first-pass exploration into VS Code while leaving downstream
analysis to the user's preferred scientific tools. Its use of the VS Code
extension and Webview APIs also makes the workflow available on the same
workspace where researchers manage code, data, and analysis notes.

# Software design

BioDataHub is implemented in TypeScript and uses the VS Code Extension API,
Webview API, and a small set of focused JavaScript libraries. Dataset search,
download, CSV preview, metadata generation, visualization, and VCF opening are
exposed as VS Code commands and Explorer context-menu actions. The extension
also contributes an Activity Bar view for dataset access.

CSV data are parsed for tabular preview and exploratory visualization. The
analysis commands include PCA and K-means clustering, using `ml-pca` and
`ml-kmeans`, while charts are rendered with Chart.js and D3. Metadata and
processed data can be exported for use in later stages of a workflow. The
extension supports CSV-oriented exploration and provides a VCF/genotype file
opening workflow; it does not attempt to be a complete variant-analysis
engine.

# Research impact statement

BioDataHub is designed to lower the setup cost of early-stage biological data
exploration. Its primary contribution is workflow integration: users can find
datasets, inspect tabular content, generate metadata, and produce exploratory
plots without leaving the editor in which they organize their analysis. This
design can support teaching, exploratory research, and reproducible project
setup, while more specialized tools remain available for statistical modeling,
sequence processing, and production pipelines.

The repository includes sample biological data and instructions for building
the extension locally. Future development can extend format support, repository
connectors, visualization controls, and integration with machine-learning
workflows.

# Quality control

The project is compiled with TypeScript and checked with ESLint. Automated tests
are included for extension behavior and PCA-related functionality. The
repository's build workflow can be run with `npm install` followed by
`npm run build`, and the test workflow with `npm test`.

# Availability

The source code is available at
<https://github.com/mubashir1837/BioDataHub> under the MIT License. BioDataHub
is also distributed as a Visual Studio Code extension under the publisher
`Mubashir-Ali`. The version described here is 1.5.0.

# Acknowledgements

The author thanks the open-source communities behind Visual Studio Code,
Chart.js, D3, `ml-pca`, and `ml-kmeans`, whose software supports BioDataHub's
implementation.

# References