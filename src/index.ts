/**
 * @fileoverview JaySON - A comprehensive JSON Schema validation and manipulation library
 * @module jayson
 * @description A TypeScript/JavaScript library for working with JSON Schemas. Provides
 * comprehensive functionality for schema validation, data transformation, type generation,
 * and report creation. Supports JSON Schema drafts 04, 06, 07, 2019-09, and 2020-12.
 *
 * @example
 * // Import the default instance
 * import { jsonMaker, validateJson, readJson, writeJson } from "jayson";
 *
 * // Validate data against a schema
 * const result = validateJson({ name: "John" }, "./schemas/user.json");
 *
 * // Or use the class for more control
 * import { JsonMaker } from "jayson";
 * const maker = new JsonMaker("./my-schemas");
 * const data = maker.readData({ type: "file", path: "./data.json" });
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
 * Main class for JSON Schema validation and JSON file operations.
 * Provides a unified interface for loading schemas, validating data,
 * reading/writing JSON files, transforming data, and generating code.
 *
 * @class JsonMaker
 * @example
 * const maker = new JsonMaker("./schemas");
 *
 * // Validate data
 * const result = maker.validate({ name: "John" }, "user.json");
 *
 * // Generate TypeScript types
 * const tsCode = maker.generateTypeScript("user.json");
 */
export class JsonMaker {
    /** @private Cache for loaded schemas to avoid re-reading files */
    private schemaCache: Map<string, JsonSchema> = new Map();
    /** @private Base directory for resolving relative schema paths */
    private schemaDir: string;

    /**
     * Creates a new JsonMaker instance.
     *
     * @param {string} [schemaDir="./json-schema"] - Base directory for schema files
     */
    constructor(schemaDir: string = "./json-schema") {
        this.schemaDir = schemaDir;
    }

    /**
     * Loads a JSON schema from a file.
     * Schemas are cached for subsequent requests.
     *
     * @param {string} schemaPath - Path to schema file (absolute or relative to schemaDir)
     * @returns {JsonSchema} The parsed JSON Schema object
     * @throws {Error} If the schema file is not found
     */
    loadSchema(schemaPath: string): JsonSchema {
        return loadSchemaUtil(schemaPath, this.schemaDir, this.schemaCache);
    }

    /**
     * Gets metadata information about a schema.
     *
     * @param {string} schemaPath - Path to schema file
     * @returns {SchemaInfo} Schema metadata including title, description, and properties
     */
    getSchemaInfo(schemaPath: string): SchemaInfo {
        const schema = this.loadSchema(schemaPath);
        return getSchemaInfoUtil(schema);
    }

    /**
     * Validates data against a JSON Schema.
     *
     * @param {unknown} data - The data to validate
     * @param {string} schemaPath - Path to the schema file
     * @returns {ValidationResult} Validation result with valid flag and any errors
     */
    validate(data: unknown, schemaPath: string): ValidationResult {
        const schema = this.loadSchema(schemaPath);
        return validate(data, schema);
    }

    /**
     * Validates a JSON file against a schema.
     * Reads and parses the file, then validates its contents.
     *
     * @param {string} filePath - Path to the JSON file to validate
     * @param {string} schemaPath - Path to the schema file
     * @returns {ValidationResult} Validation result with valid flag and any errors
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
     * Validates multiple JSON files against a schema.
     *
     * @param {string[]} filePaths - Array of file paths to validate
     * @param {string} schemaPath - Path to the schema file
     * @returns {Map<string, ValidationResult>} Map of file paths to validation results
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
     * Reads data from a configured source.
     * Supports file, inline, and URL data sources.
     *
     * @param {DataSourceConfig} config - Data source configuration
     * @returns {unknown} The parsed data
     */
    readData(config: DataSourceConfig): unknown {
        return readDataUtil(config);
    }

    /**
     * Writes data to a JSON file.
     *
     * @param {unknown} data - Data to write
     * @param {string} outputPath - Output file path
     * @param {WriteOptions} [options={}] - Write options (pretty print, etc.)
     */
    writeJson(data: unknown, outputPath: string, options: WriteOptions = {}): void {
        writeJsonUtil(data, outputPath, options);
    }

    /**
     * Creates a JSON file from data, validating against a schema first.
     * Only writes the file if validation passes.
     *
     * @param {unknown} data - Data to validate and write
     * @param {string} schemaPath - Path to schema for validation
     * @param {string} outputPath - Output file path
     * @param {WriteOptions} [options={}] - Write options
     * @returns {ValidationResult} Validation result (file only written if valid)
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
     * Extracts specific fields from JSON data.
     * Supports nested field access with dot notation.
     *
     * @template T - Type of extracted objects
     * @param {unknown} data - Source data (object or array)
     * @param {string[]} fields - Field names to extract (supports "a.b.c" notation)
     * @returns {T[]} Array of objects containing only the specified fields
     */
    extractFields<T = unknown>(data: unknown, fields: string[]): T[] {
        return extractFieldsUtil<T>(data, fields);
    }

