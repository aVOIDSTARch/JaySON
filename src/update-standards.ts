/**
 * Update Standards Module
 * Provides functionality to download and update JSON Schema standards
 *
 * This module re-exports utilities from focused submodules in util/
 */

import * as fs from "fs";
import * as path from "path";

// Re-export constants and types
export {
    JSON_SCHEMA_VERSIONS,
    SCHEMA_URL_TO_VERSION,
    type JsonSchemaVersion,
    type DetectedStandard,
    type SchemaMetadata,
    type DownloadResult,
    type UpdateResult,
} from "./util/schema-constants.js";

// Import for internal use
import {
    type JsonSchemaVersion,
    type SchemaMetadata,
    type DownloadResult,
    type UpdateResult,
} from "./util/schema-constants.js";

import { checkInternetAccess as checkInternet } from "./util/http-client.js";
import {
    type SchemaRegistry,
    loadRegistry,
    saveRegistry as saveReg,
    ensureDir,
    needsUpdate as checkNeedsUpdate,
} from "./util/schema-registry.js";
import {
    detectStandard as detect,
    getAvailableStandards as getStandards,
} from "./util/standard-detection.js";
import {
    downloadMetaSchema as downloadMeta,
    downloadAllMetaSchemas as downloadAllMeta,
    downloadSchema as downloadSch,
    downloadFromSchemaStore as downloadFromStore,
    listSchemaStoreSchemas as listStoreSchemas,
    downloadFromGitHub as downloadGH,
    checkGitHubUpdate as checkGHUpdate,
} from "./util/schema-downloader.js";

/**
 * Standards Updater class for downloading and managing JSON schemas
 */
export class StandardsUpdater {
    private standardsDir: string;
    private registryPath: string;
    private registry: SchemaRegistry;

    constructor(standardsDir: string = "./json-standards") {
        this.standardsDir = standardsDir;
        this.registryPath = path.join(standardsDir, "registry.json");
        this.registry = loadRegistry(this.registryPath);
    }

    /**
     * Initialize the standards directory
     */
    init(): void {
        ensureDir(this.standardsDir);
        this.saveRegistry();
    }

    /**
     * Check if internet is available
     */
    async checkInternetAccess(): Promise<boolean> {
        return checkInternet();
    }

    /**
     * Detect the JSON Schema standard used in a schema object or file
     */
    detectStandard(schemaOrPath: unknown | string) {
        return detect(schemaOrPath);
    }

    /**
     * Get list of available standards
     */
    getAvailableStandards() {
        return getStandards(this.registry.schemas);
    }

    /**
     * Check for updates on all downloaded schemas
     */
    async checkForUpdates(): Promise<Array<{ name: string; currentVersion: string; hasUpdate: boolean }>> {
        const results: Array<{ name: string; currentVersion: string; hasUpdate: boolean }> = [];

        for (const [name, metadata] of Object.entries(this.registry.schemas)) {
            if (metadata.gitRepo && metadata.gitCommit) {
                const check = await this.checkGitHubUpdate(name);
                results.push({
                    name,
                    currentVersion: metadata.version,
                    hasUpdate: check.hasUpdate,
                });
            } else {
                results.push({
                    name,
                    currentVersion: metadata.version,
                    hasUpdate: this.needsUpdate(name, 30),
                });
            }
        }

        return results;
    }

    /**
     * Download a JSON Schema meta-schema by version
     */
    async downloadMetaSchema(version: JsonSchemaVersion): Promise<DownloadResult> {
        return downloadMeta(version, this.standardsDir, this.registry, () => this.saveRegistry());
    }

    /**
     * Download all JSON Schema meta-schemas
     */
    async downloadAllMetaSchemas(): Promise<UpdateResult> {
        return downloadAllMeta(this.standardsDir, this.registry, () => this.saveRegistry());
    }

    /**
     * Download a schema from a URL
     */
    async downloadSchema(name: string, url: string, version: string = "latest"): Promise<DownloadResult> {
        return downloadSch(name, url, version, this.standardsDir, this.registry, () => this.saveRegistry());
    }

    /**
     * Download schemas from SchemaStore catalog
     */
    async downloadFromSchemaStore(schemaNames: string[]): Promise<UpdateResult> {
        return downloadFromStore(schemaNames, this.standardsDir, this.registry, () => this.saveRegistry());
    }

    /**
     * List available schemas from SchemaStore
     */
    async listSchemaStoreSchemas(): Promise<string[]> {
        return listStoreSchemas();
    }

    /**
     * Update a previously downloaded schema
     */
    async updateSchema(name: string): Promise<DownloadResult> {
        const metadata = this.registry.schemas[name];
        if (!metadata) {
            return { success: false, error: `Schema '${name}' not found in registry` };
        }
        return this.downloadSchema(name, metadata.url, metadata.version);
    }

