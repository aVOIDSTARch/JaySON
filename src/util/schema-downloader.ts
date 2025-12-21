/**
 * @fileoverview Schema Downloader - Download schemas from various sources
 * @module util/schema-downloader
 * @description Provides functionality to download JSON schemas from multiple sources
 * including official JSON Schema meta-schemas, SchemaStore catalog, GitHub repositories,
 * and arbitrary URLs. Includes version tracking and update checking capabilities.
 */

import * as fs from "fs";
import * as path from "path";
import { fetchUrl } from "./http-client.js";
import { ensureDir, sanitizeFileName } from "./schema-registry.js";
import {
    JSON_SCHEMA_VERSIONS,
    type JsonSchemaVersion,
    type SchemaMetadata,
    type DownloadResult,
    type UpdateResult,
    type SchemaStoreCatalogEntry,
} from "./schema-constants.js";
import type { SchemaRegistry } from "./schema-registry.js";

/**
 * Downloads a JSON Schema meta-schema by version.
 * Fetches the official meta-schema from json-schema.org and saves it locally.
 *
 * @param {JsonSchemaVersion} version - The JSON Schema version to download
 * @param {string} standardsDir - Directory to save the downloaded schema
 * @param {SchemaRegistry} registry - Registry object to update with download info
 * @param {Function} saveRegistryFn - Callback function to persist registry changes
 * @returns {Promise<DownloadResult>} Result indicating success/failure with path or error
 *
 * @example
 * const result = await downloadMetaSchema("2020-12", "./schemas", registry, saveRegistry);
 * if (result.success) {
 *   console.log(`Schema saved to: ${result.path}`);
 * }
 */
