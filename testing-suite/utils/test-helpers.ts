/**
 * Test Helpers - Utility functions for testing
 */

import * as fs from "fs";
import * as path from "path";
import { execSync, exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Paths
export const FIXTURES_DIR = path.join(__dirname, "..", "fixtures");
export const SCHEMAS_DIR = path.join(FIXTURES_DIR, "schemas");
export const DATA_DIR = path.join(FIXTURES_DIR, "data");
export const TEMP_DIR = path.join(__dirname, "..", ".temp");
export const OUTPUT_DIR = path.join(__dirname, "..", ".test-output");

/**
 * Get the path to a fixture file
 */
export function getFixturePath(type: "schema" | "data", filename: string): string {
    const baseDir = type === "schema" ? SCHEMAS_DIR : DATA_DIR;
    return path.join(baseDir, filename);
}

/**
 * Load a JSON fixture file
 */
export function loadFixture<T = unknown>(type: "schema" | "data", filename: string): T {
    const filePath = getFixturePath(type, filename);
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as T;
}

/**
 * Create a temporary file with content
 */
export function createTempFile(filename: string, content: string | object): string {
    ensureDir(TEMP_DIR);
    const filePath = path.join(TEMP_DIR, filename);
    const contentStr = typeof content === "string" ? content : JSON.stringify(content, null, 2);
    fs.writeFileSync(filePath, contentStr, "utf-8");
    return filePath;
}

/**
 * Create a temporary directory
 */
export function createTempDir(dirname: string): string {
    const dirPath = path.join(TEMP_DIR, dirname);
    ensureDir(dirPath);
    return dirPath;
}

/**
 * Clean up a temporary file or directory
 */
export function cleanupTemp(name: string): void {
    const targetPath = path.join(TEMP_DIR, name);
    if (fs.existsSync(targetPath)) {
        const stat = fs.statSync(targetPath);
        if (stat.isDirectory()) {
            fs.rmSync(targetPath, { recursive: true });
        } else {
            fs.unlinkSync(targetPath);
        }
    }
}

/**
 * Ensure a directory exists
 */
export function ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

/**
 * Read file content
 */
export function readFile(filePath: string): string {
    return fs.readFileSync(filePath, "utf-8");
}

/**
 * Check if file exists
 */
export function fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
}

/**
 * Execute CLI command and return output
 */
export async function runCLI(args: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const cliPath = path.join(process.cwd(), "dist", "esm", "cli.js");

    try {
        const { stdout, stderr } = await execAsync(`node ${cliPath} ${args}`);
        return { stdout, stderr, exitCode: 0 };
    } catch (error: unknown) {
        const execError = error as { stdout?: string; stderr?: string; code?: number };
        return {
            stdout: execError.stdout || "",
            stderr: execError.stderr || "",
            exitCode: execError.code || 1,
        };
    }
}

/**
 * Execute CLI command synchronously
 */
export function runCLISync(args: string): { stdout: string; exitCode: number } {
    const cliPath = path.join(process.cwd(), "dist", "esm", "cli.js");

    try {
        const stdout = execSync(`node ${cliPath} ${args}`, { encoding: "utf-8" });
        return { stdout, exitCode: 0 };
    } catch (error: unknown) {
        const execError = error as { stdout?: string; status?: number };
        return {
            stdout: execError.stdout || "",
            exitCode: execError.status || 1,
        };
    }
}

/**
 * Generate a unique test ID
 */
export function generateTestId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Wait for a specified duration
 */
export function wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a mock schema for testing
 */
export function createMockSchema(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        $schema: "http://json-schema.org/draft-07/schema#",
        title: "MockSchema",
        type: "object",
        properties: {
            id: { type: "integer" },
            name: { type: "string" },
        },
        required: ["id"],
        ...overrides,
    };
}

/**
 * Create mock validation data
 */
export function createMockData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        id: 1,
        name: "Test",
        ...overrides,
    };
}

/**
 * Assert that a file contains specific content
 */
export function assertFileContains(filePath: string, content: string): boolean {
    const fileContent = readFile(filePath);
    return fileContent.includes(content);
}

/**
 * Get all files in a directory matching a pattern
 */
export function getFilesInDir(dirPath: string, extension?: string): string[] {
    if (!fs.existsSync(dirPath)) {
        return [];
    }

    const files = fs.readdirSync(dirPath);

    if (extension) {
        return files.filter((f) => f.endsWith(extension));
    }

    return files;
}
