/**
 * Standard Detection - Identify JSON Schema standards in schemas
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
 * Detect the JSON Schema standard used in a schema object or file
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
 * Get list of available JSON Schema standards
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
