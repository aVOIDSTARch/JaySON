/**
 * Unit Tests for json-validator.ts
 */

import { describe, it, expect } from "vitest";
import {
    validate,
    validateValue,
    compile,
    validateAsync,
    pathToInstancePointer,
} from "../../src/util/json-validator.js";
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

            it("should validate allOf", () => {
                const schema: JsonSchema = {
                    type: "object",
                    properties: {
                        value: {
                            allOf: [
                                { type: "string" },
                                { minLength: 2 },
                            ],
                        },
                    },
                };

                expect(validate({ value: "ab" }, schema).valid).toBe(true);
                expect(validate({ value: "a" }, schema).valid).toBe(false);
                expect(validate({ value: 123 }, schema).valid).toBe(false);
            });

            it("should fail explicitly for $ref (not yet supported)", () => {
                const schema: JsonSchema = {
                    type: "object",
                    properties: {
                        ref: { $ref: "#/definitions/Foo" },
                    },
                };

                const result = validate({ ref: "anything" }, schema);
                expect(result.valid).toBe(false);
                expect(result.errors[0].message).toContain("$ref not yet supported");
                expect(result.errors[0].message).toContain("#/definitions/Foo");
            });
        });

        describe("additionalProperties", () => {
            it("should reject additional properties when additionalProperties is false", () => {
                const schema: JsonSchema = {
                    type: "object",
                    properties: { name: { type: "string" } },
                    additionalProperties: false,
                };

                expect(validate({ name: "John" }, schema).valid).toBe(true);
                const result = validate({ name: "John", extra: "value" }, schema);
                expect(result.valid).toBe(false);
                expect(result.errors[0].message).toContain("Additional property");
                expect(result.errors[0].path).toBe("extra");
            });

            it("should allow additional properties when additionalProperties is true or undefined", () => {
                const schema: JsonSchema = {
                    type: "object",
                    properties: { name: { type: "string" } },
                    additionalProperties: true,
                };

                expect(validate({ name: "John", extra: "value" }, schema).valid).toBe(true);
            });
        });

        describe("format validation (opt-in)", () => {
            it("should validate format when validateFormat option is true", () => {
                const schema: JsonSchema = {
                    type: "object",
                    properties: {
                        email: { type: "string", format: "email" },
                        uri: { type: "string", format: "uri" },
                        uuid: { type: "string", format: "uuid" },
                    },
                };

                expect(
                    validate(
                        { email: "a@b.co", uri: "https://x.com", uuid: "550e8400-e29b-41d4-a716-446655440000" },
                        schema,
                        { validateFormat: true }
                    ).valid
                ).toBe(true);

                const badEmail = validate({ email: "not-an-email" }, schema, { validateFormat: true });
                expect(badEmail.valid).toBe(false);
                expect(badEmail.errors[0].message).toContain('format "email"');

                const badUri = validate({ uri: "not-a-uri" }, schema, { validateFormat: true });
                expect(badUri.valid).toBe(false);
            });

            it("should skip format validation when validateFormat is false or omitted", () => {
                const schema: JsonSchema = {
                    type: "object",
                    properties: {
                        email: { type: "string", format: "email" },
                    },
                };

                expect(validate({ email: "not-an-email" }, schema).valid).toBe(true);
                expect(validate({ email: "not-an-email" }, schema, { validateFormat: false }).valid).toBe(true);
            });
        });

        describe("pathToInstancePointer", () => {
            it("should convert dot path to JSON Pointer", () => {
                expect(pathToInstancePointer("")).toBe("");
                expect(pathToInstancePointer("name")).toBe("/name");
                expect(pathToInstancePointer("user.email")).toBe("/user/email");
                expect(pathToInstancePointer("items[0]")).toBe("/items/0");
                expect(pathToInstancePointer("user.items[0].name")).toBe("/user/items/0/name");
            });
        });

        describe("compile and validateAsync", () => {
            it("should compile schema to validator function", () => {
                const schema: JsonSchema = {
                    type: "object",
                    properties: { x: { type: "integer" } },
                };
                const fn = compile(schema);
                expect(fn({ x: 1 }).valid).toBe(true);
                expect(fn({ x: "bad" }).valid).toBe(false);
            });

            it("should validateAsync return Promise of result", async () => {
                const schema: JsonSchema = { type: "string" };
                const result = await validateAsync("ok", schema);
                expect(result.valid).toBe(true);
                const bad = await validateAsync(123, schema);
                expect(bad.valid).toBe(false);
            });
        });

        describe("error structure (instancePath, keyword, code)", () => {
            it("should include instancePath and keyword in errors", () => {
                const schema: JsonSchema = {
                    type: "object",
                    properties: { age: { type: "integer", minimum: 0 } },
                };
                const result = validate({ age: -1 }, schema);
                expect(result.errors[0].instancePath).toBe("/age");
                expect(result.errors[0].keyword).toBe("minimum");
                expect(result.errors[0].code).toBe("minimum");
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
