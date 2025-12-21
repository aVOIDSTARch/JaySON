/**
 * @fileoverview JSON I/O - Read and write JSON files
 * @module util/json-io
 * @description Provides functions for reading JSON data from various sources
 * (files, objects, URLs) and writing JSON data to files with formatting options.
 * Also includes utilities for merging and splitting JSON files.
 */

import * as fs from "fs";
import * as path from "path";
import type { DataSourceConfig, WriteOptions } from "./json-types.js";

/**
 * Reads data from a configured data source.
 * Supports reading from files, in-memory objects, and URLs.
 *
 * @param {DataSourceConfig} config - Configuration specifying the data source
 * @returns {unknown} The parsed JSON data
 * @throws {Error} If file path is missing for file source
 * @throws {Error} If file is not found
 * @throws {Error} If data is missing for object source
 * @throws {Error} If URL source is used (not yet implemented)
 * @throws {Error} If unknown data source type is specified
 *
 * @example
 * // Read from file
 * const fileData = readData({ type: "file", path: "./data.json" });
 *
 * // Read from object
 * const objData = readData({ type: "object", data: { id: 1, name: "Test" } });
 */
export function readData(config: DataSourceConfig): unknown {
    switch (config.type) {
        case "file":
            if (!config.path) {
                throw new Error("File path is required for file data source");
            }
            if (!fs.existsSync(config.path)) {
                throw new Error(`File not found: ${config.path}`);
            }
            return JSON.parse(fs.readFileSync(config.path, "utf-8"));

        case "object":
            if (config.data === undefined) {
                throw new Error("Data is required for object data source");
            }
            return config.data;

        case "url":
            throw new Error(
                "URL data source not yet implemented - use WebFetch tool"
            );

        default:
            throw new Error(`Unknown data source type: ${config.type}`);
    }
}

/**
 * Writes data to a JSON file with optional formatting.
 * Creates parent directories if they don't exist.
 *
 * @param {unknown} data - The data to write (must be JSON-serializable)
 * @param {string} outputPath - The file path to write to
 * @param {WriteOptions} [options={}] - Formatting and schema options
 * @param {boolean} [options.prettyPrint=true] - Whether to format with indentation
 * @param {number} [options.indentSize=4] - Number of spaces for indentation
 * @param {boolean} [options.includeSchema=false] - Whether to add $schema property
 * @param {string} [options.schemaUrl] - URL of the schema to include
 * @returns {void}
 *
 * @example
 * // Write with default formatting (pretty print, 4 spaces)
 * writeJson({ name: "John", age: 30 }, "./output.json");
 *
 * // Write minified
 * writeJson(data, "./output.json", { prettyPrint: false });
 *
 * // Write with schema reference
 * writeJson(data, "./output.json", {
 *   includeSchema: true,
 *   schemaUrl: "https://example.com/schema.json"
 * });
 */
export function writeJson(
    data: unknown,
    outputPath: string,
    options: WriteOptions = {}
): void {
    const {
        prettyPrint = true,
        indentSize = 4,
        includeSchema = false,
        schemaUrl,
    } = options;

    let outputData = data;

    // Add $schema property if requested
    if (includeSchema && schemaUrl && typeof data === "object" && data !== null) {
        outputData = {
            $schema: schemaUrl,
            ...data,
        };
    }

    const content = prettyPrint
        ? JSON.stringify(outputData, null, indentSize)
        : JSON.stringify(outputData);

    // Ensure parent directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, content, "utf-8");
}

/**
 * Merges multiple JSON files into a single output file.
 * Arrays are flattened, objects are added as array elements.
 * Non-existent files are silently skipped.
 *
 * @param {string[]} filePaths - Array of file paths to merge
 * @param {string} outputPath - The output file path
 * @returns {void}
 *
 * @example
 * // Merge user data from multiple files
 * mergeJsonFiles(
 *   ["./users-1.json", "./users-2.json", "./users-3.json"],
 *   "./all-users.json"
 * );
 */
export function mergeJsonFiles(filePaths: string[], outputPath: string): void {
    const merged: unknown[] = [];

    for (const filePath of filePaths) {
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, "utf-8");
            const data = JSON.parse(content);
            if (Array.isArray(data)) {
                merged.push(...data);
            } else {
                merged.push(data);
            }
        }
    }

    writeJson(merged, outputPath);
}

/**
 * Splits a JSON array file into multiple files based on a field value.
 * Each unique value of the split field creates a separate output file.
 *
 * @param {string} inputPath - Path to the input JSON file (must contain an array)
 * @param {string} outputDir - Directory to write output files
 * @param {string} splitBy - The field name to split by
 * @param {(value: string) => string} fileNamePattern - Function to generate file names from field values
 * @returns {string[]} Array of created file paths
 *
 * @example
 * // Split users by role into separate files
 * const files = splitJsonFile(
 *   "./users.json",
 *   "./output",
 *   "role",
 *   (role) => `users-${role}.json`
 * );
 * // Creates: ./output/users-admin.json, ./output/users-user.json, etc.
 */
export function splitJsonFile(
    inputPath: string,
    outputDir: string,
    splitBy: string,
    fileNamePattern: (value: string) => string
): string[] {
    const data = readData({ type: "file", path: inputPath }) as Record<string, unknown>[];
    const groups = new Map<string, Record<string, unknown>[]>();

    // Group items by the split field value
    for (const item of data) {
        const key = String(item[splitBy] || "unknown");
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(item);
    }

    const createdFiles: string[] = [];

    // Write each group to a separate file
    groups.forEach((items, key) => {
        const fileName = fileNamePattern(key);
        const filePath = path.join(outputDir, fileName);
        writeJson(items, filePath);
        createdFiles.push(filePath);
    });

    return createdFiles;
}
