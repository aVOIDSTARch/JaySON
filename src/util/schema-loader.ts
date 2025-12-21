/**
 * @fileoverview Schema Loader - Load and cache JSON schemas
 * @module util/schema-loader
 * @description Provides functionality to load JSON Schema files from the filesystem
 * with caching support, extract schema metadata, and list available schemas in a directory.
 */

import * as fs from "fs";
import * as path from "path";
import type { JsonSchema, SchemaInfo } from "./json-types.js";

/**
 * Loads a JSON Schema from a file with caching.
 * Resolves relative paths against the provided schema directory.
 *
 * @param {string} schemaPath - Path to the schema file (absolute or relative)
 * @param {string} schemaDir - Base directory for resolving relative paths
 * @param {Map<string, JsonSchema>} cache - Cache map for storing loaded schemas
 * @returns {JsonSchema} The loaded and parsed JSON Schema
 * @throws {Error} If the schema file is not found
 *
 * @example
 * const cache = new Map<string, JsonSchema>();
 * const schema = loadSchema("user.schema.json", "./schemas", cache);
 *
 * // Second call returns cached version
 * const sameSchema = loadSchema("user.schema.json", "./schemas", cache);
 */
export function loadSchema(
    schemaPath: string,
    schemaDir: string,
    cache: Map<string, JsonSchema>
): JsonSchema {
    const fullPath = path.isAbsolute(schemaPath)
        ? schemaPath
        : path.join(schemaDir, schemaPath);

    if (cache.has(fullPath)) {
        return cache.get(fullPath)!;
    }

    if (!fs.existsSync(fullPath)) {
        throw new Error(`Schema file not found: ${fullPath}`);
    }

    const content = fs.readFileSync(fullPath, "utf-8");
    const schema = JSON.parse(content) as JsonSchema;
    cache.set(fullPath, schema);
    return schema;
}

/**
 * Extracts metadata information from a JSON Schema.
 * Provides a summary of the schema's structure including title, description,
 * root type, required fields, and property names.
 *
 * @param {JsonSchema} schema - The JSON Schema to analyze
 * @returns {SchemaInfo} Object containing schema metadata
 *
 * @example
 * const schema = {
 *   title: "User",
 *   description: "A user account",
 *   type: "object",
 *   properties: { id: {}, name: {}, email: {} },
 *   required: ["id", "name"]
 * };
 *
 * const info = getSchemaInfo(schema);
 * // Returns: { title: "User", description: "A user account", ... }
 */
export function getSchemaInfo(schema: JsonSchema): SchemaInfo {
    let properties: string[] = [];
    let requiredFields: string[] = [];

    if (schema.type === "object" && schema.properties) {
        properties = Object.keys(schema.properties);
        requiredFields = schema.required || [];
    } else if (schema.type === "array" && schema.items) {
        const items = schema.items as JsonSchema;
        if (items.properties) {
            properties = Object.keys(items.properties);
            requiredFields = items.required || [];
        }
    }

    return {
        title: schema.title || "Untitled Schema",
        description: schema.description || "",
        rootType: schema.type,
        requiredFields,
        properties,
    };
}

/**
 * Lists all JSON schema files in a directory.
 * Returns full paths to all .json files in the specified directory.
 *
 * @param {string} schemaDir - Directory path to search for schemas
 * @returns {string[]} Array of full paths to schema files
 *
 * @example
 * const schemas = listSchemas("./schemas");
 * // Returns: ["./schemas/user.json", "./schemas/product.json", ...]
 */
export function listSchemas(schemaDir: string): string[] {
    if (!fs.existsSync(schemaDir)) {
        return [];
    }

    return fs
        .readdirSync(schemaDir)
        .filter((file) => file.endsWith(".json"))
        .map((file) => path.join(schemaDir, file));
}
