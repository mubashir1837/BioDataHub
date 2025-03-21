<<<<<<< HEAD
# BioDataHub
=======
# BioDataHub

![BioDataHub Logo](https://raw.githubusercontent.com/mubashir1837/BioDataHub/main/resources/dna.png)

**BioDataHub** is a powerful VS Code extension designed for bioinformatics professionals and data scientists. It simplifies the exploration, visualization, and management of CSV datasets, enabling seamless workflows for bioinformatics data analysis.

---

## Features

- **Search Local Datasets**: Quickly locate datasets on your local machine.
- **Search Online Datasets**: Discover datasets from online repositories.
- **Download Datasets**: Fetch datasets directly into your workspace.
- **Preview CSV Files**: View CSV data in an intuitive format.
- **Generate Metadata**: Automatically create metadata for datasets.
- **Visualize Data**: Generate interactive visualizations using D3.js.
- **Export Data**: Save processed data for further use.

---

## Installation

1. Open VS Code.
2. Go to the Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X` on macOS).
3. Search for **BioDataHub**.
4. Click **Install**.

---

## Usage

### Commands

| Command                              | Description                              |
|--------------------------------------|------------------------------------------|
| `BioDataHub: Search Local Datasets`  | Search for datasets in your workspace.   |
| `BioDataHub: Search Online Datasets` | Search for datasets online.              |
| `BioDataHub: Download Dataset`       | Download datasets to your workspace.     |
| `BioDataHub: Preview CSV`            | Preview CSV files in a readable format.  |
| `BioDataHub: Generate Metadata`      | Generate metadata for datasets.          |
| `BioDataHub: Visualize Data`         | Create visualizations for your data.     |
| `BioDataHub: Export Data`            | Export processed data.                   |

### Context Menu

Right-click on any `.csv` file in the Explorer to access:

- **Preview CSV**
- **Generate Metadata**
- **Visualize Data**

---

## Views

### Activity Bar

- **BioDataHub**: Access the extension's features from the Activity Bar.
    - **Datasets View**: Manage and explore datasets.

---

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [VS Code](https://code.visualstudio.com/)

### Build and Test

1. Clone the repository:
     ```bash
     git clone https://github.com/mubashir1837/BioDataHub.git
     cd BioDataHub
     ```

2. Install dependencies:
     ```bash
     npm install
     ```

3. Compile the extension:
     ```bash
     npm run compile
     ```

4. Run tests:
     ```bash
     npm test
     ```

---

## Dependencies

- **[axios](https://github.com/axios/axios)**: HTTP client for fetching datasets.
- **[csv-parser](https://github.com/mafintosh/csv-parser)**: Parse CSV files.
- **[d3](https://d3js.org/)**: Data visualization library.
- **[minimatch](https://github.com/isaacs/minimatch)**: File matching utility.

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch:
     ```bash
     git checkout -b feature/your-feature
     ```
3. Commit your changes:
     ```bash
     git commit -m "Add your feature"
     ```
4. Push to your branch:
     ```bash
     git push origin feature/your-feature
     ```
5. Open a pull request.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## Contact

For questions or feedback, reach out to **Mubashir Ali** at [GitHub](https://github.com/mubashir1837).

---  
>>>>>>> ef28c94 (port)
