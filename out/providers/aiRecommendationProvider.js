"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIRecommendationProvider = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
class AIRecommendationProvider {
    constructor() {
        // Simple in-memory database of dataset metadata for recommendations
        this.datasetIndex = [];
        this.isIndexing = false;
        // Initialize the dataset index
        this.buildDatasetIndex();
    }
    async showRecommendationInterface() {
        if (this.isIndexing) {
            vscode.window.showInformationMessage("Still indexing datasets. Please try again in a moment.");
            return;
        }
        if (this.datasetIndex.length === 0) {
            const rebuildIndex = await vscode.window.showInformationMessage("No datasets have been indexed yet. Would you like to index your workspace now?", "Yes", "No");
            if (rebuildIndex === "Yes") {
                await this.buildDatasetIndex();
            }
            return;
        }
        const query = await vscode.window.showInputBox({
            placeHolder: 'Describe what you\'re looking for (e.g., "gene expression data" or "protein sequences")',
            prompt: "AI-Powered Dataset Recommendation",
        });
        if (query) {
            await this.getRecommendations(query);
        }
    }
    async buildDatasetIndex() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showInformationMessage("No workspace folder is open.");
            return;
        }
        this.isIndexing = true;
        this.datasetIndex = [];
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Indexing CSV datasets for AI recommendations",
            cancellable: true,
        }, async (progress, token) => {
            progress.report({ increment: 0 });
            const filesProcessed = 0;
            const maxFiles = 100; // Limit to prevent performance issues
            for (const folder of workspaceFolders) {
                if (token.isCancellationRequested || filesProcessed >= maxFiles) {
                    break;
                }
                await this.indexFolder(folder.uri.fsPath, progress, token, maxFiles, filesProcessed);
            }
            this.isIndexing = false;
            vscode.window.showInformationMessage(`Indexed ${this.datasetIndex.length} datasets for recommendations.`);
        });
    }
    async indexFolder(folderPath, progress, token, maxFiles, filesProcessed) {
        try {
            const files = fs.readdirSync(folderPath);
            for (const file of files) {
                if (token.isCancellationRequested || filesProcessed >= maxFiles) {
                    return filesProcessed;
                }
                const filePath = path.join(folderPath, file);
                const stats = fs.statSync(filePath);
                if (stats.isDirectory()) {
                    // Recursively index subdirectories
                    filesProcessed = await this.indexFolder(filePath, progress, token, maxFiles, filesProcessed);
                }
                else if (stats.isFile() && path.extname(file).toLowerCase() === ".csv") {
                    // Index CSV file
                    try {
                        const metadata = await this.extractMetadata(filePath);
                        this.datasetIndex.push(metadata);
                        filesProcessed++;
                        // Update progress
                        progress.report({
                            increment: 100 / maxFiles,
                            message: `Indexed ${filesProcessed} files`,
                        });
                    }
                    catch (err) {
                        console.error(`Error indexing file ${filePath}:`, err);
                    }
                }
            }
            return filesProcessed;
        }
        catch (err) {
            console.error(`Error reading folder ${folderPath}:`, err);
            return filesProcessed;
        }
    }
    async extractMetadata(filePath) {
        return new Promise((resolve, reject) => {
            const fileName = path.basename(filePath);
            const metadata = {
                fileName,
                filePath,
                columns: [],
                sampleData: "",
                keywords: [],
            };
            let rowCount = 0;
            let sampleText = "";
            fs.createReadStream(filePath)
                .pipe(csv())
                .on("headers", (headers) => {
                metadata.columns = headers;
                // Extract keywords from column names
                metadata.keywords = this.extractKeywords(headers.join(" "));
            })
                .on("data", (row) => {
                rowCount++;
                // Only process first 10 rows for the sample
                if (rowCount <= 10) {
                    // Add some sample data
                    const rowText = Object.values(row).join(" ");
                    sampleText += " " + rowText;
                    // Extract keywords from data
                    if (rowCount <= 3) {
                        metadata.keywords = [...metadata.keywords, ...this.extractKeywords(rowText)];
                    }
                }
            })
                .on("end", () => {
                // Store sample data
                metadata.sampleData = sampleText.substring(0, 1000); // Limit sample size
                // Remove duplicates from keywords
                metadata.keywords = [...new Set(metadata.keywords)];
                resolve(metadata);
            })
                .on("error", (error) => {
                reject(error);
            });
        });
    }
    extractKeywords(text) {
        // This is a simple keyword extraction implementation
        // In a real-world scenario, you might use NLP libraries or ML models
        // Convert to lowercase and remove special characters
        const cleanText = text.toLowerCase().replace(/[^\w\s]/g, " ");
        // Split into words
        const words = cleanText.split(/\s+/).filter((word) => word.length > 2);
        // Filter out common stop words
        const stopWords = new Set([
            "the",
            "and",
            "or",
            "in",
            "on",
            "at",
            "to",
            "for",
            "with",
            "by",
            "about",
            "from",
            "as",
            "an",
            "is",
            "was",
            "were",
            "are",
            "be",
            "been",
            "being",
            "have",
            "has",
            "had",
            "do",
            "does",
            "did",
            "but",
            "if",
            "then",
            "else",
            "when",
            "where",
            "why",
            "how",
            "all",
            "any",
            "both",
            "each",
            "few",
            "more",
            "most",
            "some",
            "such",
            "no",
            "nor",
            "not",
            "only",
            "own",
            "same",
            "so",
            "than",
            "too",
            "very",
            "can",
            "will",
            "just",
            "should",
            "now",
        ]);
        return words.filter((word) => !stopWords.has(word));
    }
    async getRecommendations(query) {
        // Extract keywords from the query
        const queryKeywords = this.extractKeywords(query);
        if (queryKeywords.length === 0) {
            vscode.window.showInformationMessage("Please provide a more specific query with relevant keywords.");
            return;
        }
        // Score each dataset based on keyword matches
        const scoredDatasets = this.datasetIndex.map((dataset) => {
            const score = this.calculateRelevanceScore(dataset, queryKeywords);
            return { dataset, score };
        });
        // Sort by score (descending)
        scoredDatasets.sort((a, b) => b.score - a.score);
        // Take top 5 recommendations
        const recommendations = scoredDatasets.slice(0, 5);
        if (recommendations.length === 0 || recommendations[0].score === 0) {
            vscode.window.showInformationMessage("No relevant datasets found. Try a different query.");
            return;
        }
        // Show recommendations to the user
        const items = recommendations.map((rec) => ({
            label: rec.dataset.fileName,
            description: `Relevance: ${Math.round(rec.score * 100)}%`,
            detail: `Columns: ${rec.dataset.columns.slice(0, 5).join(", ")}${rec.dataset.columns.length > 5 ? "..." : ""}`,
            dataset: rec.dataset,
        }));
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: "Recommended datasets based on your query",
            matchOnDescription: true,
            matchOnDetail: true,
        });
        if (selected) {
            // Open the selected dataset
            vscode.commands.executeCommand("biodatahub.previewCSV", vscode.Uri.file(selected.dataset.filePath));
        }
    }
    calculateRelevanceScore(dataset, queryKeywords) {
        if (queryKeywords.length === 0 || dataset.keywords.length === 0) {
            return 0;
        }
        // Count matching keywords
        let matchCount = 0;
        for (const queryKeyword of queryKeywords) {
            // Check for exact matches
            if (dataset.keywords.includes(queryKeyword)) {
                matchCount += 2; // Give higher weight to exact matches
                continue;
            }
            // Check for partial matches
            for (const datasetKeyword of dataset.keywords) {
                if (datasetKeyword.includes(queryKeyword) || queryKeyword.includes(datasetKeyword)) {
                    matchCount += 1;
                    break;
                }
            }
        }
        // Calculate score as a value between 0 and 1
        const maxPossibleMatches = queryKeywords.length * 2; // Maximum possible score
        return matchCount / maxPossibleMatches;
    }
}
exports.AIRecommendationProvider = AIRecommendationProvider;
//# sourceMappingURL=aiRecommendationProvider.js.map