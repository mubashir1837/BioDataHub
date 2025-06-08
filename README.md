# Bio Data Hub 

A VS Code extension for biological data exploration.


[![Version](https://img.shields.io/badge/version-1.4.2-blue)](https://marketplace.visualstudio.com/items?itemName=Mubashir-Ali.bio-data-hub&wt.mc_id=studentamb_468108)
![VS Code](https://img.shields.io/badge/VS%20Code-%5E1.64.0-blue)
![Build](https://img.shields.io/badge/build-passing-brightgreen)
[![Sponsor](https://img.shields.io/badge/Sponsor-%F0%9F%92%B8-blue?style=for-the-badge)](https://github.com/sponsors/mubashir1837)



<img src="resources/logo.jpg"  width="100px"/>


## Overview

**Bio-Data-Hub** is a powerful Visual Studio Code extension designed for bioinformatics professionals and data scientists. It simplifies the exploration, visualization, and management of CSV datasets, enabling users to analyze biological data efficiently.

## Features

- **Search Local Datasets**: Quickly locate datasets on your machine.
- **Search Online Datasets**: Access online repositories for bioinformatics datasets.
- **Download Datasets**: Fetch datasets directly into your workspace.
- **Preview CSV Files**: View CSV data in a clean and organized format.
- **Generate Metadata**: Automatically create metadata for datasets.
- **Visualize Data**: Generate visualizations for better insights.
- **Export Data**: Save processed data for further use.

## Installation

1. Open Visual Studio Code.
2. Go to the Extensions view by clicking on the Extensions icon in the Activity Bar.
3. Search for `Bio-Data-Hub`.
4. Click **Install**.

Alternatively, clone the repository and build the extension locally:

```bash
git clone https://github.com/mubashir1837/BioDataHub.git
cd BioDataHub
npm install
npm run build
```

## Usage

### Commands

| Command                              | Description                              | Shortcut         |
|--------------------------------------|------------------------------------------|------------------|
| `BioDataHub: Search Local Datasets`  | Search for datasets locally.             | -                |
| `BioDataHub: Search Online Datasets` | Search for datasets online.              | -                |
| `BioDataHub: Download Dataset`       | Download datasets from online sources.   | -                |
| `BioDataHub: Preview CSV`            | Preview CSV files in the editor.         | `Ctrl+Shift+P`   |
| `BioDataHub: Generate Metadata`      | Generate metadata for datasets.          | `Ctrl+Shift+M`   |
| `BioDataHub: Visualize Data`         | Visualize CSV data.                      | `Ctrl+Shift+V`   |
| `BioDataHub: Export Data`            | Export processed data.                   | -                |

### Context Menu

Right-click on a `.csv` file in the Explorer to access the following options:

- Preview CSV
- Generate Metadata
- Visualize Data

## Screenshots

### Activity Bar Integration
![Activity Bar](resources/visualize-data.png)

### Dataset View
![Dataset View](resources/data1.png)

## Keybindings

| Keybinding         | Command                  | When Condition       |
|--------------------|--------------------------|----------------------|
| `Ctrl+Shift+P`     | Preview CSV             | `editorLangId == csv` |
| `Ctrl+Shift+M`     | Generate Metadata       | `editorLangId == csv` |
| `Ctrl+Shift+V`     | Visualize Data          | `editorLangId == csv` |



## Repository

[GitHub Repository](https://github.com/mubashir1837/BioDataHub)

## Social Links

[<img src="https://img.shields.io/badge/LinkedIn-Connect-blue?style=social&logo=linkedin" alt="LinkedIn">](https://www.linkedin.com/in/mubashirali3/)
[<img src="https://img.shields.io/badge/GitHub-Follow-purple?style=social&logo=github" alt="GitHub">](https://github.com/mubashir1837)

.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## Support

For any issues or feature requests, please open an issue on the [GitHub Repository](https://github.com/mubashir1837/BioDataHub/issues).

---

Happy coding with **Bio-Data-Hub**! 
