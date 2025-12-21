/**
 * @fileoverview Report Generator - Generate validation reports in multiple formats
 * @module util/report-generator
 * @description Provides functionality to generate and output validation reports
 * in terminal, markdown, and HTML formats. Supports both single validation
 * results and summaries of multiple validations.
 */

import * as fs from "fs";
import * as path from "path";
import type { ValidationResult } from "./json-types.js";

import * as terminalFormat from "./formats/terminal-format.js";
import * as markdownFormat from "./formats/markdown-format.js";
import * as htmlFormat from "./formats/html-format.js";

/**
 * Supported report output formats.
 * @typedef {('terminal'|'markdown'|'html')} ReportFormat
 */
export type ReportFormat = "terminal" | "markdown" | "html";

/**
 * Options for report generation.
 * @interface ReportOptions
 */
export interface ReportOptions {
    /** Title to display in the report header */
    title?: string;
    /** Path of the file that was validated (for display) */
    filePath?: string;
    /** Path of the schema used for validation (for display) */
    schemaPath?: string;
    /** Whether to include a timestamp in the report */
    timestamp?: boolean;
}

/**
 * Extended options for generating reports to files.
 * @interface GenerateReportOptions
 * @extends ReportOptions
 */
export interface GenerateReportOptions extends ReportOptions {
    /** The output format for the report */
    format: ReportFormat;
}

/**
 * Formats a validation result as a string in the specified format.
 *
 * @param {ValidationResult} result - The validation result to format
 * @param {ReportFormat} format - The output format ('terminal', 'markdown', or 'html')
 * @param {ReportOptions} [options={}] - Additional formatting options
 * @returns {string} The formatted report content
 * @throws {Error} If an unknown format is specified
 *
 * @example
 * const result = { valid: false, errors: [{ path: "name", message: "Required" }] };
 *
 * // Terminal format with colors
 * const terminalReport = formatReport(result, "terminal");
 *
 * // Markdown for documentation
 * const mdReport = formatReport(result, "markdown", { title: "User Validation" });
 *
 * // HTML for web display
 * const htmlReport = formatReport(result, "html", { timestamp: true });
 */
export function formatReport(
    result: ValidationResult,
    format: ReportFormat,
    options: ReportOptions = {}
): string {
    switch (format) {
        case "terminal":
            return terminalFormat.formatReport(result, options);
        case "markdown":
            return markdownFormat.formatReport(result, options);
        case "html":
            return htmlFormat.formatReport(result, options);
        default:
            throw new Error(`Unknown report format: ${format}`);
    }
}

/**
 * Formats a summary of multiple validation results.
 *
 * @param {Map<string, ValidationResult>} results - Map of file paths to validation results
 * @param {ReportFormat} format - The output format
 * @param {ReportOptions} [options={}] - Additional formatting options
 * @returns {string} The formatted summary content
 * @throws {Error} If an unknown format is specified
 *
 * @example
 * const results = new Map([
 *   ["./user1.json", { valid: true, errors: [] }],
 *   ["./user2.json", { valid: false, errors: [{ path: "email", message: "Invalid" }] }]
 * ]);
 *
 * const summary = formatSummary(results, "markdown", { title: "Batch Validation" });
 */
export function formatSummary(
    results: Map<string, ValidationResult>,
    format: ReportFormat,
    options: ReportOptions = {}
): string {
    switch (format) {
        case "terminal":
            return terminalFormat.formatSummary(results, options);
        case "markdown":
            return markdownFormat.formatSummary(results, options);
        case "html":
            return htmlFormat.formatSummary(results, options);
        default:
            throw new Error(`Unknown report format: ${format}`);
    }
}

/**
 * Gets the appropriate file extension for a report format.
 *
 * @param {ReportFormat} format - The report format
 * @returns {string} The file extension including the dot (e.g., '.html')
 *
 * @example
 * getFormatExtension("terminal");  // returns ".txt"
 * getFormatExtension("markdown");  // returns ".md"
 * getFormatExtension("html");      // returns ".html"
 */
export function getFormatExtension(format: ReportFormat): string {
    switch (format) {
        case "terminal":
            return ".txt";
        case "markdown":
            return ".md";
        case "html":
            return ".html";
        default:
            return ".txt";
    }
}

/**
 * Generates a report and writes it to a file.
 * Creates parent directories if they don't exist.
 *
 * @param {ValidationResult} result - The validation result to report
 * @param {string} outputPath - The file path to write the report to
 * @param {GenerateReportOptions} options - Report options including format
 * @returns {void}
 *
 * @example
 * const result = validate(data, schema);
 * generateReport(result, "./reports/validation.html", {
 *   format: "html",
 *   title: "User Schema Validation",
 *   timestamp: true
 * });
 */
