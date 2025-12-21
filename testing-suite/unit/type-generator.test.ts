/**
 * Unit Tests for type-generator.ts
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
    generateTypeScript,
    generateJavaScript,
    generateTypeScriptFile,
    generateJavaScriptFile,
    generateBoth,
} from "../../src/util/type-generator.js";
import type { JsonSchema } from "../../src/util/json-types.js";
import { TEMP_DIR, ensureDir } from "../utils/test-helpers.js";

describe("type-generator", () => {
    beforeEach(() => {
        ensureDir(TEMP_DIR);
    });

    afterEach(() => {
        // Clean up temp files
        if (fs.existsSync(TEMP_DIR)) {
            const files = fs.readdirSync(TEMP_DIR);
            for (const file of files) {
                const filePath = path.join(TEMP_DIR, file);
                if (fs.statSync(filePath).isDirectory()) {
                    fs.rmSync(filePath, { recursive: true });
                } else {
                    fs.unlinkSync(filePath);
                }
            }
        }
    });

    describe("generateTypeScript()", () => {
        it("should generate TypeScript interface from simple schema", () => {
            const schema: JsonSchema = {
                title: "User",
                type: "object",
                properties: {
                    id: { type: "integer" },
                    name: { type: "string" },
                },
                required: ["id"],
            };

            const result = generateTypeScript(schema);

            expect(result).toContain("export interface User");
            expect(result).toContain("id: number;");
            expect(result).toContain("name?: string;");
            expect(result).toContain("export default User");
        });

        it("should include file header comment", () => {
            const schema: JsonSchema = {
                title: "Test",
                type: "object",
                properties: {},
            };

            const result = generateTypeScript(schema);

            expect(result).toContain("Auto-generated TypeScript interface");
            expect(result).toContain("Generated:");
        });

        it("should generate enum types", () => {
            const schema: JsonSchema = {
                title: "Status",
                type: "object",
                properties: {
                    status: { type: "string", enum: ["active", "inactive", "pending"] },
                },
            };

            const result = generateTypeScript(schema);

            expect(result).toContain('"active" | "inactive" | "pending"');
        });

        it("should handle array types", () => {
            const schema: JsonSchema = {
                title: "Container",
                type: "object",
                properties: {
                    items: { type: "array", items: { type: "string" } },
                    numbers: { type: "array", items: { type: "number" } },
                },
            };

            const result = generateTypeScript(schema);

            expect(result).toContain("items?: string[];");
            expect(result).toContain("numbers?: number[];");
        });

        it("should include descriptions as JSDoc comments", () => {
            const schema: JsonSchema = {
                title: "Documented",
                description: "A documented type",
                type: "object",
                properties: {
                    field: { type: "string", description: "A field with description" },
                },
            };

            const result = generateTypeScript(schema, { includeDescriptions: true });

            expect(result).toContain("A documented type");
            expect(result).toContain("A field with description");
        });

        it("should use custom export name", () => {
            const schema: JsonSchema = {
                type: "object",
                properties: {},
            };

            const result = generateTypeScript(schema, { exportName: "CustomType" });

            expect(result).toContain("export interface CustomType");
        });

        it("should handle nested objects", () => {
            const schema: JsonSchema = {
                title: "Parent",
                type: "object",
                properties: {
                    child: {
                        type: "object",
                        properties: {
                            value: { type: "string" },
                        },
                    },
                },
            };

            const result = generateTypeScript(schema);

            expect(result).toContain("export interface ParentChild");
            expect(result).toContain("child?: ParentChild");
        });
    });

    describe("generateJavaScript()", () => {
        it("should generate JavaScript class from schema", () => {
            const schema: JsonSchema = {
                title: "User",
                type: "object",
                properties: {
                    id: { type: "integer" },
                    name: { type: "string" },
                },
                required: ["id"],
            };

            const result = generateJavaScript(schema);

            expect(result).toContain("class User");
            expect(result).toContain("constructor(data)");
            expect(result).toContain("export { User }");
            expect(result).toContain("export default User");
        });

        it("should include validate method", () => {
            const schema: JsonSchema = {
                title: "Validated",
                type: "object",
                properties: {
                    name: { type: "string", minLength: 3 },
                },
                required: ["name"],
            };

            const result = generateJavaScript(schema);

            expect(result).toContain("validate()");
            expect(result).toContain("var errors = [];");
            expect(result).toContain("return { valid:");
        });

        it("should include toJSON method", () => {
            const schema: JsonSchema = {
                title: "Serializable",
                type: "object",
                properties: {
                    value: { type: "string" },
                },
            };

            const result = generateJavaScript(schema);

            expect(result).toContain("toJSON()");
            expect(result).toContain("return {");
        });

        it("should include fromJSON static method", () => {
            const schema: JsonSchema = {
                title: "Deserializable",
                type: "object",
                properties: {},
            };

            const result = generateJavaScript(schema);

            expect(result).toContain("static fromJSON(json)");
            expect(result).toContain("return new Deserializable(json)");
        });

        it("should generate default values in constructor", () => {
            const schema: JsonSchema = {
                title: "Defaults",
                type: "object",
                properties: {
                    name: { type: "string" },
                    count: { type: "integer", default: 0 },
                    active: { type: "boolean" },
                },
            };

            const result = generateJavaScript(schema);

            expect(result).toContain('""'); // default string
            expect(result).toContain("false"); // default boolean
        });

        it("should use first enum value as default", () => {
            const schema: JsonSchema = {
                title: "EnumDefault",
                type: "object",
                properties: {
                    status: { type: "string", enum: ["pending", "active"] },
                },
            };

            const result = generateJavaScript(schema);

            expect(result).toContain('"pending"');
        });
    });

    describe("generateTypeScriptFile()", () => {
        it("should write TypeScript to file", () => {
            const schema: JsonSchema = {
                title: "FileTest",
                type: "object",
                properties: {
                    id: { type: "integer" },
                },
            };
            const outputPath = path.join(TEMP_DIR, "FileTest.ts");

            generateTypeScriptFile(schema, outputPath);

            expect(fs.existsSync(outputPath)).toBe(true);
            const content = fs.readFileSync(outputPath, "utf-8");
            expect(content).toContain("export interface FileTest");
        });

        it("should create directory if not exists", () => {
            const schema: JsonSchema = {
                title: "DirTest",
                type: "object",
                properties: {},
            };
            const outputPath = path.join(TEMP_DIR, "nested", "dir", "DirTest.ts");

            generateTypeScriptFile(schema, outputPath);

            expect(fs.existsSync(outputPath)).toBe(true);
        });
    });

    describe("generateJavaScriptFile()", () => {
        it("should write JavaScript to file", () => {
            const schema: JsonSchema = {
                title: "JSFileTest",
                type: "object",
                properties: {
                    name: { type: "string" },
                },
            };
            const outputPath = path.join(TEMP_DIR, "JSFileTest.js");

            generateJavaScriptFile(schema, outputPath);

            expect(fs.existsSync(outputPath)).toBe(true);
            const content = fs.readFileSync(outputPath, "utf-8");
            expect(content).toContain("class JSFileTest");
        });
    });

    describe("generateBoth()", () => {
        it("should generate both TypeScript and JavaScript files", () => {
            const schema: JsonSchema = {
                title: "BothTest",
                type: "object",
                properties: {
                    value: { type: "string" },
                },
            };
            const outputDir = path.join(TEMP_DIR, "both");

            const result = generateBoth(schema, outputDir, "BothTest");

            expect(result.tsPath).toContain("BothTest.ts");
            expect(result.jsPath).toContain("BothTest.js");
            expect(fs.existsSync(result.tsPath)).toBe(true);
            expect(fs.existsSync(result.jsPath)).toBe(true);
        });
    });
});
