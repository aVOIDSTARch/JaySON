/**
 * CLI Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import {
    SCHEMAS_DIR,
    DATA_DIR,
    TEMP_DIR,
    ensureDir,
    createTempFile,
    createTempDir,
} from "../utils/test-helpers.js";

const CLI_PATH = path.join(process.cwd(), "dist", "esm", "cli.js");

function runCLI(args: string): { stdout: string; stderr: string; exitCode: number } {
    try {
        const stdout = execSync(`node ${CLI_PATH} ${args}`, {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
        });
        return { stdout, stderr: "", exitCode: 0 };
    } catch (error: unknown) {
        const execError = error as { stdout?: string; stderr?: string; status?: number };
        return {
            stdout: execError.stdout || "",
            stderr: execError.stderr || "",
            exitCode: execError.status || 1,
        };
    }
}

describe("CLI", () => {
    beforeEach(() => {
        ensureDir(TEMP_DIR);
    });

    afterEach(() => {
        // Clean up temp files
        if (fs.existsSync(TEMP_DIR)) {
            const files = fs.readdirSync(TEMP_DIR);
            for (const file of files) {
                const filePath = path.join(TEMP_DIR, file);
                if (fs.statSync(filePath).isDirectory()) {
                    fs.rmSync(filePath, { recursive: true });
                } else {
                    fs.unlinkSync(filePath);
                }
            }
        }
    });

    describe("Help Output", () => {
        it("should display main help with --help", () => {
            const result = runCLI("--help");

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain("JaySON");
            expect(result.stdout).toContain("COMMANDS:");
            expect(result.stdout).toContain("init");
            expect(result.stdout).toContain("validate");
            expect(result.stdout).toContain("report");
            expect(result.stdout).toContain("generate");
        });

        it("should display help without any arguments", () => {
            const result = runCLI("");

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain("JaySON");
        });

        it("should display version with --version", () => {
            const result = runCLI("--version");

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain("1.0.0");
        });

        it("should display validate command help", () => {
            const result = runCLI("validate --help");

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain("jayson validate");
            expect(result.stdout).toContain("--schema");
        });

        it("should display report command help", () => {
            const result = runCLI("report --help");

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain("jayson report");
            expect(result.stdout).toContain("--format");
        });

        it("should display generate command help", () => {
            const result = runCLI("generate --help");

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain("jayson generate");
            expect(result.stdout).toContain("--typescript");
            expect(result.stdout).toContain("--javascript");
        });

        it("should display init command help", () => {
            const result = runCLI("init --help");

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain("jayson init");
        });

        it("should display update command help", () => {
            const result = runCLI("update --help");

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain("jayson update");
        });

        it("should display detect command help", () => {
            const result = runCLI("detect --help");

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain("jayson detect");
        });

        it("should display help using help command", () => {
            const result = runCLI("help validate");

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain("jayson validate");
        });
    });

    describe("Validate Command", () => {
        it("should validate a valid JSON file", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const dataPath = path.join(DATA_DIR, "valid-user.json");

            const result = runCLI(`validate ${dataPath} --schema ${schemaPath} --no-update-check`);

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain("PASS");
        });

        it("should fail for invalid JSON file", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const dataPath = path.join(DATA_DIR, "invalid-user.json");

            const result = runCLI(`validate ${dataPath} --schema ${schemaPath} --no-update-check`);

            expect(result.exitCode).toBe(1);
            expect(result.stdout).toContain("FAIL");
        });

        it("should error when schema is not provided", () => {
            const result = runCLI("validate test.json");

            expect(result.exitCode).toBe(1);
            expect(result.stdout).toContain("--schema is required");
        });

        it("should error when no files are provided", () => {
            const result = runCLI("validate --schema schema.json");

            expect(result.exitCode).toBe(1);
            expect(result.stdout).toContain("No files specified");
        });

        it("should handle non-existent file", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");

            const result = runCLI(`validate /nonexistent.json --schema ${schemaPath} --no-update-check`);

            expect(result.exitCode).toBe(1);
            expect(result.stdout).toContain("File not found");
        });

        it("should support short option -s for schema", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const dataPath = path.join(DATA_DIR, "valid-user.json");

            const result = runCLI(`validate ${dataPath} -s ${schemaPath} --no-update-check`);

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain("PASS");
        });

        it("should support quiet mode", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const dataPath = path.join(DATA_DIR, "valid-user.json");

            const result = runCLI(`validate ${dataPath} -s ${schemaPath} --quiet --no-update-check`);

            expect(result.exitCode).toBe(0);
            // In quiet mode, no PASS message for valid files
            expect(result.stdout).not.toContain("PASS");
        });
    });

    describe("Report Command", () => {
        it("should generate terminal report to stdout", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const dataPath = path.join(DATA_DIR, "valid-user.json");

            const result = runCLI(`report ${dataPath} --schema ${schemaPath}`);

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain("Validation Report");
        });

        it("should generate report to file", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const dataPath = path.join(DATA_DIR, "valid-user.json");
            const outputPath = path.join(TEMP_DIR, "report.md");

            const result = runCLI(`report ${dataPath} -s ${schemaPath} -f markdown -o ${outputPath}`);

            expect(result.exitCode).toBe(0);
            expect(fs.existsSync(outputPath)).toBe(true);
            const content = fs.readFileSync(outputPath, "utf-8");
            expect(content).toContain("# Validation Report");
        });

        it("should generate HTML report", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const dataPath = path.join(DATA_DIR, "valid-user.json");
            const outputPath = path.join(TEMP_DIR, "report.html");

            const result = runCLI(`report ${dataPath} -s ${schemaPath} -f html -o ${outputPath}`);

            expect(result.exitCode).toBe(0);
            const content = fs.readFileSync(outputPath, "utf-8");
            expect(content).toContain("<!DOCTYPE html>");
        });

        it("should generate all format reports", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const dataPath = path.join(DATA_DIR, "valid-user.json");
            const outputDir = createTempDir("cli-reports");

            const result = runCLI(`report ${dataPath} -s ${schemaPath} --all -o ${outputDir}`);

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain("Generated reports");
        });

        it("should error when schema is not provided", () => {
            const result = runCLI("report test.json");

            expect(result.exitCode).toBe(1);
            expect(result.stdout).toContain("--schema is required");
        });
    });

    describe("Generate Command", () => {
        it("should generate TypeScript and JavaScript files", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const outputDir = createTempDir("cli-generate");

            const result = runCLI(`generate ${schemaPath} --output ${outputDir}`);

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain("Generated");

            const files = fs.readdirSync(outputDir);
            expect(files.some((f) => f.endsWith(".ts"))).toBe(true);
            expect(files.some((f) => f.endsWith(".js"))).toBe(true);
        });

        it("should generate TypeScript only", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const outputDir = createTempDir("cli-generate-ts");

            const result = runCLI(`generate ${schemaPath} -o ${outputDir} --typescript`);

            expect(result.exitCode).toBe(0);

            const files = fs.readdirSync(outputDir);
            expect(files.some((f) => f.endsWith(".ts"))).toBe(true);
            expect(files.some((f) => f.endsWith(".js"))).toBe(false);
        });

        it("should generate JavaScript only", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const outputDir = createTempDir("cli-generate-js");

            const result = runCLI(`generate ${schemaPath} -o ${outputDir} --javascript`);

            expect(result.exitCode).toBe(0);

            const files = fs.readdirSync(outputDir);
            expect(files.some((f) => f.endsWith(".js"))).toBe(true);
            expect(files.some((f) => f.endsWith(".ts"))).toBe(false);
        });

        it("should use custom name", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const outputDir = createTempDir("cli-generate-custom");

            const result = runCLI(`generate ${schemaPath} -o ${outputDir} -n CustomUser`);

            expect(result.exitCode).toBe(0);
            expect(fs.existsSync(path.join(outputDir, "CustomUser.ts"))).toBe(true);
        });

        it("should error for non-existent schema", () => {
            const result = runCLI("generate /nonexistent.json");

            expect(result.exitCode).toBe(1);
            expect(result.stdout).toContain("not found");
        });
    });

    describe("Init Command", () => {
        it("should initialize project in directory", () => {
            const initDir = createTempDir("cli-init");

            const result = runCLI(`init --dir ${initDir}`);

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain("initialized successfully");
            expect(fs.existsSync(path.join(initDir, "jayson.json"))).toBe(true);
            expect(fs.existsSync(path.join(initDir, "json-schema"))).toBe(true);
        });

        it("should not overwrite without --force", () => {
            const initDir = createTempDir("cli-init-exists");
            fs.writeFileSync(path.join(initDir, "jayson.json"), "{}", "utf-8");

            const result = runCLI(`init --dir ${initDir}`);

            expect(result.exitCode).toBe(1);
            expect(result.stdout).toContain("already initialized");
        });

        it("should overwrite with --force", () => {
            const initDir = createTempDir("cli-init-force");
            fs.writeFileSync(path.join(initDir, "jayson.json"), "{}", "utf-8");

            const result = runCLI(`init --dir ${initDir} --force`);

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain("initialized successfully");
        });
    });

    describe("Detect Command", () => {
        it("should detect schema version", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");

            const result = runCLI(`detect ${schemaPath}`);

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain("Detected");
            expect(result.stdout).toContain("draft-07");
        });

        it("should error for non-existent file", () => {
            const result = runCLI("detect /nonexistent.json");

            expect(result.exitCode).toBe(1);
            expect(result.stdout).toContain("not found");
        });
    });

    describe("Unknown Command", () => {
        it("should error for unknown command", () => {
            const result = runCLI("unknowncommand");

            expect(result.exitCode).toBe(1);
            expect(result.stdout).toContain("Unknown command");
        });
    });
});
