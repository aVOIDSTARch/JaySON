/**
 * @fileoverview Standard Detection - Identify JSON Schema standards in schemas
 * @module util/standard-detection
 * @description Provides functionality to detect which JSON Schema standard/draft
 * is used in a schema by analyzing the $schema property. Supports detection of
 * official JSON Schema drafts (04, 06, 07, 2019-09, 2020-12) and custom schemas.
 */

import * as fs from "fs";
import {
    SCHEMA_URL_TO_VERSION,
    JSON_SCHEMA_VERSIONS,
    type JsonSchemaVersion,
    type DetectedStandard,
    type SchemaMetadata,
} from "./schema-constants.js";

/**
 * Detects the JSON Schema standard used in a schema object or file.
 * Analyzes the $schema property to determine which draft version is used.
 *
 * @param {unknown|string} schemaOrPath - Either a schema object or path to a schema file
 * @returns {DetectedStandard} Detection result with version, URL, and description
 *
 * @example
 * // Detect from a schema object
 * const result = detectStandard({ $schema: "https://json-schema.org/draft/2020-12/schema" });
 * // result.version === "2020-12", result.isOfficial === true
 *
 * @example
 * // Detect from a file path
 * const result = detectStandard("./my-schema.json");
 * console.log(result.description);  // "JSON Schema 2020-12"
 */
export function detectStandard(schemaOrPath: unknown | string): DetectedStandard {
    let schema: Record<string, unknown>;

    if (typeof schemaOrPath === "string") {
        // It's a file path
        if (!fs.existsSync(schemaOrPath)) {
            return {
                version: null,
                schemaUrl: null,
                isOfficial: false,
                description: "File not found",
            };
        }
        try {
            const content = fs.readFileSync(schemaOrPath, "utf-8");
            schema = JSON.parse(content);
        } catch {
            return {
                version: null,
                schemaUrl: null,
                isOfficial: false,
                description: "Failed to parse schema file",
            };
        }
    } else if (typeof schemaOrPath === "object" && schemaOrPath !== null) {
        schema = schemaOrPath as Record<string, unknown>;
    } else {
        return {
            version: null,
            schemaUrl: null,
            isOfficial: false,
            description: "Invalid input: expected object or file path",
        };
    }

    const schemaUrl = schema.$schema as string | undefined;

    if (!schemaUrl) {
        return {
            version: null,
            schemaUrl: null,
            isOfficial: false,
            description: "No $schema property found - standard unknown",
        };
    }

    const version = SCHEMA_URL_TO_VERSION[schemaUrl] || null;

    if (version) {
        return {
            version,
            schemaUrl,
            isOfficial: true,
            description: `JSON Schema ${version}`,
        };
    }

    // Check if it's a custom or unknown schema URL
    return {
        version: null,
        schemaUrl,
        isOfficial: false,
        description: `Custom schema: ${schemaUrl}`,
    };
}

/**
 * Gets a list of all available JSON Schema standards with download status.
 * Shows which meta-schemas have been downloaded to the local registry.
 *
 * @param {Record<string, SchemaMetadata>} registry - Map of schema names to metadata
 * @returns {Array<Object>} Array of standards with version, URL, and download status
 * @returns {JsonSchemaVersion} returns[].version - The standard version identifier
 * @returns {string} returns[].url - Official $schema URL for this version
 * @returns {boolean} returns[].downloaded - Whether meta-schema is in local registry
 *
 * @example
 * const standards = getAvailableStandards(registry.schemas);
 * standards.forEach(s => {
 *   console.log(`${s.version}: ${s.downloaded ? "downloaded" : "not downloaded"}`);
 * });
 */
export function getAvailableStandards(
    registry: Record<string, SchemaMetadata>
): Array<{ version: JsonSchemaVersion; url: string; downloaded: boolean }> {
    return (Object.keys(JSON_SCHEMA_VERSIONS) as JsonSchemaVersion[]).map((version) => ({
        version,
        url: JSON_SCHEMA_VERSIONS[version],
        downloaded: registry[`meta-schema-${version}`] !== undefined,
    }));
}
