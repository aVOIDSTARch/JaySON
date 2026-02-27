/**
 * End-to-End Tests
 *
 * Runs the built JaySON CLI as a black box and verifies complete workflows.
 * Requires: npm run build (or npm run test:all)
 */

import { describe, it, expect, beforeAll, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
    runCLI,
    ensureBuilt,
    createE2ETempDir,
    cleanupE2ETempDir,
    assertFileExists,
    assertFileContains,
    assertFileDoesNotExist,
    writeJsonFile,
    copyFixture,
    SCHEMAS_DIR,
    DATA_DIR,
} from "./e2e-helpers.js";

describe("E2E: Full Workflows", () => {
    beforeAll(() => {
        ensureBuilt();
    });

    afterEach(() => {
        cleanupE2ETempDir("workflow");
    });

    describe("init → validate → report workflow", () => {
        it("should init project, validate data, and generate report", () => {
            const workDir = createE2ETempDir("workflow");

            // 1. Init
            const initResult = runCLI(`init --dir ${workDir}`, workDir);
            expect(initResult.exitCode).toBe(0);
            expect(initResult.stdout).toContain("initialized successfully");
            assertFileExists(path.join(workDir, "jayson.json"));
            assertFileExists(path.join(workDir, "json-schema"));

            // 2. Copy schema and data into project (init creates json-schema; we add data/)
            copyFixture("schema", "user.schema.json", path.join(workDir, "json-schema", "user.schema.json"));
            const dataDir = path.join(workDir, "data");
            fs.mkdirSync(dataDir, { recursive: true });
            copyFixture("data", "valid-user.json", path.join(dataDir, "valid-user.json"));
            copyFixture("data", "invalid-user.json", path.join(dataDir, "invalid-user.json"));

            const schemaPath = path.join(workDir, "json-schema", "user.schema.json");
            const validPath = path.join(workDir, "data", "valid-user.json");
            const invalidPath = path.join(workDir, "data", "invalid-user.json");

            // 3. Validate valid file
            const validResult = runCLI(
                `validate ${validPath} --schema ${schemaPath} --no-update-check`,
                workDir
            );
            expect(validResult.exitCode).toBe(0);
            expect(validResult.stdout).toContain("PASS");

            // 4. Validate invalid file
            const invalidResult = runCLI(
                `validate ${invalidPath} --schema ${schemaPath} --no-update-check`,
                workDir
            );
            expect(invalidResult.exitCode).toBe(1);
            expect(invalidResult.stdout).toContain("FAIL");

            // 5. Generate report (terminal)
            const reportResult = runCLI(
                `report ${validPath} --schema ${schemaPath}`,
                workDir
            );
            expect(reportResult.exitCode).toBe(0);
            expect(reportResult.stdout).toContain("Validation Report");

            // 6. Generate report to file (markdown)
            const reportPath = path.join(workDir, "report.md");
            const reportFileResult = runCLI(
                `report ${invalidPath} -s ${schemaPath} -f markdown -o ${reportPath}`,
                workDir
            );
            expect(reportFileResult.exitCode).toBe(0);
            assertFileExists(reportPath);
            assertFileContains(reportPath, "# Validation Report");
        });
    });

    describe("validate → generate types workflow", () => {
        it("should validate data then generate TypeScript/JS from schema", () => {
            const workDir = createE2ETempDir("workflow");
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const dataPath = path.join(DATA_DIR, "valid-user.json");
            const outputDir = path.join(workDir, "types");

            // 1. Validate
            const validateResult = runCLI(
                `validate ${dataPath} --schema ${schemaPath} --no-update-check`,
                workDir
            );
            expect(validateResult.exitCode).toBe(0);

            // 2. Generate types
            const generateResult = runCLI(
                `generate ${schemaPath} --output ${outputDir}`,
                workDir
            );
            expect(generateResult.exitCode).toBe(0);
            expect(generateResult.stdout).toContain("Generated");

            assertFileExists(path.join(outputDir, "User.ts"));
            assertFileExists(path.join(outputDir, "User.js"));
            assertFileContains(path.join(outputDir, "User.ts"), "export interface User");
        });
    });

    describe("init → generate → validate workflow", () => {
        it("should init, generate types, then validate with schema", () => {
            const workDir = createE2ETempDir("workflow");

            // 1. Init
            runCLI(`init --dir ${workDir}`, workDir);
            copyFixture("schema", "user.schema.json", path.join(workDir, "json-schema", "user.schema.json"));

            const schemaPath = path.join(workDir, "json-schema", "user.schema.json");
            const typesDir = path.join(workDir, "generated-types");

            // 2. Generate types
            const genResult = runCLI(`generate ${schemaPath} -o ${typesDir} --typescript`, workDir);
            expect(genResult.exitCode).toBe(0);

            // 3. Create and validate data
            const dataPath = path.join(workDir, "data", "test-user.json");
            writeJsonFile(dataPath, {
                id: 1,
                name: "E2E Test",
                email: "e2e@test.com",
            });

            const validateResult = runCLI(
                `validate ${dataPath} --schema ${schemaPath} --no-update-check`,
                workDir
            );
            expect(validateResult.exitCode).toBe(0);
        });
    });

    describe("Report formats", () => {
        it("should generate all report formats (terminal, markdown, html)", () => {
            const workDir = createE2ETempDir("workflow");
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const dataPath = path.join(DATA_DIR, "invalid-user.json");
            const outputDir = path.join(workDir, "reports");

            const result = runCLI(
                `report ${dataPath} -s ${schemaPath} --all -o ${outputDir}`,
                workDir
            );

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain("Generated reports");

            const files = fs.readdirSync(outputDir);
            expect(files.some((f: string) => f.endsWith(".txt"))).toBe(true);
            expect(files.some((f: string) => f.endsWith(".md"))).toBe(true);
            expect(files.some((f: string) => f.endsWith(".html"))).toBe(true);
        });
    });

    describe("Error handling", () => {
        it("should fail gracefully for missing schema", () => {
            const workDir = createE2ETempDir("workflow");
            const dataPath = path.join(DATA_DIR, "valid-user.json");

            const result = runCLI(`validate ${dataPath}`, workDir);
            expect(result.exitCode).toBe(1);
            expect(result.stdout).toContain("--schema is required");
        });

        it("should fail gracefully for missing file", () => {
            const workDir = createE2ETempDir("workflow");
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");

            const result = runCLI(
                `validate /nonexistent/path.json --schema ${schemaPath} --no-update-check`,
                workDir
            );
            expect(result.exitCode).toBe(1);
            expect(result.stdout).toContain("File not found");
        });

        it("should fail for init without --force when already initialized", () => {
            const workDir = createE2ETempDir("workflow");
            runCLI(`init --dir ${workDir}`, workDir);

            const result = runCLI(`init --dir ${workDir}`, workDir);
            expect(result.exitCode).toBe(1);
            expect(result.stdout).toContain("already initialized");
        });
    });
});