export async function downloadMetaSchema(
    version: JsonSchemaVersion,
    standardsDir: string,
    registry: SchemaRegistry,
    saveRegistryFn: () => void
): Promise<DownloadResult> {
    const url = JSON_SCHEMA_VERSIONS[version];
    const fileName = `json-schema-${version}.json`;
    const localPath = path.join(standardsDir, fileName);

    try {
        const content = await fetchUrl(url);
        ensureDir(standardsDir);
        fs.writeFileSync(localPath, content, "utf-8");

        registry.schemas[`meta-schema-${version}`] = {
            name: `JSON Schema ${version}`,
            version,
            url,
            downloadedAt: new Date().toISOString(),
            localPath,
        };
        saveRegistryFn();

        return { success: true, path: localPath };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Downloads all official JSON Schema meta-schemas.
 * Iterates through all known versions and downloads each one.
 *
 * @param {string} standardsDir - Directory to save the downloaded schemas
 * @param {SchemaRegistry} registry - Registry object to update with download info
 * @param {Function} saveRegistryFn - Callback function to persist registry changes
 * @returns {Promise<UpdateResult>} Summary of updated, failed, and skipped schemas
 *
 * @example
 * const result = await downloadAllMetaSchemas("./schemas", registry, saveRegistry);
 * console.log(`Downloaded: ${result.updated.length}, Failed: ${result.failed.length}`);
 */
export async function downloadAllMetaSchemas(
    standardsDir: string,
    registry: SchemaRegistry,
    saveRegistryFn: () => void
): Promise<UpdateResult> {
    const result: UpdateResult = { updated: [], failed: [], skipped: [] };

    for (const version of Object.keys(JSON_SCHEMA_VERSIONS) as JsonSchemaVersion[]) {
        const downloadResult = await downloadMetaSchema(version, standardsDir, registry, saveRegistryFn);
        if (downloadResult.success) {
            result.updated.push(`meta-schema-${version}`);
        } else {
            result.failed.push({
                name: `meta-schema-${version}`,
                error: downloadResult.error || "Unknown error",
            });
        }
    }

    return result;
}

/**
 * Downloads a JSON schema from an arbitrary URL.
 * Validates the downloaded content is valid JSON before saving.
 *
 * @param {string} name - Display name for the schema
 * @param {string} url - URL to download the schema from
 * @param {string} [version="latest"] - Version string for tracking purposes
 * @param {string} standardsDir - Directory to save the downloaded schema
 * @param {SchemaRegistry} registry - Registry object to update with download info
 * @param {Function} saveRegistryFn - Callback function to persist registry changes
 * @returns {Promise<DownloadResult>} Result indicating success/failure with path or error
 *
 * @example
 * const result = await downloadSchema(
 *   "package.json",
 *   "https://json.schemastore.org/package.json",
 *   "latest",
 *   "./schemas",
 *   registry,
 *   saveRegistry
 * );
 */
export async function downloadSchema(
    name: string,
    url: string,
    version: string = "latest",
    standardsDir: string,
    registry: SchemaRegistry,
    saveRegistryFn: () => void
): Promise<DownloadResult> {
    const sanitizedName = sanitizeFileName(name);
    const fileName = version === "latest"
        ? `${sanitizedName}.json`
        : `${sanitizedName}-${version}.json`;
    const localPath = path.join(standardsDir, fileName);

    try {
        const content = await fetchUrl(url);

        // Validate it's valid JSON
        JSON.parse(content);

        ensureDir(standardsDir);
        fs.writeFileSync(localPath, content, "utf-8");

        registry.schemas[name] = {
            name,
            version,
            url,
            downloadedAt: new Date().toISOString(),
            localPath,
        };
        saveRegistryFn();

        return { success: true, path: localPath };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Downloads schemas from the SchemaStore catalog by name.
 * Fetches the catalog, finds matching schemas, and downloads them.
 *
 * @param {string[]} schemaNames - Array of schema names to download (case-insensitive)
 * @param {string} standardsDir - Directory to save the downloaded schemas
 * @param {SchemaRegistry} registry - Registry object to update with download info
 * @param {Function} saveRegistryFn - Callback function to persist registry changes
 * @returns {Promise<UpdateResult>} Summary of updated, failed, and skipped schemas
 * @see {@link https://www.schemastore.org/json/ SchemaStore}
 *
 * @example
 * const result = await downloadFromSchemaStore(
 *   ["package.json", "tsconfig.json"],
 *   "./schemas",
 *   registry,
 *   saveRegistry
 * );
 */
export async function downloadFromSchemaStore(
    schemaNames: string[],
    standardsDir: string,
    registry: SchemaRegistry,
    saveRegistryFn: () => void
): Promise<UpdateResult> {
    const result: UpdateResult = { updated: [], failed: [], skipped: [] };

    try {
        const catalogUrl = "https://www.schemastore.org/api/json/catalog.json";
        const catalogContent = await fetchUrl(catalogUrl);
        const catalog = JSON.parse(catalogContent) as { schemas: SchemaStoreCatalogEntry[] };

        for (const name of schemaNames) {
            const entry = catalog.schemas.find(
                (s) => s.name.toLowerCase() === name.toLowerCase()
            );

            if (!entry) {
                result.failed.push({ name, error: "Schema not found in catalog" });
                continue;
            }

            const downloadResult = await downloadSchema(
                entry.name,
                entry.url,
                "latest",
                standardsDir,
                registry,
                saveRegistryFn
            );
            if (downloadResult.success) {
                result.updated.push(entry.name);
            } else {
                result.failed.push({ name: entry.name, error: downloadResult.error || "Unknown error" });
            }
        }
    } catch (error) {
        result.failed.push({
            name: "catalog",
            error: `Failed to fetch SchemaStore catalog: ${error instanceof Error ? error.message : String(error)}`,
        });
    }

    return result;
}

/**
 * Lists all available schema names from the SchemaStore catalog.
 * Useful for discovering what schemas are available for download.
 *
 * @returns {Promise<string[]>} Array of schema names, or empty array on error
 * @see {@link https://www.schemastore.org/json/ SchemaStore}
 *
 * @example
 * const schemas = await listSchemaStoreSchemas();
 * console.log(`Available: ${schemas.length} schemas`);
 * // Filter for TypeScript-related schemas
 * const tsSchemas = schemas.filter(s => s.toLowerCase().includes("typescript"));
 */
export async function listSchemaStoreSchemas(): Promise<string[]> {
    try {
        const catalogUrl = "https://www.schemastore.org/api/json/catalog.json";
        const catalogContent = await fetchUrl(catalogUrl);
        const catalog = JSON.parse(catalogContent) as { schemas: SchemaStoreCatalogEntry[] };
        return catalog.schemas.map((s) => s.name);
    } catch {
        return [];
    }
}

/**
 * Downloads a schema file from a GitHub repository.
 * Tracks the git commit SHA for version management and update detection.
 *
 * @param {string} repo - GitHub repository in "owner/repo" format
 * @param {string} filePath - Path to the schema file within the repository
 * @param {string} [branch="main"] - Branch to download from
 * @param {string} standardsDir - Directory to save the downloaded schema
 * @param {SchemaRegistry} registry - Registry object to update with download info
 * @param {Function} saveRegistryFn - Callback function to persist registry changes
 * @returns {Promise<DownloadResult>} Result indicating success/failure with path or error
 *
 * @example
 * const result = await downloadFromGitHub(
 *   "SchemaStore/schemastore",
 *   "src/schemas/json/package.json",
 *   "master",
 *   "./schemas",
 *   registry,
 *   saveRegistry
 * );
 */
export async function downloadFromGitHub(
    repo: string,
    filePath: string,
    branch: string = "main",
    standardsDir: string,
    registry: SchemaRegistry,
    saveRegistryFn: () => void
): Promise<DownloadResult> {
    const name = path.basename(filePath, ".json");

    try {
        // Get the latest commit SHA for version tracking
        const commitUrl = `https://api.github.com/repos/${repo}/commits/${branch}`;
        const commitResponse = await fetchUrl(commitUrl);
        const commitData = JSON.parse(commitResponse);
        const commitSha = commitData.sha as string;

        // Download the raw file
        const rawUrl = `https://raw.githubusercontent.com/${repo}/${branch}/${filePath}`;
        const content = await fetchUrl(rawUrl);

        // Validate it's valid JSON
        JSON.parse(content);

        const sanitizedName = sanitizeFileName(name);
        const localPath = path.join(standardsDir, `${sanitizedName}.json`);

        ensureDir(standardsDir);
        fs.writeFileSync(localPath, content, "utf-8");

        registry.schemas[name] = {
            name,
            version: commitSha.substring(0, 7),
            url: rawUrl,
            downloadedAt: new Date().toISOString(),
            localPath,
            gitCommit: commitSha,
            gitRepo: repo,
        };
        saveRegistryFn();

        return { success: true, path: localPath };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

/**
 * Checks if a GitHub-sourced schema has updates available.
 * Compares the stored commit SHA with the latest commit on the main branch.
 *
 * @param {SchemaMetadata|undefined} metadata - Metadata for a previously downloaded schema
 * @returns {Promise<Object>} Object with hasUpdate boolean and commit SHA information
 * @returns {boolean} returns.hasUpdate - True if newer commit exists
 * @returns {string} [returns.currentCommit] - Currently stored commit SHA
 * @returns {string} [returns.latestCommit] - Latest commit SHA from GitHub
 *
 * @example
 * const metadata = registry.schemas["my-schema"];
 * const update = await checkGitHubUpdate(metadata);
 * if (update.hasUpdate) {
 *   console.log(`Update available: ${update.currentCommit} -> ${update.latestCommit}`);
 * }
 */
export async function checkGitHubUpdate(
    metadata: SchemaMetadata | undefined
): Promise<{ hasUpdate: boolean; currentCommit?: string; latestCommit?: string }> {
    if (!metadata || !metadata.gitRepo || !metadata.gitCommit) {
        return { hasUpdate: false };
    }

    try {
        const commitUrl = `https://api.github.com/repos/${metadata.gitRepo}/commits/main`;
        const commitResponse = await fetchUrl(commitUrl);
        const commitData = JSON.parse(commitResponse);
        const latestCommit = commitData.sha as string;

        return {
            hasUpdate: latestCommit !== metadata.gitCommit,
            currentCommit: metadata.gitCommit,
            latestCommit,
        };
    } catch {
        return { hasUpdate: false };
    }
}
