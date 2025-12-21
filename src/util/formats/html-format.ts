/**
 * @fileoverview HTML Format - HTML with inline CSS formatting for validation reports
 * @module util/formats/html-format
 * @description Provides HTML formatting of validation results with inline CSS styles.
 * Creates self-contained HTML documents suitable for viewing in any browser,
 * email embedding, or archiving. Uses a modern, responsive design.
 */

import type { ValidationResult, ValidationError } from "../json-types.js";

/**
 * Options for formatting reports.
 * @interface ReportOptions
 * @property {string} [title] - Title to display in the report header and page title
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
 * Formats a validation result as a complete HTML document with inline CSS.
 * Creates a visually styled, self-contained HTML page with color-coded status.
 *
 * @param {ValidationResult} result - The validation result to format
 * @param {ReportOptions} [options={}] - Formatting options
 * @returns {string} Complete HTML document as a string
 *
 * @example
 * const result = { valid: true, errors: [] };
 * const html = formatReport(result, { title: "Schema Validation", filePath: "./data.json" });
 * fs.writeFileSync("report.html", html);
 */
export function formatReport(result: ValidationResult, options: ReportOptions = {}): string {
    const { title = "Validation Report", filePath, schemaPath, timestamp = true } = options;

    const statusColor = result.valid ? "#22c55e" : "#ef4444";
    const statusText = result.valid ? "VALID" : "INVALID";
    const statusBg = result.valid ? "#f0fdf4" : "#fef2f2";

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f9fafb; color: #1f2937;">
    <div style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 24px;">
        <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #111827;">${escapeHtml(title)}</h1>
`;

    // Metadata
    if (timestamp || filePath || schemaPath) {
        html += `        <div style="background: #f3f4f6; border-radius: 6px; padding: 12px; margin-bottom: 20px; font-size: 14px;">
`;
        if (timestamp) {
            html += `            <div><strong>Date:</strong> ${new Date().toISOString()}</div>\n`;
        }
        if (filePath) {
            html += `            <div><strong>File:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 3px;">${escapeHtml(filePath)}</code></div>\n`;
        }
        if (schemaPath) {
            html += `            <div><strong>Schema:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 3px;">${escapeHtml(schemaPath)}</code></div>\n`;
        }
        html += `        </div>\n`;
    }

    // Status badge
    html += `        <div style="background: ${statusBg}; border: 1px solid ${statusColor}; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
            <span style="display: inline-block; background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 4px; font-weight: 600; font-size: 14px;">${statusText}</span>
`;

    if (result.valid) {
        html += `            <p style="margin: 12px 0 0 0; color: #166534;">No validation errors found.</p>\n`;
    } else {
        html += `            <p style="margin: 12px 0 0 0; color: #991b1b;">Found <strong>${result.errors.length}</strong> validation error${result.errors.length === 1 ? "" : "s"}.</p>\n`;
    }

    html += `        </div>\n`;

    // Errors
    if (!result.valid && result.errors.length > 0) {
        html += `        <h2 style="font-size: 18px; margin: 24px 0 16px 0; color: #111827;">Errors</h2>\n`;

        result.errors.forEach((error, index) => {
            html += formatError(error, index + 1);
        });
    }

    html += `    </div>
</body>
</html>`;

    return html;
}

/**
 * Formats a single validation error as HTML with styled error card.
 *
 * @param {ValidationError} error - The error to format
 * @param {number} index - Error number for display
 * @returns {string} HTML fragment for the error
 * @private
 */
