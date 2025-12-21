/**
 * JSON Maker - A utility for working with JSON schemas
 * Provides functionality to:
 * - Load and parse JSON schemas
 * - Validate JSON data against schemas
 * - Create JSON files from data
 * - Read and extract data from JSON files
 * - Transform data between different sources
 */

import * as fs from "fs";

// Re-export types
export type {
    JsonSchema,
    JsonSchemaRef,
    JsonSchemaProperty,
    ValidationError,
    ValidationResult,
    SchemaInfo,
    DataSource,
    DataSourceConfig,
    WriteOptions,
} from "./util/json-types.js";

// Import types for internal use
import type {
    JsonSchema,
    ValidationResult,
    SchemaInfo,
    DataSourceConfig,
    WriteOptions,
} from "./util/json-types.js";

// Import utilities
import {
    loadSchema as loadSchemaUtil,
    getSchemaInfo as getSchemaInfoUtil,
    listSchemas as listSchemasUtil,
} from "./util/schema-loader.js";

import { validate } from "./util/json-validator.js";

import {
    readData as readDataUtil,
    writeJson as writeJsonUtil,
    mergeJsonFiles as mergeJsonFilesUtil,
    splitJsonFile as splitJsonFileUtil,
} from "./util/json-io.js";

import {
    extractFields as extractFieldsUtil,
    transformData as transformDataUtil,
    filterData as filterDataUtil,
} from "./util/data-transform.js";

import { generateFromSchema } from "./util/template-generator.js";

import {
    formatReport as formatReportUtil,
    formatSummary as formatSummaryUtil,
    generateReport as generateReportUtil,
    generateSummaryReport as generateSummaryReportUtil,
    generateAllFormats as generateAllFormatsUtil,
    generateAllFormatsSummary as generateAllFormatsSummaryUtil,
    printReport as printReportUtil,
    printSummary as printSummaryUtil,
    type ReportFormat,
    type ReportOptions,
    type GenerateReportOptions,
} from "./util/report-generator.js";

import {
    generateTypeScript as generateTypeScriptUtil,
    generateJavaScript as generateJavaScriptUtil,
    generateTypeScriptFile as generateTypeScriptFileUtil,
    generateJavaScriptFile as generateJavaScriptFileUtil,
    generateBoth as generateBothUtil,
    type GenerateOptions,
} from "./util/type-generator.js";

/**
 * JSON Maker class for schema validation and JSON file operations
 */
export class JsonMaker {
    private schemaCache: Map<string, JsonSchema> = new Map();
    private schemaDir: string;

    constructor(schemaDir: string = "./json-schema") {
        this.schemaDir = schemaDir;
    }

    /**
     * Load a JSON schema from file
     */
    loadSchema(schemaPath: string): JsonSchema {
        return loadSchemaUtil(schemaPath, this.schemaDir, this.schemaCache);
    }

    /**
     * Get information about a schema
     */
    getSchemaInfo(schemaPath: string): SchemaInfo {
        const schema = this.loadSchema(schemaPath);
        return getSchemaInfoUtil(schema);
    }

    /**
     * Validate data against a schema
     */
    validate(data: unknown, schemaPath: string): ValidationResult {
        const schema = this.loadSchema(schemaPath);
        return validate(data, schema);
    }

