/**
 * @fileoverview Markdown Format - Markdown formatting for validation reports
 * @module util/formats/markdown-format
 * @description Provides Markdown formatting of validation results, suitable for
 * documentation, GitHub README files, and other Markdown-compatible outputs.
 * Uses tables and headers for structured presentation.
 */

import type { ValidationResult, ValidationError } from "../json-types.js";

/**
 * Options for formatting reports.
 * @interface ReportOptions
 * @property {string} [title] - Title to display in the report header
 * @property {string} [filePath] - Path of the validated file to display
 * @property {string} [schemaPath] - Path of the schema used for validation
 * @property {boolean} [timestamp] - Whether to include a timestamp (default: true)
 */
export interface ReportOptions {
    title?: string;
    filePath?: string;
    schemaPath?: string;
    timestamp?: boolean;
}

/**
 * Formats a validation result as Markdown.
 * Creates a structured document with headers, tables, and proper Markdown syntax.
 *
 * @param {ValidationResult} result - The validation result to format
 * @param {ReportOptions} [options={}] - Formatting options
 * @returns {string} Formatted Markdown document
 *
 * @example
 * const result = { valid: false, errors: [{ path: "email", message: "Invalid format" }] };
 * const md = formatReport(result, { title: "Email Validation", timestamp: false });
 */
export function formatReport(result: ValidationResult, options: ReportOptions = {}): string {
    const lines: string[] = [];
    const { title = "Validation Report", filePath, schemaPath, timestamp = true } = options;

    // Header
    lines.push(`# ${title}`);
    lines.push("");

    // Metadata table
    if (timestamp || filePath || schemaPath) {
        lines.push("| Property | Value |");
        lines.push("|----------|-------|");
        if (timestamp) {
            lines.push(`| Date | ${new Date().toISOString()} |`);
        }
        if (filePath) {
            lines.push(`| File | \`${filePath}\` |`);
        }
        if (schemaPath) {
            lines.push(`| Schema | \`${schemaPath}\` |`);
        }
        lines.push("");
    }

    // Status
    if (result.valid) {
        lines.push("## Status: VALID");
        lines.push("");
        lines.push("> No validation errors found.");
    } else {
        lines.push(`## Status: INVALID`);
        lines.push("");
        lines.push(`Found **${result.errors.length}** validation error${result.errors.length === 1 ? "" : "s"}.`);
        lines.push("");

        // Errors
        lines.push("## Errors");
        lines.push("");

        result.errors.forEach((error, index) => {
            lines.push(formatError(error, index + 1));
            lines.push("");
        });
    }

    return lines.join("\n");
}

/**
 * Formats a single validation error as Markdown.
 *
 * @param {ValidationError} error - The error to format
 * @param {number} index - Error number for display
 * @returns {string} Formatted Markdown for the error
 * @private
 */
function formatError(error: ValidationError, index: number): string {
    const lines: string[] = [];

    lines.push(`### Error ${index}`);
    lines.push("");
    lines.push(`- **Path:** \`${error.path || "(root)"}\``);
    lines.push(`- **Message:** ${error.message}`);

    if (error.value !== undefined) {
        const valueStr = formatValue(error.value);
        lines.push(`- **Value:** \`${valueStr}\``);
    }

    return lines.join("\n");
}

/**
 * Formats a value for display, truncating long values.
 *
 * @param {unknown} value - Value to format
 * @returns {string} String representation of the value
 * @private
 */
function formatValue(value: unknown): string {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") return value;
    if (typeof value === "object") {
        try {
            const str = JSON.stringify(value);
            return str.length > 100 ? str.substring(0, 97) + "..." : str;
        } catch {
            return "[Object]";
        }
    }
    return String(value);
}

/**
 * Formats a summary of multiple validation results as Markdown.
 * Includes aggregate statistics, a results table, and detailed error listings.
 *
 * @param {Map<string, ValidationResult>} results - Map of file paths to validation results
 * @param {ReportOptions} [options={}] - Formatting options
 * @returns {string} Formatted Markdown summary document
 *
 * @example
 * const results = new Map([
 *   ["./config.json", { valid: true, errors: [] }],
 *   ["./data.json", { valid: false, errors: [{ path: "id", message: "Required" }] }]
 * ]);
 * const md = formatSummary(results, { title: "Config Validation Report" });
 */
export function formatSummary(
    results: Map<string, ValidationResult>,
    options: ReportOptions = {}
): string {
    const lines: string[] = [];
    const { title = "Validation Summary", timestamp = true } = options;

    let validCount = 0;
    let invalidCount = 0;
    let totalErrors = 0;

    results.forEach((result) => {
        if (result.valid) {
            validCount++;
        } else {
            invalidCount++;
            totalErrors += result.errors.length;
        }
    });

    // Header
    lines.push(`# ${title}`);
    lines.push("");

    if (timestamp) {
        lines.push(`*Generated: ${new Date().toISOString()}*`);
        lines.push("");
    }

    // Summary stats
    lines.push("## Summary");
    lines.push("");
    lines.push("| Metric | Count |");
    lines.push("|--------|-------|");
    lines.push(`| Files Validated | ${results.size} |`);
    lines.push(`| Valid | ${validCount} |`);
    lines.push(`| Invalid | ${invalidCount} |`);
    lines.push(`| Total Errors | ${totalErrors} |`);
    lines.push("");

    // Results table
    lines.push("## Results");
    lines.push("");
    lines.push("| Status | File | Errors |");
    lines.push("|--------|------|--------|");

    results.forEach((result, filePath) => {
        const status = result.valid ? "PASS" : "FAIL";
        const errorCount = result.valid ? "-" : String(result.errors.length);
        lines.push(`| ${status} | \`${filePath}\` | ${errorCount} |`);
    });

    lines.push("");

    // Detailed errors for failed files
    const failedFiles = Array.from(results.entries()).filter(([, r]) => !r.valid);
    if (failedFiles.length > 0) {
        lines.push("## Detailed Errors");
        lines.push("");

        failedFiles.forEach(([filePath, result]) => {
            lines.push(`### ${filePath}`);
            lines.push("");

            result.errors.forEach((error, index) => {
                lines.push(`${index + 1}. **\`${error.path || "(root)"}\`**: ${error.message}`);
            });

            lines.push("");
        });
    }

    return lines.join("\n");
}
