/**
 * Markdown Format - Markdown formatting for reports
 */

import type { ValidationResult, ValidationError } from "../json-types.js";

export interface ReportOptions {
    title?: string;
    filePath?: string;
    schemaPath?: string;
    timestamp?: boolean;
}

/**
 * Format a validation result as Markdown
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
 * Format a single validation error as Markdown
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
 * Format a value for display
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
 * Format a summary of multiple validation results as Markdown
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
