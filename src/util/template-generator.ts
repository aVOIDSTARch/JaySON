/**
 * Template Generator - Generate default objects from JSON schemas
 */

import type { JsonSchema, JsonSchemaProperty } from "./json-types.js";

/**
 * Generate a template object from a schema
 */
export function generateFromSchema(
    schema: JsonSchemaProperty | JsonSchema
): Record<string, unknown> | unknown[] {
    if (schema.type === "array") {
        return [];
    }

    if (schema.type !== "object" || !schema.properties) {
        return {};
    }

    const result: Record<string, unknown> = {};

    for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (propSchema.default !== undefined) {
            result[key] = propSchema.default;
        } else if (propSchema.enum && propSchema.enum.length > 0) {
            result[key] = propSchema.enum[0];
        } else if (propSchema.type === "string") {
            result[key] = "";
        } else if (propSchema.type === "number" || propSchema.type === "integer") {
            result[key] = propSchema.minimum ?? 0;
        } else if (propSchema.type === "boolean") {
            result[key] = false;
        } else if (propSchema.type === "array") {
            result[key] = [];
        } else if (propSchema.type === "object") {
            result[key] = generateFromSchema(propSchema);
        } else {
            result[key] = null;
        }
    }

    return result;
}
