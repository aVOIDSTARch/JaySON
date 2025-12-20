/**
 * JSON I/O - Read and write JSON files
 */

import * as fs from "fs";
import * as path from "path";
import type { DataSourceConfig, WriteOptions } from "./json-types.js";

/**
 * Read data from a source
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
 * Write data to a JSON file
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

    if (includeSchema && schemaUrl && typeof data === "object" && data !== null) {
        outputData = {
            $schema: schemaUrl,
            ...data,
        };
    }

    const content = prettyPrint
        ? JSON.stringify(outputData, null, indentSize)
        : JSON.stringify(outputData);

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, content, "utf-8");
}

/**
 * Merge multiple JSON files into one
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
 * Split a JSON array into multiple files
 */
export function splitJsonFile(
    inputPath: string,
    outputDir: string,
    splitBy: string,
    fileNamePattern: (value: string) => string
): string[] {
    const data = readData({ type: "file", path: inputPath }) as Record<string, unknown>[];
    const groups = new Map<string, Record<string, unknown>[]>();

    for (const item of data) {
        const key = String(item[splitBy] || "unknown");
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(item);
    }

    const createdFiles: string[] = [];

    groups.forEach((items, key) => {
        const fileName = fileNamePattern(key);
        const filePath = path.join(outputDir, fileName);
        writeJson(items, filePath);
        createdFiles.push(filePath);
    });

    return createdFiles;
}