    /**
     * Validate a JSON file against a schema
     */
    validateFile(filePath: string, schemaPath: string): ValidationResult {
        if (!fs.existsSync(filePath)) {
            return {
                valid: false,
                errors: [{ path: "", message: `File not found: ${filePath}` }],
            };
        }

        try {
            const content = fs.readFileSync(filePath, "utf-8");
            const data = JSON.parse(content);
            return this.validate(data, schemaPath);
        } catch (error) {
            return {
                valid: false,
                errors: [
                    {
                        path: "",
                        message: `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
            };
        }
    }

    /**
     * Validate multiple files against a schema
     */
    validateFiles(
        filePaths: string[],
        schemaPath: string
    ): Map<string, ValidationResult> {
        const results = new Map<string, ValidationResult>();

        for (const filePath of filePaths) {
            results.set(filePath, this.validateFile(filePath, schemaPath));
        }

        return results;
    }

    /**
     * Read data from a source
     */
    readData(config: DataSourceConfig): unknown {
        return readDataUtil(config);
    }

    /**
     * Write data to a JSON file
     */
    writeJson(data: unknown, outputPath: string, options: WriteOptions = {}): void {
        writeJsonUtil(data, outputPath, options);
    }

    /**
     * Create a JSON file from data, validating against schema first
     */
    createValidatedJson(
        data: unknown,
        schemaPath: string,
        outputPath: string,
        options: WriteOptions = {}
    ): ValidationResult {
        const validation = this.validate(data, schemaPath);

        if (validation.valid) {
            this.writeJson(data, outputPath, options);
        }

        return validation;
    }

    /**
     * Extract specific fields from JSON data
     */
    extractFields<T = unknown>(data: unknown, fields: string[]): T[] {
        return extractFieldsUtil<T>(data, fields);
    }

    /**
     * Transform data using a mapping function
     */
    transformData<TInput, TOutput>(
        data: TInput[],
        transformer: (item: TInput, index: number) => TOutput
    ): TOutput[] {
        return transformDataUtil(data, transformer);
    }

    /**
     * Filter data based on a predicate
     */
    filterData<T>(data: T[], predicate: (item: T) => boolean): T[] {
        return filterDataUtil(data, predicate);
    }

    /**
     * Merge multiple JSON files into one
     */
    mergeJsonFiles(filePaths: string[], outputPath: string): void {
        mergeJsonFilesUtil(filePaths, outputPath);
    }

    /**
     * Split a JSON array into multiple files
     */
    splitJsonFile(
        inputPath: string,
        outputDir: string,
        splitBy: string,
        fileNamePattern: (value: string) => string
    ): string[] {
        return splitJsonFileUtil(inputPath, outputDir, splitBy, fileNamePattern);
    }

    /**
     * Generate an empty object that conforms to a schema
     */
    generateTemplate(schemaPath: string): Record<string, unknown> | unknown[] {
        const schema = this.loadSchema(schemaPath);
        return generateFromSchema(schema);
    }

    /**
     * List all available schemas
     */
    listSchemas(): string[] {
        return listSchemasUtil(this.schemaDir);
    }

    /**
     * Format a validation result as a report string
     */
    formatReport(
        result: ValidationResult,
        format: ReportFormat,
        options: ReportOptions = {}
    ): string {
        return formatReportUtil(result, format, options);
    }

    /**
     * Format multiple validation results as a summary report string
     */
    formatSummary(
        results: Map<string, ValidationResult>,
        format: ReportFormat,
        options: ReportOptions = {}
    ): string {
        return formatSummaryUtil(results, format, options);
    }

    /**
     * Generate a validation report and write to file
     */
    generateReport(
        result: ValidationResult,
        outputPath: string,
        options: GenerateReportOptions
    ): void {
        generateReportUtil(result, outputPath, options);
    }

    /**
     * Generate a summary report for multiple files and write to file
     */
    generateSummaryReport(
        results: Map<string, ValidationResult>,
        outputPath: string,
        options: GenerateReportOptions
    ): void {
        generateSummaryReportUtil(results, outputPath, options);
    }

    /**
     * Generate reports in all formats (terminal, markdown, html)
     */
    generateAllFormats(
        result: ValidationResult,
        outputDir: string,
        baseName: string,
        options: ReportOptions = {}
    ): string[] {
        return generateAllFormatsUtil(result, outputDir, baseName, options);
    }

    /**
     * Generate summary reports in all formats
     */
    generateAllFormatsSummary(
        results: Map<string, ValidationResult>,
        outputDir: string,
        baseName: string,
        options: ReportOptions = {}
    ): string[] {
        return generateAllFormatsSummaryUtil(results, outputDir, baseName, options);
    }

    /**
     * Print a validation report to the console
     */
    printReport(result: ValidationResult, options: ReportOptions = {}): void {
        printReportUtil(result, options);
    }

    /**
     * Print a summary report to the console
     */
    printSummary(
        results: Map<string, ValidationResult>,
        options: ReportOptions = {}
    ): void {
        printSummaryUtil(results, options);
    }

    /**
     * Generate TypeScript interface from a schema
     */
    generateTypeScript(schemaPath: string, options: GenerateOptions = {}): string {
        const schema = this.loadSchema(schemaPath);
        return generateTypeScriptUtil(schema, options);
    }

    /**
     * Generate JavaScript ES5 class from a schema
     */
    generateJavaScript(schemaPath: string, options: GenerateOptions = {}): string {
        const schema = this.loadSchema(schemaPath);
        return generateJavaScriptUtil(schema, options);
    }

    /**
     * Generate TypeScript interface and write to file
     */
    generateTypeScriptFile(
        schemaPath: string,
        outputPath: string,
        options: GenerateOptions = {}
    ): void {
        const schema = this.loadSchema(schemaPath);
        generateTypeScriptFileUtil(schema, outputPath, options);
    }

    /**
     * Generate JavaScript ES5 class and write to file
     */
    generateJavaScriptFile(
        schemaPath: string,
        outputPath: string,
        options: GenerateOptions = {}
    ): void {
        const schema = this.loadSchema(schemaPath);
        generateJavaScriptFileUtil(schema, outputPath, options);
    }

    /**
     * Generate both TypeScript and JavaScript files from a schema
     */
    generateTypes(
        schemaPath: string,
        outputDir: string,
        baseName: string,
        options: GenerateOptions = {}
    ): { tsPath: string; jsPath: string } {
        const schema = this.loadSchema(schemaPath);
        return generateBothUtil(schema, outputDir, baseName, options);
    }
}

// Export a default instance
export const jsonMaker = new JsonMaker();

// Export utility functions for convenience
export function validateJson(data: unknown, schemaPath: string): ValidationResult {
    return jsonMaker.validate(data, schemaPath);
}

export function validateJsonFile(filePath: string, schemaPath: string): ValidationResult {
    return jsonMaker.validateFile(filePath, schemaPath);
}

export function writeJson(data: unknown, outputPath: string, options?: WriteOptions): void {
    jsonMaker.writeJson(data, outputPath, options);
}

export function readJson<T = unknown>(filePath: string): T {
    return jsonMaker.readData({ type: "file", path: filePath }) as T;
}

export function getSchemaInfo(schemaPath: string): SchemaInfo {
    return jsonMaker.getSchemaInfo(schemaPath);
}

// Re-export standards updater module
export {
    StandardsUpdater,
    standardsUpdater,
    downloadMetaSchema,
    downloadSchema,
    downloadFromGitHub,
    checkGitHubUpdate,
    updateAllSchemas,
    listDownloadedSchemas,
    checkInternetAccess,
    detectStandard,
    getAvailableStandards,
    checkForUpdates,
    JSON_SCHEMA_VERSIONS,
    SCHEMA_URL_TO_VERSION,
    type JsonSchemaVersion,
    type SchemaMetadata,
    type DownloadResult,
    type UpdateResult,
    type DetectedStandard,
} from "./update-standards.js";

// Re-export report generator utilities
export {
    getFormatExtension,
    type ReportFormat,
    type ReportOptions,
    type GenerateReportOptions,
} from "./util/report-generator.js";

// Re-export type generator utilities
export { type GenerateOptions } from "./util/type-generator.js";
