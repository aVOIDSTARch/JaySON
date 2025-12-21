/**
 * Unit Tests for json-io.ts
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { readData, writeJson, mergeJsonFiles, splitJsonFile } from "../../src/util/json-io.js";
import { createTempFile, createTempDir, cleanupTemp, TEMP_DIR, ensureDir } from "../utils/test-helpers.js";

describe("json-io", () => {
    beforeEach(() => {
        ensureDir(TEMP_DIR);
    });

    // No afterEach cleanup - global setup.ts handles temp directory

    describe("readData()", () => {
        it("should read data from a JSON file", () => {
            const testData = { name: "Test", value: 42 };
            const filePath = createTempFile("test-read.json", testData);

            const result = readData({ type: "file", path: filePath });
            expect(result).toEqual(testData);
        });

        it("should throw error when file does not exist", () => {
            expect(() => {
                readData({ type: "file", path: "/nonexistent/path.json" });
            }).toThrow("File not found");
        });

        it("should throw error when path is not provided for file type", () => {
            expect(() => {
                readData({ type: "file" });
            }).toThrow("File path is required");
        });

        it("should return data directly for object type", () => {
            const testData = { name: "Direct", value: 100 };
            const result = readData({ type: "object", data: testData });
            expect(result).toEqual(testData);
        });

        it("should throw error when data is not provided for object type", () => {
            expect(() => {
                readData({ type: "object" });
            }).toThrow("Data is required");
        });

        it("should throw error for URL type (not implemented)", () => {
            expect(() => {
                readData({ type: "url", url: "https://example.com/data.json" });
            }).toThrow("URL data source not yet implemented");
        });

        it("should throw error for unknown data source type", () => {
            expect(() => {
                readData({ type: "unknown" as "file" });
            }).toThrow("Unknown data source type");
        });
    });

    describe("writeJson()", () => {
        it("should write JSON data to file with pretty print", () => {
            const testData = { name: "Test", value: 42 };
            const filePath = path.join(TEMP_DIR, "test-write.json");

            writeJson(testData, filePath, { prettyPrint: true, indentSize: 2 });

            const content = fs.readFileSync(filePath, "utf-8");
            expect(content).toContain('"name": "Test"');
            expect(content).toContain("\n"); // Pretty printed has newlines
        });

        it("should write JSON data without pretty print", () => {
            const testData = { name: "Test", value: 42 };
            const filePath = path.join(TEMP_DIR, "test-compact.json");

            writeJson(testData, filePath, { prettyPrint: false });

            const content = fs.readFileSync(filePath, "utf-8");
            expect(content).toBe('{"name":"Test","value":42}');
        });

        it("should include $schema when specified", () => {
            const testData = { name: "Test" };
            const filePath = path.join(TEMP_DIR, "test-schema.json");
            const schemaUrl = "http://json-schema.org/draft-07/schema#";

            writeJson(testData, filePath, { includeSchema: true, schemaUrl });

            const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
            expect(content.$schema).toBe(schemaUrl);
            expect(content.name).toBe("Test");
        });

        it("should create directory if it does not exist", () => {
            const testData = { test: true };
            const dirPath = path.join(TEMP_DIR, "new-dir", "nested");
            const filePath = path.join(dirPath, "test.json");

            writeJson(testData, filePath);

            expect(fs.existsSync(filePath)).toBe(true);
        });

        it("should use default indent size of 4", () => {
            const testData = { a: 1 };
            const filePath = path.join(TEMP_DIR, "test-indent.json");

            writeJson(testData, filePath);

            const content = fs.readFileSync(filePath, "utf-8");
            expect(content).toContain("    "); // 4 spaces
        });
    });

    describe("mergeJsonFiles()", () => {
        it("should merge multiple JSON files into one", () => {
            const file1 = createTempFile("merge1.json", [{ id: 1 }]);
            const file2 = createTempFile("merge2.json", [{ id: 2 }]);
            const outputPath = path.join(TEMP_DIR, "merged.json");

            mergeJsonFiles([file1, file2], outputPath);

            const result = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe(1);
            expect(result[1].id).toBe(2);
        });

        it("should merge single objects into array", () => {
            const file1 = createTempFile("obj1.json", { id: 1, name: "A" });
            const file2 = createTempFile("obj2.json", { id: 2, name: "B" });
            const outputPath = path.join(TEMP_DIR, "merged-objects.json");

            mergeJsonFiles([file1, file2], outputPath);

            const result = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
            expect(result).toHaveLength(2);
        });

        it("should skip non-existent files", () => {
            const file1 = createTempFile("exists.json", [{ id: 1 }]);
            const outputPath = path.join(TEMP_DIR, "merged-skip.json");

            mergeJsonFiles([file1, "/nonexistent.json"], outputPath);

            const result = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
            expect(result).toHaveLength(1);
        });
    });

    describe("splitJsonFile()", () => {
        it("should split JSON array by field value", () => {
            const data = [
                { id: 1, category: "A" },
                { id: 2, category: "B" },
                { id: 3, category: "A" },
            ];
            const inputPath = createTempFile("split-input.json", data);
            const outputDir = createTempDir("split-output");

            const files = splitJsonFile(inputPath, outputDir, "category", (cat) => `${cat}.json`);

            expect(files).toHaveLength(2);

            const catA = JSON.parse(fs.readFileSync(path.join(outputDir, "A.json"), "utf-8"));
            expect(catA).toHaveLength(2);

            const catB = JSON.parse(fs.readFileSync(path.join(outputDir, "B.json"), "utf-8"));
            expect(catB).toHaveLength(1);
        });

        it("should use 'unknown' for items without the split field", () => {
            const data = [
                { id: 1, category: "A" },
                { id: 2 }, // No category
            ];
            const inputPath = createTempFile("split-unknown.json", data);
            const outputDir = createTempDir("split-unknown-output");

            const files = splitJsonFile(inputPath, outputDir, "category", (cat) => `${cat}.json`);

            expect(files).toHaveLength(2);
            expect(fs.existsSync(path.join(outputDir, "unknown.json"))).toBe(true);
        });
    });
});
