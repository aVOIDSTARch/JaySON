/**
 * JSON Validator - Validate data against JSON schemas
 */

import type {
    JsonSchema,
    JsonSchemaProperty,
    ValidationError,
    ValidationResult,
} from "./json-types.js";

/**
 * Get the type of a value for validation
 */
export function getValueType(value: unknown): string {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    if (typeof value === "number" && Number.isInteger(value)) return "integer";
    return typeof value;
}

/**
 * Validate a value against a schema
 */
export function validateValue(
    value: unknown,
    schema: JsonSchemaProperty | JsonSchema,
    path: string,
    errors: ValidationError[]
): void {
    // Handle $ref
    if (schema.$ref) {
        // For now, skip $ref validation
        return;
    }

    // Handle oneOf
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

    // Handle anyOf
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

        // Required fields
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

        // Property validation
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

    // Array validation
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
 * Validate data against a schema
 */
export function validate(data: unknown, schema: JsonSchema): ValidationResult {
    const errors: ValidationError[] = [];
    validateValue(data, schema, "", errors);

    return {
        valid: errors.length === 0,
        errors,
    };
}
