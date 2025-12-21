/**
 * @fileoverview Terminal Format - Plain text formatting for terminal output
 * @module util/formats/terminal-format
 * @description Provides text-based formatting of validation results for terminal/console
 * display. Outputs reports with ASCII decorators (=, -) for visual structure.
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
 * Formats a validation result for terminal display.
 * Creates a structured text report with ASCII borders and clear sections.
 *
 * @param {ValidationResult} result - The validation result to format
 * @param {ReportOptions} [options={}] - Formatting options
 * @returns {string} Formatted plain text report
 *
 * @example
 * const result = { valid: false, errors: [{ path: "name", message: "Required" }] };
 * console.log(formatReport(result, { title: "User Validation" }));
 */
export function formatReport(result: ValidationResult, options: ReportOptions = {}): string {
    const lines: string[] = [];
    const { title = "Validation Report", filePath, schemaPath, timestamp = true } = options;

    // Header
    lines.push("=".repeat(60));
    lines.push(centerText(title, 60));
    lines.push("=".repeat(60));
    lines.push("");

    // Metadata
    if (timestamp) {
        lines.push(`Date: ${new Date().toISOString()}`);
    }
    if (filePath) {
        lines.push(`File: ${filePath}`);
    }
    if (schemaPath) {
        lines.push(`Schema: ${schemaPath}`);
    }
    if (timestamp || filePath || schemaPath) {
        lines.push("");
    }

    // Status
    lines.push("-".repeat(60));
    if (result.valid) {
        lines.push("Status: VALID");
        lines.push("");
        lines.push("No validation errors found.");
    } else {
        lines.push(`Status: INVALID (${result.errors.length} error${result.errors.length === 1 ? "" : "s"})`);
        lines.push("-".repeat(60));
        lines.push("");

        // Errors
        result.errors.forEach((error, index) => {
            lines.push(formatError(error, index + 1));
            lines.push("");
        });
    }

    lines.push("=".repeat(60));

    return lines.join("\n");
}

/**
 * Formats a single validation error for terminal display.
 *
 * @param {ValidationError} error - The error to format
 * @param {number} index - Error number for display
 * @returns {string} Formatted error text
 * @private
 */
function formatError(error: ValidationError, index: number): string {
    const lines: string[] = [];

    lines.push(`Error #${index}:`);
    lines.push(`  Path:    ${error.path || "(root)"}`);
    lines.push(`  Message: ${error.message}`);

    if (error.value !== undefined) {
        const valueStr = formatValue(error.value);
        lines.push(`  Value:   ${valueStr}`);
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
    if (typeof value === "string") return `"${value}"`;
    if (typeof value === "object") {
        try {
            const str = JSON.stringify(value);
            return str.length > 50 ? str.substring(0, 47) + "..." : str;
        } catch {
            return "[Object]";
        }
    }
    return String(value);
}

/**
 * Centers text within a given width using padding.
 *
 * @param {string} text - Text to center
 * @param {number} width - Total width to center within
 * @returns {string} Padded text
 * @private
 */
function centerText(text: string, width: number): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return " ".repeat(padding) + text;
}

/**
 * Formats a summary of multiple validation results for terminal display.
 * Shows aggregate statistics and a list of all validated files with their status.
 *
 * @param {Map<string, ValidationResult>} results - Map of file paths to validation results
 * @param {ReportOptions} [options={}] - Formatting options
 * @returns {string} Formatted summary text
 *
 * @example
 * const results = new Map([
 *   ["./user1.json", { valid: true, errors: [] }],
 *   ["./user2.json", { valid: false, errors: [{ path: "", message: "Invalid" }] }]
 * ]);
 * console.log(formatSummary(results, { title: "Batch Results" }));
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
    lines.push("=".repeat(60));
    lines.push(centerText(title, 60));
    lines.push("=".repeat(60));
    lines.push("");

    if (timestamp) {
        lines.push(`Date: ${new Date().toISOString()}`);
        lines.push("");
    }

    // Summary stats
    lines.push("-".repeat(60));
    lines.push(`Files Validated: ${results.size}`);
    lines.push(`  Valid:   ${validCount}`);
    lines.push(`  Invalid: ${invalidCount}`);
    lines.push(`  Total Errors: ${totalErrors}`);
    lines.push("-".repeat(60));
    lines.push("");

    // Individual results
    results.forEach((result, filePath) => {
        const status = result.valid ? "[PASS]" : "[FAIL]";
        const errorInfo = result.valid ? "" : ` (${result.errors.length} errors)`;
        lines.push(`${status} ${filePath}${errorInfo}`);
    });

    lines.push("");
    lines.push("=".repeat(60));

    return lines.join("\n");
}
