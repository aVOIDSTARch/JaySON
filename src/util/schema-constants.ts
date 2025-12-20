/**
 * Schema Constants - JSON Schema version definitions and type mappings
 */

/**
 * Known JSON Schema meta-schema versions
 */
export const JSON_SCHEMA_VERSIONS = {
    "draft-04": "http://json-schema.org/draft-04/schema#",
    "draft-06": "http://json-schema.org/draft-06/schema#",
    "draft-07": "http://json-schema.org/draft-07/schema#",
    "2019-09": "https://json-schema.org/draft/2019-09/schema",
    "2020-12": "https://json-schema.org/draft/2020-12/schema",
} as const;

export type JsonSchemaVersion = keyof typeof JSON_SCHEMA_VERSIONS;

/**
 * Mapping of $schema URLs to version names
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
 * Detected standard information
 */
export interface DetectedStandard {
    version: JsonSchemaVersion | null;
    schemaUrl: string | null;
    isOfficial: boolean;
    description: string;
}

/**
 * Downloaded schema metadata
 */
export interface SchemaMetadata {
    name: string;
    version: string;
    url: string;
    downloadedAt: string;
    localPath: string;
    gitCommit?: string;
    gitRepo?: string;
}

/**
 * Download result
 */
export interface DownloadResult {
    success: boolean;
    path?: string;
    error?: string;
}

/**
 * Update result for batch operations
 */
export interface UpdateResult {
    updated: string[];
    failed: Array<{ name: string; error: string }>;
    skipped: string[];
}

/**
 * SchemaStore catalog entry
 */
export interface SchemaStoreCatalogEntry {
    name: string;
    description: string;
    url: string;
    fileMatch?: string[];
    versions?: Record<string, string>;
}
