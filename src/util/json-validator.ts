/**
 * @fileoverview JSON Validator - Validate data against JSON schemas
 * @module util/json-validator
 * @description Provides functions to validate JavaScript/JSON data against
 * JSON Schema specifications. Supports type validation, constraints, enums,
 * patterns, and schema combinators (oneOf, anyOf, allOf).
 */

import type {
    JsonSchema,
    JsonSchemaProperty,
    ValidationError,
    ValidationResult,
} from "./json-types.js";
import { getErrorDefinition } from "./errors.js";

/**
 * Converts dot/bracket path to JSON Pointer (RFC 6901).
 * e.g. "user.address.city" -> "/user/address/city", "items[0]" -> "/items/0"
 */
export function pathToInstancePointer(path: string): string {
    if (!path) return "";
    const segments: string[] = [];
    for (const part of path.split(".")) {
        const bracket = part.indexOf("[");
        if (bracket >= 0) {
            if (bracket > 0) segments.push(part.slice(0, bracket));
            const numMatch = part.match(/\[(\d+)\]/);
            if (numMatch) segments.push(numMatch[1]);
        } else {
            segments.push(part);
        }
    }
    return "/" + segments.join("/");
}

/** Creates a ValidationError with optional instancePath, keyword, code, explanation, hint */
function makeError(
    path: string,
    message: string,
    opts: {
        value?: unknown;
        keyword?: string;
        code?: string;
        placeholders?: Record<string, string | number>;
    },
    includeExplanations: boolean = true
): ValidationError {
    const err: ValidationError = { path, message };
    if (path) err.instancePath = pathToInstancePointer(path);
    if (opts.keyword) err.keyword = opts.keyword;
    if (opts.code) err.code = opts.code;
    if (opts.value !== undefined) err.value = opts.value;

    if (includeExplanations && opts.code) {
        const def = getErrorDefinition(opts.code, opts.placeholders);
        if (def?.explanation) err.explanation = def.explanation;
        if (def?.hint) err.hint = def.hint;
    }

    return err;
}

/**
 * Options for validation.
 */
export interface ValidateOptions {
    /** When true, validate string values against the format keyword (email, uri, date-time, uuid, etc.). Default: false. */
    validateFormat?: boolean;
    /** When true, add user-friendly explanation and hint to errors from the error catalog. Default: true. */
    includeExplanations?: boolean;
}

// Format validation patterns (RFC 5322 simplified, RFC 3986, ISO 8601, UUID)
const FORMAT_PATTERNS: Record<string, RegExp> = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    uri: /^[a-zA-Z][a-zA-Z0-9+.-]*:[^\s]*$/,
    "uri-reference": /^([a-zA-Z][a-zA-Z0-9+.-]*:[^\s]*|[^#]*#.*)$/,
    "date-time": /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/,
    date: /^\d{4}-\d{2}-\d{2}$/,
    time: /^\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/,
    uuid: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/,
    "uri-template": /^[^{}]*(?:\{[^}]*\}[^{}]*)*$/,
};

function validateFormat(
    value: string,
    format: string,
    path: string,
    errors: ValidationError[],
    includeExplanations: boolean
): void {
    const pattern = FORMAT_PATTERNS[format];
    if (!pattern) {
        return; // Unknown format: skip (per JSON Schema, format is annotation by default)
    }
    if (!pattern.test(value)) {
        errors.push(makeError(path, `Value does not match format "${format}"`, { value, keyword: "format", code: "format", placeholders: { format } }, includeExplanations));
    }
}

/**
 * Determines the JSON Schema type of a JavaScript value.
 * Maps JavaScript types to JSON Schema type names.
 *
 * @param {unknown} value - The value to get the type of
 * @returns {string} The JSON Schema type name ('null', 'array', 'integer', 'number', 'string', 'boolean', 'object')
 *
 * @example
 * getValueType(null);        // returns "null"
 * getValueType([1, 2, 3]);   // returns "array"
 * getValueType(42);          // returns "integer"
 * getValueType(3.14);        // returns "number"
 * getValueType("hello");     // returns "string"
 * getValueType(true);        // returns "boolean"
 * getValueType({});          // returns "object"
 */
export function getValueType(value: unknown): string {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    if (typeof value === "number" && Number.isInteger(value)) return "integer";
    return typeof value;
}

