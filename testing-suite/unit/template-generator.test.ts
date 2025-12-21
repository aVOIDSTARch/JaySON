/**
 * Unit Tests for template-generator.ts
 */

import { describe, it, expect } from "vitest";
import { generateFromSchema } from "../../src/util/template-generator.js";
import type { JsonSchema } from "../../src/util/json-types.js";

describe("template-generator", () => {
    describe("generateFromSchema()", () => {
        it("should return empty array for array type schema", () => {
            const schema: JsonSchema = {
                type: "array",
                items: { type: "string" },
            };

            const result = generateFromSchema(schema);
            expect(result).toEqual([]);
        });

        it("should return empty object for non-object type without properties", () => {
            const schema: JsonSchema = {
                type: "string",
            };

            const result = generateFromSchema(schema);
            expect(result).toEqual({});
        });

        it("should generate object with string properties", () => {
            const schema: JsonSchema = {
                type: "object",
                properties: {
                    name: { type: "string" },
                    email: { type: "string" },
                },
            };

            const result = generateFromSchema(schema);
            expect(result).toEqual({ name: "", email: "" });
        });

        it("should generate object with number properties", () => {
            const schema: JsonSchema = {
                type: "object",
                properties: {
                    age: { type: "number" },
                    count: { type: "integer" },
                },
            };

            const result = generateFromSchema(schema);
            expect(result).toEqual({ age: 0, count: 0 });
        });

        it("should use minimum value for number when specified", () => {
            const schema: JsonSchema = {
                type: "object",
                properties: {
                    score: { type: "number", minimum: 10 },
                },
            };

            const result = generateFromSchema(schema);
            expect(result).toEqual({ score: 10 });
        });

        it("should generate object with boolean properties", () => {
            const schema: JsonSchema = {
                type: "object",
                properties: {
                    active: { type: "boolean" },
                },
            };

            const result = generateFromSchema(schema);
            expect(result).toEqual({ active: false });
        });

        it("should generate object with array properties", () => {
            const schema: JsonSchema = {
                type: "object",
                properties: {
                    tags: { type: "array" },
                },
            };

            const result = generateFromSchema(schema);
            expect(result).toEqual({ tags: [] });
        });

        it("should use default value when specified", () => {
            const schema: JsonSchema = {
                type: "object",
                properties: {
                    status: { type: "string", default: "pending" },
                    count: { type: "number", default: 100 },
                },
            };

            const result = generateFromSchema(schema);
            expect(result).toEqual({ status: "pending", count: 100 });
        });

        it("should use first enum value when specified", () => {
            const schema: JsonSchema = {
                type: "object",
                properties: {
                    role: { type: "string", enum: ["admin", "user", "guest"] },
                },
            };

            const result = generateFromSchema(schema);
            expect(result).toEqual({ role: "admin" });
        });

        it("should generate nested objects recursively", () => {
            const schema: JsonSchema = {
                type: "object",
                properties: {
                    user: {
                        type: "object",
                        properties: {
                            name: { type: "string" },
                            address: {
                                type: "object",
                                properties: {
                                    city: { type: "string" },
                                },
                            },
                        },
                    },
                },
            };

            const result = generateFromSchema(schema);
            expect(result).toEqual({
                user: {
                    name: "",
                    address: {
                        city: "",
                    },
                },
            });
        });

        it("should set null for unknown types", () => {
            const schema: JsonSchema = {
                type: "object",
                properties: {
                    unknown: {}, // No type specified
                },
            };

            const result = generateFromSchema(schema);
            expect(result).toEqual({ unknown: null });
        });

        it("should handle complex schema with mixed types", () => {
            const schema: JsonSchema = {
                type: "object",
                properties: {
                    id: { type: "integer", minimum: 1 },
                    name: { type: "string" },
                    active: { type: "boolean" },
                    tags: { type: "array" },
                    role: { type: "string", enum: ["admin", "user"] },
                    settings: {
                        type: "object",
                        properties: {
                            theme: { type: "string", default: "light" },
                        },
                    },
                },
            };

            const result = generateFromSchema(schema);
            expect(result).toEqual({
                id: 1,
                name: "",
                active: false,
                tags: [],
                role: "admin",
                settings: {
                    theme: "light",
                },
            });
        });
    });
});
