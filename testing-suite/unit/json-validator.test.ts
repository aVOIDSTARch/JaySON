/**
 * Unit Tests for json-validator.ts
 */

import { describe, it, expect, beforeEach } from "vitest";
import { validate, validateValue } from "../../src/util/json-validator.js";
import type { JsonSchema } from "../../src/util/json-types.js";

describe("json-validator", () => {
    describe("validate()", () => {
        describe("type validation", () => {
            it("should validate string type correctly", () => {
                const schema: JsonSchema = {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                    },
                };

                expect(validate({ name: "John" }, schema).valid).toBe(true);
                expect(validate({ name: 123 }, schema).valid).toBe(false);
            });

            it("should validate number type correctly", () => {
                const schema: JsonSchema = {
                    type: "object",
                    properties: {
                        age: { type: "number" },
                    },
                };

                // Note: getValueType() returns "integer" for whole numbers
                // so only floats match "number" type
                expect(validate({ age: 25.5 }, schema).valid).toBe(true);
                expect(validate({ age: 3.14 }, schema).valid).toBe(true);
                expect(validate({ age: "25" }, schema).valid).toBe(false);
            });

            it("should validate integer type correctly", () => {
                const schema: JsonSchema = {
                    type: "object",
                    properties: {
                        count: { type: "integer" },
                    },
                };

                expect(validate({ count: 10 }, schema).valid).toBe(true);
                expect(validate({ count: 10.5 }, schema).valid).toBe(false);
            });

            it("should validate boolean type correctly", () => {
                const schema: JsonSchema = {
                    type: "object",
                    properties: {
                        active: { type: "boolean" },
                    },
                };

                expect(validate({ active: true }, schema).valid).toBe(true);
                expect(validate({ active: false }, schema).valid).toBe(true);
                expect(validate({ active: "true" }, schema).valid).toBe(false);
            });

            it("should validate null type correctly", () => {
                const schema: JsonSchema = {
                    type: "object",
                    properties: {
                        nullable: { type: "null" },
                    },
                };

                expect(validate({ nullable: null }, schema).valid).toBe(true);
                expect(validate({ nullable: undefined }, schema).valid).toBe(false);
            });

            it("should validate array type correctly", () => {
                const schema: JsonSchema = {
                    type: "object",
                    properties: {
                        items: { type: "array" },
                    },
                };

                expect(validate({ items: [] }, schema).valid).toBe(true);
                expect(validate({ items: [1, 2, 3] }, schema).valid).toBe(true);
                expect(validate({ items: "not-array" }, schema).valid).toBe(false);
            });

            it("should validate object type correctly", () => {
                const schema: JsonSchema = {
                    type: "object",
                    properties: {
                        data: { type: "object" },
                    },
                };

                expect(validate({ data: {} }, schema).valid).toBe(true);
                expect(validate({ data: { key: "value" } }, schema).valid).toBe(true);
                expect(validate({ data: [] }, schema).valid).toBe(false);
            });
        });

        describe("required fields", () => {
            it("should fail when required field is missing", () => {
                const schema: JsonSchema = {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                        name: { type: "string" },
                    },
                    required: ["id", "name"],
                };

                const result = validate({ id: 1 }, schema);
                expect(result.valid).toBe(false);
                expect(result.errors).toHaveLength(1);
                expect(result.errors[0].message).toBe("Required field missing");
                expect(result.errors[0].path).toBe("name");
            });

            it("should pass when all required fields are present", () => {
                const schema: JsonSchema = {
                    type: "object",
                    properties: {
                        id: { type: "integer" },
                        name: { type: "string" },
                    },
                    required: ["id", "name"],
                };

                const result = validate({ id: 1, name: "Test" }, schema);
                expect(result.valid).toBe(true);
            });
        });

        describe("enum validation", () => {
            it("should validate enum values correctly", () => {
                const schema: JsonSchema = {
                    type: "object",
                    properties: {
                        status: { type: "string", enum: ["active", "inactive", "pending"] },
                    },
                };

                expect(validate({ status: "active" }, schema).valid).toBe(true);
                expect(validate({ status: "invalid" }, schema).valid).toBe(false);
            });
        });

        describe("string constraints", () => {
            it("should validate minLength", () => {
                const schema: JsonSchema = {
                    type: "object",
                    properties: {
                        name: { type: "string", minLength: 3 },
                    },
                };

                expect(validate({ name: "John" }, schema).valid).toBe(true);
                expect(validate({ name: "Jo" }, schema).valid).toBe(false);
            });

            it("should validate maxLength", () => {
                const schema: JsonSchema = {
                    type: "object",
                    properties: {
                        code: { type: "string", maxLength: 5 },
                    },
                };

                expect(validate({ code: "ABC" }, schema).valid).toBe(true);
                expect(validate({ code: "ABCDEFG" }, schema).valid).toBe(false);
            });

            it("should validate pattern", () => {
                const schema: JsonSchema = {
                    type: "object",
                    properties: {
                        email: { type: "string", pattern: "^[a-z]+@[a-z]+\\.[a-z]+$" },
                    },
                };

                expect(validate({ email: "test@example.com" }, schema).valid).toBe(true);
                expect(validate({ email: "invalid" }, schema).valid).toBe(false);
            });
        });

        describe("number constraints", () => {
            it("should validate minimum", () => {
                const schema: JsonSchema = {
                    type: "object",
                    properties: {
                        age: { type: "integer", minimum: 0 },
                    },
                };

                expect(validate({ age: 0 }, schema).valid).toBe(true);
                expect(validate({ age: 25 }, schema).valid).toBe(true);
                expect(validate({ age: -1 }, schema).valid).toBe(false);
            });

            it("should validate maximum", () => {
                const schema: JsonSchema = {
                    type: "object",
                    properties: {
                        score: { type: "integer", maximum: 100 },
                    },
                };

                expect(validate({ score: 100 }, schema).valid).toBe(true);
                expect(validate({ score: 50 }, schema).valid).toBe(true);
                expect(validate({ score: 101 }, schema).valid).toBe(false);
            });
        });

        describe("nested objects", () => {
            it("should validate nested object properties", () => {
                const schema: JsonSchema = {
                    type: "object",
                    properties: {
                        address: {
                            type: "object",
                            properties: {
                                city: { type: "string" },
                                zip: { type: "string" },
                            },
                            required: ["city"],
                        },
                    },
                };

                expect(validate({ address: { city: "NYC", zip: "10001" } }, schema).valid).toBe(true);
                expect(validate({ address: { zip: "10001" } }, schema).valid).toBe(false);
            });
        });

        describe("array items", () => {
            it("should validate array item types", () => {
                const schema: JsonSchema = {
                    type: "object",
                    properties: {
                        tags: {
                            type: "array",
                            items: { type: "string" },
                        },
                    },
                };

                expect(validate({ tags: ["a", "b", "c"] }, schema).valid).toBe(true);
                expect(validate({ tags: ["a", 1, "c"] }, schema).valid).toBe(false);
            });
        });

        describe("combinators", () => {
            it("should validate oneOf", () => {
                const schema: JsonSchema = {
                    type: "object",
                    properties: {
                        value: {
                            // Use "integer" since getValueType() returns "integer" for whole numbers
                            oneOf: [{ type: "string" }, { type: "integer" }],
                        },
                    },
                };

                expect(validate({ value: "test" }, schema).valid).toBe(true);
                expect(validate({ value: 123 }, schema).valid).toBe(true);
                expect(validate({ value: true }, schema).valid).toBe(false);
            });

            it("should validate anyOf", () => {
                const schema: JsonSchema = {
                    type: "object",
                    properties: {
                        value: {
                            // Use "integer" since getValueType() returns "integer" for whole numbers
                            anyOf: [{ type: "string", minLength: 3 }, { type: "integer", minimum: 10 }],
                        },
                    },
                };

                expect(validate({ value: "hello" }, schema).valid).toBe(true);
                expect(validate({ value: 15 }, schema).valid).toBe(true);
            });
        });

        describe("error messages", () => {
            it("should include path in error messages", () => {
                const schema: JsonSchema = {
                    type: "object",
                    properties: {
                        user: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                            },
                        },
                    },
                };

                const result = validate({ user: { name: 123 } }, schema);
                expect(result.valid).toBe(false);
                expect(result.errors[0].path).toContain("user.name");
            });
        });
    });
});