    /**
     * Transforms data using a mapping function.
     *
     * @template TInput - Input item type
     * @template TOutput - Output item type
     * @param {TInput[]} data - Array of items to transform
     * @param {Function} transformer - Transformation function (item, index) => newItem
     * @returns {TOutput[]} Array of transformed items
     */
    transformData<TInput, TOutput>(
        data: TInput[],
        transformer: (item: TInput, index: number) => TOutput
    ): TOutput[] {
        return transformDataUtil(data, transformer);
    }

    /**
     * Filters data based on a predicate function.
     *
     * @template T - Item type
     * @param {T[]} data - Array to filter
     * @param {Function} predicate - Filter function returning true to keep item
     * @returns {T[]} Filtered array
     */
    filterData<T>(data: T[], predicate: (item: T) => boolean): T[] {
        return filterDataUtil(data, predicate);
    }

    /**
     * Merges multiple JSON files into one.
     * Combines arrays or merges objects.
     *
     * @param {string[]} filePaths - Array of input file paths
     * @param {string} outputPath - Output file path for merged result
     */
    mergeJsonFiles(filePaths: string[], outputPath: string): void {
        mergeJsonFilesUtil(filePaths, outputPath);
    }

    /**
     * Splits a JSON array file into multiple files based on a field value.
     *
     * @param {string} inputPath - Path to input JSON array file
     * @param {string} outputDir - Directory for output files
     * @param {string} splitBy - Field name to split by
     * @param {Function} fileNamePattern - Function to generate filename from field value
     * @returns {string[]} Array of created file paths
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
     * Generates an empty template object conforming to a schema.
     * Creates default values based on the schema's type definitions.
     *
     * @param {string} schemaPath - Path to schema file
     * @returns {Record<string, unknown>|unknown[]} Template object or array
     */
    generateTemplate(schemaPath: string): Record<string, unknown> | unknown[] {
        const schema = this.loadSchema(schemaPath);
        return generateFromSchema(schema);
    }

    /**
     * Lists all available schema files in the schema directory.
     *
     * @returns {string[]} Array of schema file paths
     */
    listSchemas(): string[] {
        return listSchemasUtil(this.schemaDir);
    }

    /**
     * Formats a validation result as a report string.
     *
     * @param {ValidationResult} result - Validation result to format
     * @param {ReportFormat} format - Output format (terminal, markdown, html)
     * @param {ReportOptions} [options={}] - Formatting options
     * @returns {string} Formatted report string
     */
    formatReport(
        result: ValidationResult,
        format: ReportFormat,
        options: ReportOptions = {}
    ): string {
        return formatReportUtil(result, format, options);
    }

    /**
     * Formats multiple validation results as a summary report.
     *
     * @param {Map<string, ValidationResult>} results - Map of file paths to results
     * @param {ReportFormat} format - Output format (terminal, markdown, html)
     * @param {ReportOptions} [options={}] - Formatting options
     * @returns {string} Formatted summary string
     */
    formatSummary(
        results: Map<string, ValidationResult>,
        format: ReportFormat,
        options: ReportOptions = {}
    ): string {
        return formatSummaryUtil(results, format, options);
    }

    /**
     * Generates a validation report and writes it to a file.
     *
     * @param {ValidationResult} result - Validation result
     * @param {string} outputPath - Output file path
     * @param {GenerateReportOptions} options - Report options including format
     */
    generateReport(
        result: ValidationResult,
        outputPath: string,
        options: GenerateReportOptions
    ): void {
        generateReportUtil(result, outputPath, options);
    }

    /**
     * Generates a summary report for multiple files and writes to a file.
     *
     * @param {Map<string, ValidationResult>} results - Map of file paths to results
     * @param {string} outputPath - Output file path
     * @param {GenerateReportOptions} options - Report options including format
     */
    generateSummaryReport(
        results: Map<string, ValidationResult>,
        outputPath: string,
        options: GenerateReportOptions
    ): void {
        generateSummaryReportUtil(results, outputPath, options);
    }

