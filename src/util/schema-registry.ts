/**
 * Schema Registry - Manages local storage of downloaded schemas
 */

import * as fs from "fs";
import * as path from "path";
import type { SchemaMetadata } from "./schema-constants.js";

/**
 * Registry of downloaded schemas
 */
export interface SchemaRegistry {
    lastUpdated: string;
    schemas: Record<string, SchemaMetadata>;
}

/**
 * Create an empty registry
 */
export function createEmptyRegistry(): SchemaRegistry {
    return {
        lastUpdated: new Date().toISOString(),
        schemas: {},
    };
}

/**
 * Load registry from disk
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
 * Save registry to disk
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
 * Ensure a directory exists
 */
export function ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * Sanitize a filename by removing invalid characters
 */
export function sanitizeFileName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

/**
 * Check if a schema needs updating based on age
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