/**
 * Validates a value against a JSON Schema property definition.
 * This is the core recursive validation function that handles all schema constraints.
 *
 * @param {unknown} value - The value to validate
 * @param {JsonSchemaProperty | JsonSchema} schema - The schema to validate against
 * @param {string} path - The current JSON path (for error reporting)
 * @param {ValidationError[]} errors - Array to collect validation errors
 * @returns {void} Errors are pushed to the errors array parameter
 *
 * @example
 * const errors: ValidationError[] = [];
 * const schema = { type: "string", minLength: 3 };
 * validateValue("hi", schema, "name", errors);
 * // errors will contain: [{ path: "name", message: "String length must be >= 3", value: "hi" }]
 *
 * @description
 * Validates the following constraints:
 * - Type matching (string, number, integer, boolean, null, array, object)
 * - Enum values
 * - String patterns (regex)
 * - Number ranges (minimum, maximum)
 * - String length (minLength, maxLength)
 * - Required properties
 * - Nested object properties
 * - Array item schemas
 * - Schema combinators (oneOf, anyOf)
 */
export function validateValue(
    value: unknown,
    schema: JsonSchemaProperty | JsonSchema,
    path: string,
    errors: ValidationError[],
    options: ValidateOptions = {}
): void {
    const includeExplanations = options.includeExplanations !== false;
    // Handle $ref - fail explicitly until resolution is implemented
    if (schema.$ref) {
        errors.push(makeError(path, `$ref not yet supported: ${schema.$ref}. Use inline schemas or implement a schema registry.`, { value, keyword: "$ref", code: "ref-unsupported" }, includeExplanations));
        return;
    }

    // Handle allOf - all schemas must match
    if (schema.allOf) {
        for (const subSchema of schema.allOf) {
            validateValue(value, subSchema, path, errors, options);
        }
        return;
    }

    // Handle oneOf - exactly one schema must match
    if (schema.oneOf) {
        const validCount = schema.oneOf.filter((subSchema) => {
            const subErrors: ValidationError[] = [];
            validateValue(value, subSchema, path, subErrors, options);
            return subErrors.length === 0;
        }).length;

        if (validCount !== 1) {
            errors.push(makeError(path, "Value must match exactly one of the oneOf schemas", { value, keyword: "oneOf", code: "oneOf" }, includeExplanations));
        }
        return;
    }

    // Handle anyOf - at least one schema must match
    if (schema.anyOf) {
        const isValid = schema.anyOf.some((subSchema) => {
            const subErrors: ValidationError[] = [];
            validateValue(value, subSchema, path, subErrors, options);
            return subErrors.length === 0;
        });

        if (!isValid) {
            errors.push(makeError(path, "Value must match at least one of the anyOf schemas", { value, keyword: "anyOf", code: "anyOf" }, includeExplanations));
        }
        return;
    }

    const schemaType = schema.type;

    // Type validation
    if (schemaType) {
        const types = Array.isArray(schemaType) ? schemaType : [schemaType];
        const actualType = getValueType(value);

        if (!types.includes(actualType)) {
            errors.push(makeError(path, `Expected type ${types.join(" | ")}, got ${actualType}`, {
                value,
                keyword: "type",
                code: "type",
                placeholders: { expected: types.join(" | "), actual: actualType },
            }, includeExplanations));
            return;
        }
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value as string | number | boolean)) {
        errors.push(makeError(path, `Value must be one of: ${schema.enum.join(", ")}`, {
            value,
            keyword: "enum",
            code: "enum",
            placeholders: { allowed: schema.enum.join(", ") },
        }, includeExplanations));
    }

    // Pattern validation for strings
    if (schema.pattern && typeof value === "string") {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
            errors.push(makeError(path, `Value does not match pattern: ${schema.pattern}`, { value, keyword: "pattern", code: "pattern" }, includeExplanations));
        }
    }

    // Format validation for strings (opt-in)
    if (
        options.validateFormat &&
        schema.format &&
        typeof value === "string"
    ) {
        validateFormat(value, schema.format, path, errors, includeExplanations);
    }

    // Number range validation
    if (typeof value === "number") {
        if (schema.minimum !== undefined && value < schema.minimum) {
            errors.push(makeError(path, `Value must be >= ${schema.minimum}`, { value, keyword: "minimum", code: "minimum", placeholders: { minimum: schema.minimum } }, includeExplanations));
        }
        if (schema.maximum !== undefined && value > schema.maximum) {
            errors.push(makeError(path, `Value must be <= ${schema.maximum}`, { value, keyword: "maximum", code: "maximum", placeholders: { maximum: schema.maximum } }, includeExplanations));
        }
    }

    // String length validation
    if (typeof value === "string") {
        if (schema.minLength !== undefined && value.length < schema.minLength) {
            errors.push(makeError(path, `String length must be >= ${schema.minLength}`, { value, keyword: "minLength", code: "minLength", placeholders: { minLength: schema.minLength } }, includeExplanations));
        }
        if (schema.maxLength !== undefined && value.length > schema.maxLength) {
            errors.push(makeError(path, `String length must be <= ${schema.maxLength}`, { value, keyword: "maxLength", code: "maxLength", placeholders: { maxLength: schema.maxLength } }, includeExplanations));
        }
    }

    // Object validation
    if (schemaType === "object" && typeof value === "object" && value !== null) {
        const obj = value as Record<string, unknown>;

        // Required fields validation
        if (schema.required) {
            for (const field of schema.required) {
                if (!(field in obj)) {
                    const p = path ? `${path}.${field}` : field;
                    errors.push(makeError(p, "Required field missing", { keyword: "required", code: "required" }, includeExplanations));
                }
            }
        }

        // Property validation - recursively validate each property
        if (schema.properties) {
            for (const [key, propSchema] of Object.entries(schema.properties)) {
                if (key in obj) {
                    validateValue(
                        obj[key],
                        propSchema,
                        path ? `${path}.${key}` : key,
                        errors,
                        options
                    );
                }
            }
        }

        // additionalProperties validation
        const allowedKeys = new Set(schema.properties ? Object.keys(schema.properties) : []);
        const additionalPropsSchema = schema.additionalProperties;

        if (additionalPropsSchema === false) {
            for (const key of Object.keys(obj)) {
                if (!allowedKeys.has(key)) {
                    const p = path ? `${path}.${key}` : key;
                    errors.push(makeError(p, `Additional property "${key}" is not allowed`, { value: obj[key], keyword: "additionalProperties", code: "additionalProperties", placeholders: { property: key } }, includeExplanations));
                }
            }
        } else if (
            typeof additionalPropsSchema === "object" &&
            additionalPropsSchema !== null
        ) {
            for (const key of Object.keys(obj)) {
                if (!allowedKeys.has(key)) {
                    validateValue(
                        obj[key],
                        additionalPropsSchema,
                        path ? `${path}.${key}` : key,
                        errors,
                        options
                    );
                }
            }
        }
        // additionalProperties === true or undefined: allow (no-op)
    }

    // Array validation - validate each item against the items schema
    if (schemaType === "array" && Array.isArray(value)) {
        if (schema.items) {
            value.forEach((item, index) => {
                validateValue(
                    item,
                    schema.items as JsonSchemaProperty,
                    `${path}[${index}]`,
                    errors,
                    options
                );
            });
        }
    }
}