    /**
     * Generates reports in all formats (terminal, markdown, html).
     *
     * @param {ValidationResult} result - Validation result
     * @param {string} outputDir - Output directory
     * @param {string} baseName - Base name for output files
     * @param {ReportOptions} [options={}] - Formatting options
     * @returns {string[]} Array of created file paths
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
     * Generates summary reports in all formats.
     *
     * @param {Map<string, ValidationResult>} results - Map of file paths to results
     * @param {string} outputDir - Output directory
     * @param {string} baseName - Base name for output files
     * @param {ReportOptions} [options={}] - Formatting options
     * @returns {string[]} Array of created file paths
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
     * Prints a validation report to the console.
     *
     * @param {ValidationResult} result - Validation result to print
     * @param {ReportOptions} [options={}] - Formatting options
     */
    printReport(result: ValidationResult, options: ReportOptions = {}): void {
        printReportUtil(result, options);
    }

    /**
     * Prints a summary report to the console.
     *
     * @param {Map<string, ValidationResult>} results - Map of file paths to results
     * @param {ReportOptions} [options={}] - Formatting options
     */
    printSummary(
        results: Map<string, ValidationResult>,
        options: ReportOptions = {}
    ): void {
        printSummaryUtil(results, options);
    }

    /**
     * Generates TypeScript interface code from a schema.
     *
     * @param {string} schemaPath - Path to schema file
     * @param {GenerateOptions} [options={}] - Generation options
     * @returns {string} TypeScript interface code
     */
    generateTypeScript(schemaPath: string, options: GenerateOptions = {}): string {
        const schema = this.loadSchema(schemaPath);
        return generateTypeScriptUtil(schema, options);
    }

    /**
     * Generates JavaScript ES5 class code from a schema.
     *
     * @param {string} schemaPath - Path to schema file
     * @param {GenerateOptions} [options={}] - Generation options
     * @returns {string} JavaScript ES5 class code
     */
    generateJavaScript(schemaPath: string, options: GenerateOptions = {}): string {
        const schema = this.loadSchema(schemaPath);
        return generateJavaScriptUtil(schema, options);
    }

    /**
     * Generates TypeScript interface and writes to a file.
     *
     * @param {string} schemaPath - Path to schema file
     * @param {string} outputPath - Output file path
     * @param {GenerateOptions} [options={}] - Generation options
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
     * Generates JavaScript ES5 class and writes to a file.
     *
     * @param {string} schemaPath - Path to schema file
     * @param {string} outputPath - Output file path
     * @param {GenerateOptions} [options={}] - Generation options
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
     * Generates both TypeScript and JavaScript files from a schema.
     *
     * @param {string} schemaPath - Path to schema file
     * @param {string} outputDir - Output directory
     * @param {string} baseName - Base name for output files
     * @param {GenerateOptions} [options={}] - Generation options
     * @returns {{ tsPath: string; jsPath: string }} Paths to created files
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

/**
 * Default JsonMaker instance for convenience.
 * Uses "./json-schema" as the default schema directory.
 * @const {JsonMaker}
 */
export const jsonMaker = new JsonMaker();

/**
 * Validates data against a JSON Schema.
 * Convenience function using the default jsonMaker instance.
 *
 * @param {unknown} data - Data to validate
 * @param {string} schemaPath - Path to schema file
 * @returns {ValidationResult} Validation result
 */
export function validateJson(data: unknown, schemaPath: string): ValidationResult {
    return jsonMaker.validate(data, schemaPath);
}

/**
 * Validates a JSON file against a schema.
 * Convenience function using the default jsonMaker instance.
 *
 * @param {string} filePath - Path to JSON file
 * @param {string} schemaPath - Path to schema file
 * @returns {ValidationResult} Validation result
 */
export function validateJsonFile(filePath: string, schemaPath: string): ValidationResult {
    return jsonMaker.validateFile(filePath, schemaPath);
}

/**
 * Writes data to a JSON file.
 * Convenience function using the default jsonMaker instance.
 *
 * @param {unknown} data - Data to write
 * @param {string} outputPath - Output file path
 * @param {WriteOptions} [options] - Write options
 */
export function writeJson(data: unknown, outputPath: string, options?: WriteOptions): void {
    jsonMaker.writeJson(data, outputPath, options);
}

/**
 * Reads and parses a JSON file.
 * Convenience function using the default jsonMaker instance.
 *
 * @template T - Expected return type
 * @param {string} filePath - Path to JSON file
 * @returns {T} Parsed JSON data
 */
export function readJson<T = unknown>(filePath: string): T {
    return jsonMaker.readData({ type: "file", path: filePath }) as T;
}

/**
 * Gets metadata information about a schema.
 * Convenience function using the default jsonMaker instance.
 *
 * @param {string} schemaPath - Path to schema file
 * @returns {SchemaInfo} Schema metadata
 */
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
