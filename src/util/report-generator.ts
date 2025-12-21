/**
 * Report Generator - Generate validation reports in multiple formats
 */

import * as fs from "fs";
import * as path from "path";
import type { ValidationResult } from "./json-types.js";

import * as terminalFormat from "./formats/terminal-format.js";
import * as markdownFormat from "./formats/markdown-format.js";
import * as htmlFormat from "./formats/html-format.js";

export type ReportFormat = "terminal" | "markdown" | "html";

export interface ReportOptions {
    title?: string;
    filePath?: string;
    schemaPath?: string;
    timestamp?: boolean;
}

export interface GenerateReportOptions extends ReportOptions {
    format: ReportFormat;
}

/**
 * Format a validation result as a string in the specified format
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
 * Format a summary of multiple validation results
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
 * Get the file extension for a report format
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
 * Generate a report and write it to a file
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
 * Generate a summary report for multiple files and write it to a file
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
 * Generate reports in all formats
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
 * Generate summary reports in all formats
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
 * Print a report to the console (terminal format)
 */
export function printReport(result: ValidationResult, options: ReportOptions = {}): void {
    console.log(formatReport(result, "terminal", options));
}

/**
 * Print a summary to the console (terminal format)
 */
export function printSummary(
    results: Map<string, ValidationResult>,
    options: ReportOptions = {}
): void {
    console.log(formatSummary(results, "terminal", options));
}

/**
 * Ensure a directory exists
 */
function ensureDir(dir: string): void {
    if (dir && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}
