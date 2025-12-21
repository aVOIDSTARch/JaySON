/**
 * @fileoverview Template Generator - Generate default objects from JSON schemas
 * @module util/template-generator
 * @description Provides functionality to generate template/default objects
 * from JSON Schema definitions. Useful for creating initial data structures
 * that conform to a schema's type requirements.
 */

import type { JsonSchema, JsonSchemaProperty } from "./json-types.js";

/**
 * Generates a template object from a JSON Schema.
 * Creates a default object with appropriate initial values for each property
 * based on the schema's type definitions.
 *
 * @param {JsonSchemaProperty | JsonSchema} schema - The JSON Schema to generate from
 * @returns {Record<string, unknown> | unknown[]} A template object or array matching the schema
 *
 * @description
 * Value generation rules:
 * - If `default` is specified, uses that value
 * - If `enum` is specified, uses the first enum value
 * - `string` type: empty string `""`
 * - `number` or `integer` type: uses `minimum` if specified, otherwise `0`
 * - `boolean` type: `false`
 * - `array` type: empty array `[]`
 * - `object` type: recursively generates nested object
 * - Unknown types: `null`
 *
 * @example
 * const userSchema: JsonSchema = {
 *   type: "object",
 *   properties: {
 *     id: { type: "integer", minimum: 1 },
 *     name: { type: "string" },
 *     email: { type: "string" },
 *     role: { type: "string", enum: ["admin", "user", "guest"] },
 *     active: { type: "boolean" },
 *     tags: { type: "array" },
 *     settings: {
 *       type: "object",
 *       properties: {
 *         theme: { type: "string", default: "light" }
 *       }
 *     }
 *   }
 * };
 *
 * const template = generateFromSchema(userSchema);
 * // Returns: {
 * //   id: 1,           // uses minimum
 * //   name: "",        // default string
 * //   email: "",       // default string
 * //   role: "admin",   // first enum value
 * //   active: false,   // default boolean
 * //   tags: [],        // default array
 * //   settings: {
 * //     theme: "light" // uses default value
 * //   }
 * // }
 *
 * @example
 * // Array schemas return empty arrays
 * const arraySchema: JsonSchema = {
 *   type: "array",
 *   items: { type: "string" }
 * };
 * generateFromSchema(arraySchema);  // Returns: []
 */
export function generateFromSchema(
    schema: JsonSchemaProperty | JsonSchema
): Record<string, unknown> | unknown[] {
    // Array types return empty arrays
    if (schema.type === "array") {
        return [];
    }

    // Non-object types without properties return empty objects
    if (schema.type !== "object" || !schema.properties) {
        return {};
    }

    const result: Record<string, unknown> = {};

    // Generate default values for each property
    for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (propSchema.default !== undefined) {
            // Use explicit default value
            result[key] = propSchema.default;
        } else if (propSchema.enum && propSchema.enum.length > 0) {
            // Use first enum value
            result[key] = propSchema.enum[0];
        } else if (propSchema.type === "string") {
            result[key] = "";
        } else if (propSchema.type === "number" || propSchema.type === "integer") {
            // Use minimum if specified, otherwise 0
            result[key] = propSchema.minimum ?? 0;
        } else if (propSchema.type === "boolean") {
            result[key] = false;
        } else if (propSchema.type === "array") {
            result[key] = [];
        } else if (propSchema.type === "object") {
            // Recursively generate nested objects
            result[key] = generateFromSchema(propSchema);
        } else {
            // Unknown types default to null
            result[key] = null;
        }
    }

    return result;
}
