/**
 * Unit Tests for errors.ts
 */

import { describe, it, expect } from "vitest";
import {
    ERROR_CATALOG,
    ERROR_CODES,
    getErrorDefinition,
    createErrorFromCatalog,
    enrichError,
} from "../../src/util/errors.js";
import { validate } from "../../src/util/json-validator.js";
import type { JsonSchema } from "../../src/util/json-types.js";

describe("errors", () => {
    describe("ERROR_CATALOG", () => {
        it("should have definitions for validation error codes", () => {
            expect(ERROR_CATALOG.type).toBeDefined();
            expect(ERROR_CATALOG.required).toBeDefined();
            expect(ERROR_CATALOG.enum).toBeDefined();
            expect(ERROR_CATALOG.pattern).toBeDefined();
            expect(ERROR_CATALOG.format).toBeDefined();
            expect(ERROR_CATALOG.minimum).toBeDefined();
            expect(ERROR_CATALOG.maximum).toBeDefined();
        });

        it("should have definitions for I/O error codes", () => {
            expect(ERROR_CATALOG["file-not-found"]).toBeDefined();
            expect(ERROR_CATALOG["file-parse-error"]).toBeDefined();
        });

        it("each definition should have code, message, explanation", () => {
            for (const def of Object.values(ERROR_CATALOG)) {
                expect(def.code).toBeDefined();
                expect(def.message).toBeDefined();
                expect(def.explanation).toBeDefined();
                expect(typeof def.explanation).toBe("string");
                expect(def.explanation.length).toBeGreaterThan(0);
            }
        });
    });

    describe("getErrorDefinition", () => {
        it("should return definition for known code", () => {
            const def = getErrorDefinition("required");
            expect(def).toBeDefined();
            expect(def?.code).toBe("required");
            expect(def?.explanation).toContain("required");
        });

        it("should substitute placeholders in message", () => {
            const def = getErrorDefinition("type", { expected: "string", actual: "number" });
            expect(def?.message).toContain("string");
            expect(def?.message).toContain("number");
        });

        it("should return undefined for unknown code", () => {
            expect(getErrorDefinition("unknown-code")).toBeUndefined();
        });
    });

    describe("createErrorFromCatalog", () => {
        it("should create error with message, explanation, hint", () => {
            const err = createErrorFromCatalog("required", "name");
            expect(err.path).toBe("name");
            expect(err.code).toBe("required");
            expect(err.message).toContain("Required");
            expect(err.explanation).toBeDefined();
            expect(err.hint).toBeDefined();
        });

        it("should substitute placeholders", () => {
            const err = createErrorFromCatalog("file-not-found", "", { path: "/tmp/missing.json" });
            expect(err.message).toContain("/tmp/missing.json");
        });
    });

    describe("enrichError", () => {
        it("should add explanation and hint to error with code", () => {
            const base = { code: "required", message: "Required field missing" };
            const enriched = enrichError(base);
            expect(enriched.explanation).toBeDefined();
            expect(enriched.hint).toBeDefined();
        });

        it("should not add when includeExplanation is false", () => {
            const base = { code: "required", message: "Required" };
            const enriched = enrichError(base, { includeExplanation: false });
            expect(enriched.explanation).toBeUndefined();
        });
    });

    describe("validation errors include explanation and hint", () => {
        it("should include explanation and hint in validation result", () => {
            const schema: JsonSchema = {
                type: "object",
                properties: { age: { type: "integer", minimum: 0 } },
                required: ["age"],
            };
            const result = validate({}, schema);
            expect(result.valid).toBe(false);
            const requiredError = result.errors.find((e) => e.code === "required");
            expect(requiredError?.explanation).toBeDefined();
            expect(requiredError?.hint).toBeDefined();
        });

        it("should omit explanation when includeExplanations is false", () => {
            const schema: JsonSchema = {
                type: "object",
                properties: { x: { type: "string" } },
            };
            const result = validate({ x: 123 }, schema, { includeExplanations: false });
            expect(result.errors[0].explanation).toBeUndefined();
            expect(result.errors[0].hint).toBeUndefined();
        });
    });
});