/**
 * Validates data against a JSON Schema.
 * This is the main entry point for schema validation.
 *
 * @param {unknown} data - The data to validate (can be any JSON-compatible value)
 * @param {JsonSchema} schema - The JSON Schema to validate against
 * @returns {ValidationResult} Object containing validation status and any errors
 *
 * @example
 * const schema: JsonSchema = {
 *   type: "object",
 *   properties: {
 *     name: { type: "string", minLength: 1 },
 *     age: { type: "integer", minimum: 0 }
 *   },
 *   required: ["name"]
 * };
 *
 * const validData = { name: "John", age: 30 };
 * const result1 = validate(validData, schema);
 * // result1 = { valid: true, errors: [] }
 *
 * const invalidData = { age: -5 };
 * const result2 = validate(invalidData, schema);
 * // result2 = {
 * //   valid: false,
 * //   errors: [
 * //     { path: "name", message: "Required field missing" },
 * //     { path: "age", message: "Value must be >= 0", value: -5 }
 * //   ]
 * // }
 */
export function validate(
    data: unknown,
    schema: JsonSchema,
    options: ValidateOptions = {}
): ValidationResult {
    const errors: ValidationError[] = [];
    validateValue(data, schema, "", errors, options);

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Compiled validator function. Returned by compile() for reuse.
 */
export type CompiledValidator = (data: unknown) => ValidationResult;

/**
 * Compiles a JSON Schema into a validator function for repeated use.
 * Use when validating many instances against the same schema.
 *
 * @param {JsonSchema} schema - The JSON Schema to compile
 * @param {ValidateOptions} [options] - Validation options (e.g. validateFormat)
 * @returns {CompiledValidator} A function that validates data against the schema
 *
 * @example
 * const schema = { type: "object", properties: { name: { type: "string" } } };
 * const validateUser = compile(schema);
 * for (const user of users) {
 *   const result = validateUser(user);
 *   if (!result.valid) console.log(result.errors);
 * }
 */
export function compile(
    schema: JsonSchema,
    options: ValidateOptions = {}
): CompiledValidator {
    return (data: unknown) => validate(data, schema, options);
}

/**
 * Validates data asynchronously. Resolves with ValidationResult.
 * Use for consistency with async APIs; validation itself is synchronous.
 *
 * @param {unknown} data - The data to validate
 * @param {JsonSchema} schema - The JSON Schema to validate against
 * @param {ValidateOptions} [options] - Validation options
 * @returns {Promise<ValidationResult>} Promise resolving to validation result
 */
export function validateAsync(
    data: unknown,
    schema: JsonSchema,
    options: ValidateOptions = {}
): Promise<ValidationResult> {
    return Promise.resolve(validate(data, schema, options));
}
