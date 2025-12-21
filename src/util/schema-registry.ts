/**
 * @fileoverview Schema Registry - Manages local storage of downloaded schemas
 * @module util/schema-registry
 * @description Provides functionality to manage a registry of downloaded JSON schemas,
 * including persistence, creation, and update tracking. The registry stores metadata
 * about each schema including source URLs, download timestamps, and version information.
 */

import * as fs from "fs";
import * as path from "path";
import type { SchemaMetadata } from "./schema-constants.js";

/**
 * Registry of downloaded schemas.
 * Tracks all schemas that have been downloaded with their metadata.
 *
 * @interface SchemaRegistry
 * @property {string} lastUpdated - ISO timestamp of last registry modification
 * @property {Record<string, SchemaMetadata>} schemas - Map of schema names to their metadata
 */
export interface SchemaRegistry {
    lastUpdated: string;
    schemas: Record<string, SchemaMetadata>;
}

/**
 * Creates a new empty schema registry.
 * Initializes with current timestamp and empty schemas collection.
 *
 * @returns {SchemaRegistry} A new empty registry object
 *
 * @example
 * const registry = createEmptyRegistry();
 * // registry.schemas is now an empty object
 * // registry.lastUpdated is the current ISO timestamp
 */
export function createEmptyRegistry(): SchemaRegistry {
    return {
        lastUpdated: new Date().toISOString(),
        schemas: {},
    };
}

/**
 * Loads the schema registry from disk.
 * Returns an empty registry if the file doesn't exist or is invalid.
 *
 * @param {string} registryPath - Path to the registry JSON file
 * @returns {SchemaRegistry} The loaded registry or a new empty one
 *
 * @example
 * const registry = loadRegistry("./schemas/.registry.json");
 * console.log(`Loaded ${Object.keys(registry.schemas).length} schemas`);
 */
export function loadRegistry(registryPath: string): SchemaRegistry {
    if (fs.existsSync(registryPath)) {
        try {
            const content = fs.readFileSync(registryPath, "utf-8");
            return JSON.parse(content);
        } catch {
            return createEmptyRegistry();
        }
    }
    return createEmptyRegistry();
}

/**
 * Saves the schema registry to disk.
 * Creates the parent directory if it doesn't exist.
 *
 * @param {string} registryPath - Path to save the registry JSON file
 * @param {SchemaRegistry} registry - The registry object to save
 * @param {string} standardsDir - Directory for schemas (created if needed)
 * @returns {void}
 *
 * @example
 * registry.schemas["my-schema"] = { name: "my-schema", ... };
 * saveRegistry("./schemas/.registry.json", registry, "./schemas");
 */
export function saveRegistry(registryPath: string, registry: SchemaRegistry, standardsDir: string): void {
    ensureDir(standardsDir);
    fs.writeFileSync(
        registryPath,
        JSON.stringify(registry, null, 2),
        "utf-8"
    );
}

/**
 * Ensures a directory exists, creating it recursively if necessary.
 *
 * @param {string} dir - Directory path to ensure exists
 * @returns {void}
 *
 * @example
 * ensureDir("./schemas/standards/draft-07");
 * // Directory now exists (created if it didn't)
 */
export function ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * Sanitizes a filename by removing invalid characters.
 * Converts to lowercase and replaces non-alphanumeric characters with hyphens.
 *
 * @param {string} name - The filename to sanitize
 * @returns {string} Sanitized filename safe for filesystem use
 *
 * @example
 * sanitizeFileName("My Schema v2.0");  // returns "my-schema-v2-0"
 * sanitizeFileName("package.json");     // returns "package-json"
 */
export function sanitizeFileName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

/**
 * Checks if a schema needs updating based on its age.
 * Returns true if the schema was downloaded more than maxAgeDays ago,
 * or if metadata is undefined (schema not yet downloaded).
 *
 * @param {SchemaMetadata|undefined} metadata - Metadata for the schema to check
 * @param {number} [maxAgeDays=30] - Maximum age in days before update needed
 * @returns {boolean} True if the schema needs updating
 *
 * @example
 * const metadata = registry.schemas["package.json"];
 * if (needsUpdate(metadata, 7)) {
 *   console.log("Schema is older than 7 days, update recommended");
 * }
 */
export function needsUpdate(metadata: SchemaMetadata | undefined, maxAgeDays: number = 30): boolean {
    if (!metadata) {
        return true;
    }

    const downloadedAt = new Date(metadata.downloadedAt);
    const now = new Date();
    const diffDays = (now.getTime() - downloadedAt.getTime()) / (1000 * 60 * 60 * 24);

    return diffDays > maxAgeDays;
}
