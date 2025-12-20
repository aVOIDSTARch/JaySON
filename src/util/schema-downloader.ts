/**
 * Schema Downloader - Download schemas from various sources
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
 * Download a JSON Schema meta-schema by version
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
 * Download all JSON Schema meta-schemas
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
 * Download a schema from a URL
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
 * Download schemas from SchemaStore catalog
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
 * List available schemas from SchemaStore
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
 * Download a schema from a GitHub repository
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
 * Check if a GitHub-sourced schema has updates available
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
