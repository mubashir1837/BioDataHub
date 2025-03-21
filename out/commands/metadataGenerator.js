"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatFileSize = exports.generateMetadata = void 0;
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
/**
 * Generate metadata for a dataset file
 */
async function generateMetadata(uri) {
    return new Promise((resolve, reject) => {
        const filePath = uri.fsPath;
        const fileName = path.basename(filePath);
        const fileStats = fs.statSync(filePath);
        const metadata = {
            fileName,
            filePath,
            fileSize: fileStats.size,
            modifiedDate: fileStats.mtime,
            rowCount: 0,
            columns: [],
            sampleData: {},
            dataTypes: {},
            uniqueValues: {},
            missingValues: {},
            minValues: {},
            maxValues: {},
            meanValues: {},
        };
        let rowCount = 0;
        const uniqueValues = {};
        const numericValues = {};
        const missingValues = {};
        fs.createReadStream(filePath)
            .pipe(csv())
            .on("headers", (headers) => {
            metadata.columns = headers;
            // Initialize tracking objects
            headers.forEach((header) => {
                uniqueValues[header] = new Set();
                numericValues[header] = [];
                missingValues[header] = 0;
                metadata.sampleData[header] = [];
            });
        })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .on("data", (row) => {
            rowCount++;
            // Process only the first 1000 rows for performance
            if (rowCount <= 1000) {
                metadata.columns.forEach((column) => {
                    const value = row[column];
                    // Track unique values
                    uniqueValues[column].add(value);
                    // Track missing values
                    if (value === undefined || value === null || value === "") {
                        missingValues[column]++;
                    }
                    // Track numeric values for statistics
                    const numValue = Number(value);
                    if (!isNaN(numValue)) {
                        numericValues[column].push(numValue);
                    }
                    // Collect sample data (first 5 rows)
                    if (rowCount <= 5) {
                        metadata.sampleData[column].push(value);
                    }
                });
            }
        })
            .on("end", () => {
            metadata.rowCount = rowCount;
            // Calculate statistics
            metadata.columns.forEach((column) => {
                // Determine data type
                metadata.dataTypes[column] = determineDataType(numericValues[column], uniqueValues[column]);
                // Count unique values
                metadata.uniqueValues[column] = uniqueValues[column].size;
                // Count missing values
                metadata.missingValues[column] = missingValues[column];
                // Calculate min, max, mean for numeric columns
                if (numericValues[column].length > 0) {
                    metadata.minValues[column] = Math.min(...numericValues[column]);
                    metadata.maxValues[column] = Math.max(...numericValues[column]);
                    metadata.meanValues[column] = calculateMean(numericValues[column]);
                }
            });
            resolve(metadata);
        })
            .on("error", (error) => {
            reject(error);
        });
    });
}
exports.generateMetadata = generateMetadata;
/**
 * Determine the data type of a column
 */
function determineDataType(numericValues, uniqueValues) {
    // If all values are numeric
    if (numericValues.length > 0 && numericValues.length === uniqueValues.size) {
        // Check if all values are integers
        const allIntegers = numericValues.every((num) => Number.isInteger(num));
        return allIntegers ? "Integer" : "Float";
    }
    // Check for boolean
    if (uniqueValues.size <= 2) {
        const values = Array.from(uniqueValues);
        const booleanPairs = [
            ["true", "false"],
            ["yes", "no"],
            ["1", "0"],
            ["t", "f"],
        ];
        // Check if values match any boolean pair
        if (values.length <= 2) {
            for (const pair of booleanPairs) {
                const lowerValues = values.map((v) => v.toLowerCase());
                if (pair.every((p) => lowerValues.includes(p.toLowerCase()))) {
                    return "Boolean";
                }
            }
        }
    }
    // Check for date
    const datePattern = /^\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{2}-\d{2}-\d{4}$/;
    const sampleValues = Array.from(uniqueValues).slice(0, 5);
    if (sampleValues.length > 0 && sampleValues.every((value) => datePattern.test(value))) {
        return "Date";
    }
    // Check for sequence data (DNA, RNA, protein)
    const dnaPattern = /^[ATGCNatgcn]+$/;
    const rnaPattern = /^[AUGCNaugcn]+$/;
    const proteinPattern = /^[ACDEFGHIKLMNPQRSTVWY]+$/i;
    if (sampleValues.length > 0) {
        if (sampleValues.every((value) => dnaPattern.test(value))) {
            return "DNA Sequence";
        }
        if (sampleValues.every((value) => rnaPattern.test(value))) {
            return "RNA Sequence";
        }
        if (sampleValues.every((value) => proteinPattern.test(value))) {
            return "Protein Sequence";
        }
    }
    // Default to string
    return "String";
}
/**
 * Calculate the mean of an array of numbers
 */
function calculateMean(values) {
    if (values.length === 0) {
        return 0;
    }
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
}
/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes) {
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
}
exports.formatFileSize = formatFileSize;
//# sourceMappingURL=metadataGenerator.js.map