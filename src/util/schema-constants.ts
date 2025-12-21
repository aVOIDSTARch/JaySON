/**
 * @fileoverview Schema Constants - JSON Schema version definitions and type mappings
 * @module util/schema-constants
 * @description Provides constants and type definitions for JSON Schema versions,
 * URL mappings, and metadata structures used throughout the library.
 */

/**
 * Known JSON Schema meta-schema version URLs.
 * Maps version names to their official $schema URIs.
 *
 * @const {Object}
 * @example
 * const schemaUrl = JSON_SCHEMA_VERSIONS["2020-12"];
 * // Returns: "https://json-schema.org/draft/2020-12/schema"
 */
export const JSON_SCHEMA_VERSIONS = {
    "draft-04": "http://json-schema.org/draft-04/schema#",
    "draft-06": "http://json-schema.org/draft-06/schema#",
    "draft-07": "http://json-schema.org/draft-07/schema#",
    "2019-09": "https://json-schema.org/draft/2019-09/schema",
    "2020-12": "https://json-schema.org/draft/2020-12/schema",
} as const;

/**
 * Type representing valid JSON Schema version identifiers.
 * @typedef {('draft-04'|'draft-06'|'draft-07'|'2019-09'|'2020-12')} JsonSchemaVersion
 */
export type JsonSchemaVersion = keyof typeof JSON_SCHEMA_VERSIONS;

/**
 * Reverse mapping of $schema URLs to version names.
 * Used for detecting the version of an existing schema.
 *
 * @const {Record<string, JsonSchemaVersion>}
 */
export const SCHEMA_URL_TO_VERSION: Record<string, JsonSchemaVersion> = {
    "http://json-schema.org/draft-04/schema#": "draft-04",
    "http://json-schema.org/draft-04/schema": "draft-04",
    "http://json-schema.org/draft-06/schema#": "draft-06",
    "http://json-schema.org/draft-06/schema": "draft-06",
    "http://json-schema.org/draft-07/schema#": "draft-07",
    "http://json-schema.org/draft-07/schema": "draft-07",
    "https://json-schema.org/draft/2019-09/schema": "2019-09",
    "https://json-schema.org/draft/2019-09/schema#": "2019-09",
    "https://json-schema.org/draft/2020-12/schema": "2020-12",
    "https://json-schema.org/draft/2020-12/schema#": "2020-12",
};

/**
 * Information about a detected JSON Schema standard.
 * @interface DetectedStandard
 */
export interface DetectedStandard {
    /** The detected version name, or null if unknown */
    version: JsonSchemaVersion | null;
    /** The $schema URL from the schema, or null if not present */
    schemaUrl: string | null;
    /** Whether this is an official JSON Schema version */
    isOfficial: boolean;
    /** Human-readable description of the detected standard */
    description: string;
}

/**
 * Metadata for a downloaded schema.
 * @interface SchemaMetadata
 */
export interface SchemaMetadata {
    /** Display name of the schema */
    name: string;
    /** Version string */
    version: string;
    /** Source URL where the schema was downloaded from */
    url: string;
    /** ISO timestamp of when the schema was downloaded */
    downloadedAt: string;
    /** Local file path where the schema is stored */
    localPath: string;
    /** Git commit hash if downloaded from a git repository */
    gitCommit?: string;
    /** Git repository URL if applicable */
    gitRepo?: string;
}

/**
 * Result of a schema download operation.
 * @interface DownloadResult
 */
export interface DownloadResult {
    /** Whether the download was successful */
    success: boolean;
    /** Local path where the schema was saved (if successful) */
    path?: string;
    /** Error message (if failed) */
    error?: string;
}

/**
 * Result of a batch update operation.
 * @interface UpdateResult
 */
export interface UpdateResult {
    /** Names of successfully updated schemas */
    updated: string[];
    /** Schemas that failed to update with error details */
    failed: Array<{ name: string; error: string }>;
    /** Schemas that were skipped (already up to date) */
    skipped: string[];
}

/**
 * Entry from the SchemaStore catalog.
 * @interface SchemaStoreCatalogEntry
 * @see {@link https://www.schemastore.org/json/ SchemaStore}
 */
export interface SchemaStoreCatalogEntry {
    /** Display name of the schema */
    name: string;
    /** Description of what the schema validates */
    description: string;
    /** URL to download the schema */
    url: string;
    /** Glob patterns for files this schema applies to */
    fileMatch?: string[];
    /** Alternative versions of this schema */
    versions?: Record<string, string>;
}