export function generateReport(
    result: ValidationResult,
    outputPath: string,
    options: GenerateReportOptions
): void {
    const content = formatReport(result, options.format, options);
    ensureDir(path.dirname(outputPath));
    fs.writeFileSync(outputPath, content, "utf-8");
}

/**
 * Generates a summary report for multiple files and writes it to a file.
 *
 * @param {Map<string, ValidationResult>} results - Map of file paths to results
 * @param {string} outputPath - The file path to write the report to
 * @param {GenerateReportOptions} options - Report options including format
 * @returns {void}
 *
 * @example
 * const results = validateFiles(["./a.json", "./b.json"], schema);
 * generateSummaryReport(results, "./reports/summary.md", {
 *   format: "markdown",
 *   title: "Batch Validation Summary"
 * });
 */
export function generateSummaryReport(
    results: Map<string, ValidationResult>,
    outputPath: string,
    options: GenerateReportOptions
): void {
    const content = formatSummary(results, options.format, options);
    ensureDir(path.dirname(outputPath));
    fs.writeFileSync(outputPath, content, "utf-8");
}

/**
 * Generates reports in all available formats (terminal, markdown, HTML).
 * Creates one file for each format with the appropriate extension.
 *
 * @param {ValidationResult} result - The validation result to report
 * @param {string} outputDir - Directory to write the report files
 * @param {string} baseName - Base name for the output files (without extension)
 * @param {ReportOptions} [options={}] - Report formatting options
 * @returns {string[]} Array of created file paths
 *
 * @example
 * const result = validate(data, schema);
 * const files = generateAllFormats(result, "./reports", "user-validation");
 * // Creates: ./reports/user-validation.txt
 * //          ./reports/user-validation.md
 * //          ./reports/user-validation.html
 */
export function generateAllFormats(
    result: ValidationResult,
    outputDir: string,
    baseName: string,
    options: ReportOptions = {}
): string[] {
    ensureDir(outputDir);
    const formats: ReportFormat[] = ["terminal", "markdown", "html"];
    const createdFiles: string[] = [];

    for (const format of formats) {
        const ext = getFormatExtension(format);
        const outputPath = path.join(outputDir, `${baseName}${ext}`);
        const content = formatReport(result, format, options);
        fs.writeFileSync(outputPath, content, "utf-8");
        createdFiles.push(outputPath);
    }

    return createdFiles;
}

/**
 * Generates summary reports in all available formats.
 *
 * @param {Map<string, ValidationResult>} results - Map of file paths to results
 * @param {string} outputDir - Directory to write the report files
 * @param {string} baseName - Base name for the output files
 * @param {ReportOptions} [options={}] - Report formatting options
 * @returns {string[]} Array of created file paths
 *
 * @example
 * const results = validateFiles(files, schema);
 * const reportFiles = generateAllFormatsSummary(results, "./reports", "batch-summary");
 */
export function generateAllFormatsSummary(
    results: Map<string, ValidationResult>,
    outputDir: string,
    baseName: string,
    options: ReportOptions = {}
): string[] {
    ensureDir(outputDir);
    const formats: ReportFormat[] = ["terminal", "markdown", "html"];
    const createdFiles: string[] = [];

    for (const format of formats) {
        const ext = getFormatExtension(format);
        const outputPath = path.join(outputDir, `${baseName}${ext}`);
        const content = formatSummary(results, format, options);
        fs.writeFileSync(outputPath, content, "utf-8");
        createdFiles.push(outputPath);
    }

    return createdFiles;
}

/**
 * Prints a validation report to the console in terminal format.
 *
 * @param {ValidationResult} result - The validation result to print
 * @param {ReportOptions} [options={}] - Report formatting options
 * @returns {void}
 *
 * @example
 * const result = validate(data, schema);
 * printReport(result, { title: "User Validation" });
 */
export function printReport(result: ValidationResult, options: ReportOptions = {}): void {
    console.log(formatReport(result, "terminal", options));
}

/**
 * Prints a validation summary to the console in terminal format.
 *
 * @param {Map<string, ValidationResult>} results - Map of file paths to results
 * @param {ReportOptions} [options={}] - Report formatting options
 * @returns {void}
 *
 * @example
 * const results = validateFiles(files, schema);
 * printSummary(results, { title: "Batch Results" });
 */
export function printSummary(
    results: Map<string, ValidationResult>,
    options: ReportOptions = {}
): void {
    console.log(formatSummary(results, "terminal", options));
}

/**
 * Ensures a directory exists, creating it recursively if necessary.
 *
 * @param {string} dir - Directory path to ensure exists
 * @returns {void}
 * @private
 */
function ensureDir(dir: string): void {
    if (dir && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}
