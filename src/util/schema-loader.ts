/**
 * Schema Loader - Load and cache JSON schemas
 */

import * as fs from "fs";
import * as path from "path";
import type { JsonSchema, SchemaInfo } from "./json-types.js";

/**
 * Load a JSON schema from file with caching
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
 * Get information about a schema
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
 * List all available schemas in a directory
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
