/**
 * E2E Test Helpers - Utilities for end-to-end and integration testing
 *
 * Runs the built JaySON CLI as a subprocess and provides helpers for
 * workflow testing, file assertions, and integration with the API.
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

// Paths
const PROJECT_ROOT = path.resolve(process.cwd());
export const CLI_PATH = path.join(PROJECT_ROOT, "dist", "esm", "cli.js");
export const FIXTURES_DIR = path.join(PROJECT_ROOT, "testing-suite", "fixtures");
export const SCHEMAS_DIR = path.join(FIXTURES_DIR, "schemas");
export const DATA_DIR = path.join(FIXTURES_DIR, "data");
export const E2E_TEMP_DIR = path.join(PROJECT_ROOT, "testing-suite", ".temp", "e2e");

export interface CLIRunResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}

/**
 * Run the JaySON CLI with given arguments.
 * Requires the project to be built (npm run build).
 */
export function runCLI(args: string, cwd?: string): CLIRunResult {
    const workDir = cwd ?? PROJECT_ROOT;
    try {
        const stdout = execSync(`node "${CLI_PATH}" ${args}`, {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
            cwd: workDir,
        });
        return { stdout, stderr: "", exitCode: 0 };
    } catch (error: unknown) {
        const execError = error as { stdout?: Buffer | string; stderr?: Buffer | string; status?: number };
        const stdout = String(execError.stdout ?? "");
        const stderr = String(execError.stderr ?? "");
        const exitCode = execError.status ?? 1;
        return { stdout, stderr, exitCode };
    }
}

/**
 * Ensure the project is built before running E2E tests.
 * Throws if dist/esm/cli.js does not exist.
 */
export function ensureBuilt(): void {
    if (!fs.existsSync(CLI_PATH)) {
        throw new Error(
            `E2E tests require a build. Run: npm run build\nMissing: ${CLI_PATH}`
        );
    }
}

/**
 * Create an isolated temp directory for E2E workflow tests.
 * Returns the absolute path. Cleans up existing content.
 */
export function createE2ETempDir(name: string): string {
    const dirPath = path.join(E2E_TEMP_DIR, name);
    if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
    }
    fs.mkdirSync(dirPath, { recursive: true });
    return dirPath;
}

/**
 * Clean up an E2E temp directory.
 */
export function cleanupE2ETempDir(name: string): void {
    const dirPath = path.join(E2E_TEMP_DIR, name);
    if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
    }
}

/**
 * Assert a file exists and contains the given string.
 */
export function assertFileExists(filePath: string): void {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Expected file to exist: ${filePath}`);
    }
}

/**
 * Assert a file contains the given string.
 */
export function assertFileContains(filePath: string, content: string): void {
    assertFileExists(filePath);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    if (!fileContent.includes(content)) {
        throw new Error(
            `Expected file to contain "${content}"\nFile: ${filePath}\nContent (first 200 chars): ${fileContent.slice(0, 200)}...`
        );
    }
}

/**
 * Assert a file does not exist.
 */
export function assertFileDoesNotExist(filePath: string): void {
    if (fs.existsSync(filePath)) {
        throw new Error(`Expected file to NOT exist: ${filePath}`);
    }
}

/**
 * Write JSON to a file.
 */
export function writeJsonFile(filePath: string, data: unknown): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Read JSON from a file.
 */
export function readJsonFile<T = unknown>(filePath: string): T {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as T;
}

/**
 * Copy a fixture file to a destination.
 */
export function copyFixture(
    type: "schema" | "data",
    filename: string,
    destPath: string
): void {
    const src = type === "schema" ? SCHEMAS_DIR : DATA_DIR;
    const srcPath = path.join(src, filename);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
}