function formatError(error: ValidationError, index: number): string {
    let html = `        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin-bottom: 12px; border-radius: 0 6px 6px 0;">
            <div style="font-weight: 600; color: #991b1b; margin-bottom: 8px;">Error #${index}</div>
            <div style="font-size: 14px; color: #1f2937;">
                <div style="margin-bottom: 4px;"><strong>Path:</strong> <code style="background: #fee2e2; padding: 2px 6px; border-radius: 3px;">${escapeHtml(error.path || "(root)")}</code></div>
                <div style="margin-bottom: 4px;"><strong>Message:</strong> ${escapeHtml(error.message)}</div>
`;

    if (error.value !== undefined) {
        const valueStr = formatValue(error.value);
        html += `                <div><strong>Value:</strong> <code style="background: #fee2e2; padding: 2px 6px; border-radius: 3px;">${escapeHtml(valueStr)}</code></div>\n`;
    }

    html += `            </div>
        </div>\n`;

    return html;
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
 * Escapes HTML special characters to prevent XSS and display issues.
 *
 * @param {string} text - Text to escape
 * @returns {string} HTML-safe text with entities escaped
 * @private
 */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Formats a summary of multiple validation results as a complete HTML document.
 * Creates a dashboard-style report with statistics grid, results table, and
 * detailed error listings for failed files.
 *
 * @param {Map<string, ValidationResult>} results - Map of file paths to validation results
 * @param {ReportOptions} [options={}] - Formatting options
 * @returns {string} Complete HTML document as a string
 *
 * @example
 * const results = validateFiles(["./a.json", "./b.json"], schema);
 * const html = formatSummary(results, { title: "Batch Validation Report" });
 * fs.writeFileSync("summary.html", html);
 */
export function formatSummary(
    results: Map<string, ValidationResult>,
    options: ReportOptions = {}
): string {
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

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; background: #f9fafb; color: #1f2937;">
    <div style="background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 24px;">
        <h1 style="margin: 0 0 16px 0; font-size: 24px; color: #111827;">${escapeHtml(title)}</h1>
`;

    if (timestamp) {
        html += `        <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">Generated: ${new Date().toISOString()}</p>\n`;
    }

    // Summary stats
    html += `        <h2 style="font-size: 18px; margin: 24px 0 16px 0; color: #111827;">Summary</h2>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;">
            <div style="background: #f3f4f6; padding: 16px; border-radius: 6px; text-align: center;">
                <div style="font-size: 24px; font-weight: 700; color: #111827;">${results.size}</div>
                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Files</div>
            </div>
            <div style="background: #f0fdf4; padding: 16px; border-radius: 6px; text-align: center;">
                <div style="font-size: 24px; font-weight: 700; color: #22c55e;">${validCount}</div>
                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Valid</div>
            </div>
            <div style="background: #fef2f2; padding: 16px; border-radius: 6px; text-align: center;">
                <div style="font-size: 24px; font-weight: 700; color: #ef4444;">${invalidCount}</div>
                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Invalid</div>
            </div>
            <div style="background: #fefce8; padding: 16px; border-radius: 6px; text-align: center;">
                <div style="font-size: 24px; font-weight: 700; color: #ca8a04;">${totalErrors}</div>
                <div style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Errors</div>
            </div>
        </div>
`;

    // Results table
    html += `        <h2 style="font-size: 18px; margin: 24px 0 16px 0; color: #111827;">Results</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
                <tr style="background: #f3f4f6;">
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">Status</th>
                    <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e5e7eb;">File</th>
                    <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e5e7eb;">Errors</th>
                </tr>
            </thead>
            <tbody>
`;

    results.forEach((result, filePath) => {
        const statusColor = result.valid ? "#22c55e" : "#ef4444";
        const statusText = result.valid ? "PASS" : "FAIL";
        const errorCount = result.valid ? "-" : String(result.errors.length);

        html += `                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><span style="background: ${statusColor}; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px; font-weight: 600;">${statusText}</span></td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;"><code style="background: #f3f4f6; padding: 2px 6px; border-radius: 3px;">${escapeHtml(filePath)}</code></td>
                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${errorCount}</td>
                </tr>\n`;
    });

    html += `            </tbody>
        </table>
`;

    // Detailed errors for failed files
    const failedFiles = Array.from(results.entries()).filter(([, r]) => !r.valid);
    if (failedFiles.length > 0) {
        html += `        <h2 style="font-size: 18px; margin: 24px 0 16px 0; color: #111827;">Detailed Errors</h2>\n`;

        failedFiles.forEach(([filePath, result]) => {
            html += `        <div style="margin-bottom: 24px;">
            <h3 style="font-size: 16px; margin: 0 0 12px 0; color: #374151;"><code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${escapeHtml(filePath)}</code></h3>
`;

            result.errors.forEach((error, index) => {
                html += `            <div style="background: #fef2f2; border-left: 3px solid #ef4444; padding: 8px 12px; margin-bottom: 8px; font-size: 14px;">
                <strong>${index + 1}.</strong> <code>${escapeHtml(error.path || "(root)")}</code>: ${escapeHtml(error.message)}
            </div>\n`;
            });

            html += `        </div>\n`;
        });
    }

    html += `    </div>
</body>
</html>`;

    return html;
}