    /**
     * Update all downloaded schemas
     */
    async updateAllSchemas(): Promise<UpdateResult> {
        const result: UpdateResult = { updated: [], failed: [], skipped: [] };

        for (const name of Object.keys(this.registry.schemas)) {
            const updateResult = await this.updateSchema(name);
            if (updateResult.success) {
                result.updated.push(name);
            } else {
                result.failed.push({ name, error: updateResult.error || "Unknown error" });
            }
        }

        this.registry.lastUpdated = new Date().toISOString();
        this.saveRegistry();

        return result;
    }

    /**
     * Get metadata for a downloaded schema
     */
    getSchemaMetadata(name: string): SchemaMetadata | undefined {
        return this.registry.schemas[name];
    }

    /**
     * List all downloaded schemas
     */
    listDownloadedSchemas(): SchemaMetadata[] {
        return Object.values(this.registry.schemas);
    }

    /**
     * Remove a downloaded schema
     */
    removeSchema(name: string): boolean {
        const metadata = this.registry.schemas[name];
        if (!metadata) {
            return false;
        }

        if (fs.existsSync(metadata.localPath)) {
            fs.unlinkSync(metadata.localPath);
        }

        delete this.registry.schemas[name];
        this.saveRegistry();
        return true;
    }

    /**
     * Get the local path for a schema
     */
    getSchemaPath(name: string): string | undefined {
        return this.registry.schemas[name]?.localPath;
    }

    /**
     * Check if a schema needs updating (older than specified days)
     */
    needsUpdate(name: string, maxAgeDays: number = 30): boolean {
        return checkNeedsUpdate(this.registry.schemas[name], maxAgeDays);
    }

    /**
     * Download a schema from a GitHub repository
     */
    async downloadFromGitHub(repo: string, filePath: string, branch: string = "main"): Promise<DownloadResult> {
        return downloadGH(repo, filePath, branch, this.standardsDir, this.registry, () => this.saveRegistry());
    }

    /**
     * Check if a GitHub-sourced schema has updates available
     */
    async checkGitHubUpdate(name: string): Promise<{ hasUpdate: boolean; currentCommit?: string; latestCommit?: string }> {
        return checkGHUpdate(this.registry.schemas[name]);
    }

    /**
     * Update a GitHub-sourced schema if new commits are available
     */
    async updateFromGitHub(name: string): Promise<DownloadResult> {
        const metadata = this.registry.schemas[name];
        if (!metadata || !metadata.gitRepo) {
            return { success: false, error: `Schema '${name}' is not from GitHub` };
        }

        const check = await this.checkGitHubUpdate(name);
        if (!check.hasUpdate) {
            return { success: true, path: metadata.localPath };
        }

        const urlParts = metadata.url.split(`${metadata.gitRepo}/main/`);
        if (urlParts.length !== 2) {
            return { success: false, error: "Could not determine file path from URL" };
        }

        return this.downloadFromGitHub(metadata.gitRepo, urlParts[1]);
    }

    private saveRegistry(): void {
        saveReg(this.registryPath, this.registry, this.standardsDir);
    }
}

// Export a default instance
export const standardsUpdater = new StandardsUpdater();

// Convenience functions
export async function downloadMetaSchema(version: JsonSchemaVersion): Promise<DownloadResult> {
    return standardsUpdater.downloadMetaSchema(version);
}

export async function downloadSchema(name: string, url: string): Promise<DownloadResult> {
    return standardsUpdater.downloadSchema(name, url);
}

export async function downloadFromGitHub(repo: string, filePath: string, branch?: string): Promise<DownloadResult> {
    return standardsUpdater.downloadFromGitHub(repo, filePath, branch);
}

export async function checkGitHubUpdate(name: string): Promise<{ hasUpdate: boolean; currentCommit?: string; latestCommit?: string }> {
    return standardsUpdater.checkGitHubUpdate(name);
}

export async function updateAllSchemas(): Promise<UpdateResult> {
    return standardsUpdater.updateAllSchemas();
}

export function listDownloadedSchemas(): SchemaMetadata[] {
    return standardsUpdater.listDownloadedSchemas();
}

export async function checkInternetAccess(): Promise<boolean> {
    return standardsUpdater.checkInternetAccess();
}

export function detectStandard(schemaOrPath: unknown | string) {
    return standardsUpdater.detectStandard(schemaOrPath);
}

export function getAvailableStandards() {
    return standardsUpdater.getAvailableStandards();
}

export async function checkForUpdates() {
    return standardsUpdater.checkForUpdates();
}
