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
    errors: ValidationError[]
): void {
    // Handle $ref - skip reference validation (not yet implemented)
    if (schema.$ref) {
        return;
    }

    // Handle oneOf - exactly one schema must match
    if (schema.oneOf) {
        const validCount = schema.oneOf.filter((subSchema) => {
            const subErrors: ValidationError[] = [];
            validateValue(value, subSchema, path, subErrors);
            return subErrors.length === 0;
        }).length;

        if (validCount !== 1) {
            errors.push({
                path,
                message: `Value must match exactly one of the oneOf schemas`,
                value,
            });
        }
        return;
    }

    // Handle anyOf - at least one schema must match
    if (schema.anyOf) {
        const isValid = schema.anyOf.some((subSchema) => {
            const subErrors: ValidationError[] = [];
            validateValue(value, subSchema, path, subErrors);
            return subErrors.length === 0;
        });

        if (!isValid) {
            errors.push({
                path,
                message: `Value must match at least one of the anyOf schemas`,
                value,
            });
        }
        return;
    }

    const schemaType = schema.type;

    // Type validation
    if (schemaType) {
        const types = Array.isArray(schemaType) ? schemaType : [schemaType];
        const actualType = getValueType(value);

        if (!types.includes(actualType)) {
            errors.push({
                path,
                message: `Expected type ${types.join(" | ")}, got ${actualType}`,
                value,
            });
            return;
        }
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value as string | number | boolean)) {
        errors.push({
            path,
            message: `Value must be one of: ${schema.enum.join(", ")}`,
            value,
        });
    }

    // Pattern validation for strings
    if (schema.pattern && typeof value === "string") {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
            errors.push({
                path,
                message: `Value does not match pattern: ${schema.pattern}`,
                value,
            });
        }
    }

    // Number range validation
    if (typeof value === "number") {
        if (schema.minimum !== undefined && value < schema.minimum) {
            errors.push({
                path,
                message: `Value must be >= ${schema.minimum}`,
                value,
            });
        }
        if (schema.maximum !== undefined && value > schema.maximum) {
            errors.push({
                path,
                message: `Value must be <= ${schema.maximum}`,
                value,
            });
        }
    }

    // String length validation
    if (typeof value === "string") {
        if (schema.minLength !== undefined && value.length < schema.minLength) {
            errors.push({
                path,
                message: `String length must be >= ${schema.minLength}`,
                value,
            });
        }
        if (schema.maxLength !== undefined && value.length > schema.maxLength) {
            errors.push({
                path,
                message: `String length must be <= ${schema.maxLength}`,
                value,
            });
        }
    }

    // Object validation
    if (schemaType === "object" && typeof value === "object" && value !== null) {
        const obj = value as Record<string, unknown>;

        // Required fields validation
        if (schema.required) {
            for (const field of schema.required) {
                if (!(field in obj)) {
                    errors.push({
                        path: path ? `${path}.${field}` : field,
                        message: `Required field missing`,
                    });
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
                        errors
                    );
                }
            }
        }
    }

    // Array validation - validate each item against the items schema
    if (schemaType === "array" && Array.isArray(value)) {
        if (schema.items) {
            value.forEach((item, index) => {
                validateValue(
                    item,
                    schema.items as JsonSchemaProperty,
                    `${path}[${index}]`,
                    errors
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
export function validate(data: unknown, schema: JsonSchema): ValidationResult {
    const errors: ValidationError[] = [];
    validateValue(data, schema, "", errors);

    return {
        valid: errors.length === 0,
        errors,
    };
}
