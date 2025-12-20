/**
 * Terminal Format - Plain text formatting for terminal output
 */

import type { ValidationResult, ValidationError } from "../json-types.js";

export interface ReportOptions {
    title?: string;
    filePath?: string;
    schemaPath?: string;
    timestamp?: boolean;
}

/**
 * Format a validation result for terminal display
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
 * Format a single validation error
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
 * Format a value for display
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
 * Center text within a given width
 */
function centerText(text: string, width: number): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return " ".repeat(padding) + text;
}

/**
 * Format a summary of multiple validation results
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
