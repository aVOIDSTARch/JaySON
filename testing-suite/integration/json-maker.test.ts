/**
 * Integration Tests for JsonMaker class
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { JsonMaker } from "../../src/index.js";
import {
    SCHEMAS_DIR,
    DATA_DIR,
    TEMP_DIR,
    ensureDir,
    createTempFile,
    createTempDir,
} from "../utils/test-helpers.js";

describe("JsonMaker Integration", () => {
    let maker: JsonMaker;

    beforeEach(() => {
        ensureDir(TEMP_DIR);
        maker = new JsonMaker(SCHEMAS_DIR);
    });

    // No afterEach cleanup - global setup.ts handles temp directory

    describe("Schema Loading and Validation", () => {
        it("should load schema and validate valid data", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const validUser = {
                id: 1,
                name: "John Doe",
                email: "john@example.com",
            };

            const result = maker.validate(validUser, schemaPath);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it("should load schema and reject invalid data", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const invalidUser = {
                id: "not-a-number",
                name: "",
            };

            const result = maker.validate(invalidUser, schemaPath);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });

        it("should validate file against schema", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const dataPath = path.join(DATA_DIR, "valid-user.json");

            const result = maker.validateFile(dataPath, schemaPath);

            expect(result.valid).toBe(true);
        });

        it("should reject invalid file against schema", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const dataPath = path.join(DATA_DIR, "invalid-user.json");

            const result = maker.validateFile(dataPath, schemaPath);

            expect(result.valid).toBe(false);
        });

        it("should return error for non-existent file", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");

            const result = maker.validateFile("/nonexistent.json", schemaPath);

            expect(result.valid).toBe(false);
            expect(result.errors[0].message).toContain("File not found");
        });

        it("should validate multiple files", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const files = [
                path.join(DATA_DIR, "valid-user.json"),
                path.join(DATA_DIR, "invalid-user.json"),
            ];

            const results = maker.validateFiles(files, schemaPath);

            expect(results.size).toBe(2);
            expect(results.get(files[0])?.valid).toBe(true);
            expect(results.get(files[1])?.valid).toBe(false);
        });
    });

    describe("Schema Info", () => {
        it("should get schema info", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");

            const info = maker.getSchemaInfo(schemaPath);

            expect(info.title).toBe("User");
            expect(info.rootType).toBe("object");
            expect(info.requiredFields).toContain("id");
            expect(info.requiredFields).toContain("name");
            expect(info.requiredFields).toContain("email");
        });
    });

    describe("Template Generation", () => {
        it("should generate template from schema", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");

            const template = maker.generateTemplate(schemaPath);

            expect(template).toHaveProperty("id");
            expect(template).toHaveProperty("name");
            expect(template).toHaveProperty("email");
        });
    });

    describe("JSON Read/Write", () => {
        it("should read and write JSON files", () => {
            const testData = { test: "value", number: 42 };
            const outputPath = path.join(TEMP_DIR, "test-output.json");

            maker.writeJson(testData, outputPath);
            const readData = maker.readData({ type: "file", path: outputPath });

            expect(readData).toEqual(testData);
        });

        it("should create validated JSON file", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const outputPath = path.join(TEMP_DIR, "validated-user.json");
            const validUser = {
                id: 1,
                name: "Test User",
                email: "test@example.com",
            };

            const result = maker.createValidatedJson(validUser, schemaPath, outputPath);

            expect(result.valid).toBe(true);
            expect(fs.existsSync(outputPath)).toBe(true);
        });

        it("should not create file if validation fails", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const outputPath = path.join(TEMP_DIR, "invalid-validated.json");
            const invalidUser = {
                id: "not-a-number",
            };

            const result = maker.createValidatedJson(invalidUser, schemaPath, outputPath);

            expect(result.valid).toBe(false);
            expect(fs.existsSync(outputPath)).toBe(false);
        });
    });

    describe("Data Transformation", () => {
        it("should extract fields from data", () => {
            const data = [
                { id: 1, name: "A", email: "a@test.com" },
                { id: 2, name: "B", email: "b@test.com" },
            ];

            const result = maker.extractFields(data, ["name", "email"]);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({ name: "A", email: "a@test.com" });
        });

        it("should transform data", () => {
            const data = [{ value: 1 }, { value: 2 }];

            const result = maker.transformData(data, (item) => ({
                ...item,
                doubled: item.value * 2,
            }));

            expect(result[0].doubled).toBe(2);
            expect(result[1].doubled).toBe(4);
        });

        it("should filter data", () => {
            const data = [
                { id: 1, active: true },
                { id: 2, active: false },
                { id: 3, active: true },
            ];

            const result = maker.filterData(data, (item) => item.active);

            expect(result).toHaveLength(2);
        });
    });

    describe("File Operations", () => {
        it("should merge JSON files", () => {
            const file1 = createTempFile("merge1.json", [{ id: 1 }]);
            const file2 = createTempFile("merge2.json", [{ id: 2 }]);
            const outputPath = path.join(TEMP_DIR, "merged.json");

            maker.mergeJsonFiles([file1, file2], outputPath);

            const result = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
            expect(result).toHaveLength(2);
        });

        it("should split JSON file by field", () => {
            const data = [
                { id: 1, type: "A" },
                { id: 2, type: "B" },
                { id: 3, type: "A" },
            ];
            const inputPath = createTempFile("split-input.json", data);
            const outputDir = createTempDir("split-output");

            const files = maker.splitJsonFile(inputPath, outputDir, "type", (t) => `${t}.json`);

            expect(files).toHaveLength(2);
        });
    });

    describe("Report Generation", () => {
        it("should format validation report for terminal", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const invalidUser = { id: "bad", name: "" };
            const result = maker.validate(invalidUser, schemaPath);

            const report = maker.formatReport(result, "terminal");

            expect(report).toContain("INVALID");
            expect(report).toContain("error");
        });

        it("should format validation report for markdown", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const validUser = { id: 1, name: "Test", email: "test@example.com" };
            const result = maker.validate(validUser, schemaPath);

            const report = maker.formatReport(result, "markdown");

            expect(report).toContain("# Validation Report");
            expect(report).toContain("VALID");
        });

        it("should generate report file", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const validUser = { id: 1, name: "Test", email: "test@example.com" };
            const result = maker.validate(validUser, schemaPath);
            const outputPath = path.join(TEMP_DIR, "report.html");

            maker.generateReport(result, outputPath, { format: "html" });

            expect(fs.existsSync(outputPath)).toBe(true);
            const content = fs.readFileSync(outputPath, "utf-8");
            expect(content).toContain("<!DOCTYPE html>");
        });

        it("should generate all format reports", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const validUser = { id: 1, name: "Test", email: "test@example.com" };
            const result = maker.validate(validUser, schemaPath);
            const outputDir = createTempDir("all-reports");

            const files = maker.generateAllFormats(result, outputDir, "report");

            expect(files).toHaveLength(3);
            expect(files.some((f) => f.endsWith(".txt"))).toBe(true);
            expect(files.some((f) => f.endsWith(".md"))).toBe(true);
            expect(files.some((f) => f.endsWith(".html"))).toBe(true);
        });
    });

    describe("Type Generation", () => {
        it("should generate TypeScript from schema", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");

            const typescript = maker.generateTypeScript(schemaPath);

            expect(typescript).toContain("export interface User");
            expect(typescript).toContain("id: number");
            expect(typescript).toContain("name: string");
        });

        it("should generate JavaScript from schema", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");

            const javascript = maker.generateJavaScript(schemaPath);

            expect(javascript).toContain("class User");
            expect(javascript).toContain("constructor(data)");
        });

        it("should generate both TypeScript and JavaScript files", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const outputDir = createTempDir("generated-types");

            const { tsPath, jsPath } = maker.generateTypes(schemaPath, outputDir, "User");

            expect(fs.existsSync(tsPath)).toBe(true);
            expect(fs.existsSync(jsPath)).toBe(true);
        });
    });
});
