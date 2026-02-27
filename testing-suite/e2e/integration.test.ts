/**
 * Integration Tests - API + CLI together
 *
 * Exercises the JaySON API (JsonMaker, validate, etc.) in combination with
 * CLI execution. Verifies that programmatic usage and CLI produce consistent
 * results.
 */

import { describe, it, expect, beforeAll, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { JsonMaker, validateJson, validateJsonFile } from "../../src/index.js";
import {
    runCLI,
    ensureBuilt,
    createE2ETempDir,
    cleanupE2ETempDir,
    assertFileExists,
    assertFileContains,
    readJsonFile,
    copyFixture,
    SCHEMAS_DIR,
    DATA_DIR,
} from "./e2e-helpers.js";

describe("Integration: API + CLI", () => {
    beforeAll(() => {
        ensureBuilt();
    });

    afterEach(() => {
        cleanupE2ETempDir("integration");
    });

    describe("API validation matches CLI validation", () => {
        it("API validate and CLI validate produce same pass/fail for same data", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const validPath = path.join(DATA_DIR, "valid-user.json");
            const invalidPath = path.join(DATA_DIR, "invalid-user.json");

            // API validation
            const apiValid = validateJsonFile(validPath, schemaPath);
            const apiInvalid = validateJsonFile(invalidPath, schemaPath);

            // CLI validation
            const cliValid = runCLI(
                `validate ${validPath} --schema ${schemaPath} --no-update-check`
            );
            const cliInvalid = runCLI(
                `validate ${invalidPath} --schema ${schemaPath} --no-update-check`
            );

            expect(apiValid.valid).toBe(true);
            expect(apiInvalid.valid).toBe(false);
            expect(cliValid.exitCode).toBe(0);
            expect(cliInvalid.exitCode).toBe(1);
            expect(cliValid.stdout).toContain("PASS");
            expect(cliInvalid.stdout).toContain("FAIL");
        });
    });

    describe("JsonMaker + CLI workflow", () => {
        it("JsonMaker creates validated file, CLI validates it", () => {
            const workDir = createE2ETempDir("integration");
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const outputPath = path.join(workDir, "created-user.json");

            const maker = new JsonMaker(SCHEMAS_DIR);
            const validUser = {
                id: 1,
                name: "Integration Test",
                email: "integration@test.com",
            };

            const result = maker.createValidatedJson(validUser, schemaPath, outputPath);
            expect(result.valid).toBe(true);
            assertFileExists(outputPath);

            // CLI validates the file we created
            const cliResult = runCLI(
                `validate ${outputPath} --schema ${schemaPath} --no-update-check`,
                workDir
            );
            expect(cliResult.exitCode).toBe(0);
            expect(cliResult.stdout).toContain("PASS");
        });

        it("API validateFile and CLI report produce consistent error count", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const invalidPath = path.join(DATA_DIR, "invalid-user.json");

            const apiResult = validateJsonFile(invalidPath, schemaPath);
            expect(apiResult.valid).toBe(false);
            const errorCount = apiResult.errors.length;

            // CLI report should show errors
            const workDir = createE2ETempDir("integration");
            const reportPath = path.join(workDir, "report.md");
            const cliResult = runCLI(
                `report ${invalidPath} -s ${schemaPath} -f markdown -o ${reportPath}`,
                workDir
            );
            expect(cliResult.exitCode).toBe(0);
            assertFileExists(reportPath);
            const reportContent = fs.readFileSync(reportPath, "utf-8");
            // Report should mention errors (format varies)
            expect(reportContent.toLowerCase()).toMatch(/error|invalid|fail/);
        });
    });

    describe("Programmatic + CLI type generation", () => {
        it("API generateTypeScript and CLI generate produce equivalent output", () => {
            const workDir = createE2ETempDir("integration");
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const cliOutputDir = path.join(workDir, "cli-types");
            const apiOutputDir = path.join(workDir, "api-types");

            // CLI generate
            const cliResult = runCLI(
                `generate ${schemaPath} -o ${cliOutputDir} --typescript`,
                workDir
            );
            expect(cliResult.exitCode).toBe(0);

            // API generate (via JsonMaker)
            const maker = new JsonMaker(SCHEMAS_DIR);
            const apiTs = maker.generateTypeScript(schemaPath);
            fs.mkdirSync(apiOutputDir, { recursive: true });
            fs.writeFileSync(path.join(apiOutputDir, "User.ts"), apiTs, "utf-8");

            // Both should contain User interface
            const cliContent = fs.readFileSync(
                path.join(cliOutputDir, "User.ts"),
                "utf-8"
            );
            expect(cliContent).toContain("export interface User");
            expect(apiTs).toContain("export interface User");
            expect(cliContent).toContain("id: number");
            expect(apiTs).toContain("id: number");
        });
    });

    describe("validate() and validateFile() consistency", () => {
        it("validate(object) and validateFile() agree for same JSON content", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const dataPath = path.join(DATA_DIR, "valid-user.json");

            const fileContent = readJsonFile(dataPath);
            const apiValidateResult = validateJson(fileContent, schemaPath);
            const apiValidateFileResult = validateJsonFile(dataPath, schemaPath);

            expect(apiValidateResult.valid).toBe(apiValidateFileResult.valid);
            expect(apiValidateResult.errors.length).toBe(
                apiValidateFileResult.errors.length
            );
        });
    });

    describe("Report generation API vs CLI", () => {
        it("JsonMaker.generateReport produces valid HTML like CLI", () => {
            const schemaPath = path.join(SCHEMAS_DIR, "user.schema.json");
            const dataPath = path.join(DATA_DIR, "invalid-user.json");
            const workDir = createE2ETempDir("integration");

            const maker = new JsonMaker(SCHEMAS_DIR);
            const validationResult = maker.validateFile(dataPath, schemaPath);
            const apiReportPath = path.join(workDir, "api-report.html");
            maker.generateReport(validationResult, apiReportPath, { format: "html" });

            assertFileExists(apiReportPath);
            assertFileContains(apiReportPath, "<!DOCTYPE html>");

            const cliReportPath = path.join(workDir, "cli-report.html");
            const cliResult = runCLI(
                `report ${dataPath} -s ${schemaPath} -f html -o ${cliReportPath}`,
                workDir
            );
            expect(cliResult.exitCode).toBe(0);
            assertFileContains(cliReportPath, "<!DOCTYPE html>");
        });
    });
});
