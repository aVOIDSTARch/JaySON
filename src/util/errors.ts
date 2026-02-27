/**
 * @fileoverview JaySON Error Library
 * @module util/errors
 * @description Comprehensive error catalog with codes, technical messages,
 * and simple user-friendly explanations returned when appropriate.
 */

/**
 * Error definition with user-facing explanation and optional fix hint.
 */
export interface ErrorDefinition {
    /** Machine-readable error code */
    code: string;
    /** Technical message (for logs, developers) */
    message: string;
    /** Simple explanation for end users */
    explanation: string;
    /** Optional hint on how to fix the issue */
    hint?: string;
}

/**
 * Error catalog: code -> definition.
 * Used to enrich errors with explanations when returned to users.
 */
export const ERROR_CATALOG: Record<string, ErrorDefinition> = {
    // Validation errors
    type: {
        code: "type",
        message: "Expected type {expected}, got {actual}",
        explanation: "This field has the wrong type. Check that you're using the correct data type (text, number, list, etc.).",
        hint: "Ensure the value matches the expected type. For example, use a number instead of text for numeric fields.",
    },
    required: {
        code: "required",
        message: "Required field missing",
        explanation: "This field is required but was not provided.",
        hint: "Add the missing field to your data. Check the schema for a list of required fields.",
    },
    enum: {
        code: "enum",
        message: "Value must be one of: {allowed}",
        explanation: "This field only accepts specific values. The value you provided is not in the allowed list.",
        hint: "Choose one of the allowed values. Check the error message for the list of valid options.",
    },
    pattern: {
        code: "pattern",
        message: "Value does not match pattern",
        explanation: "This field has a format requirement that your value doesn't satisfy.",
        hint: "Check the format expected (e.g., email format, phone number pattern). Adjust your value to match.",
    },
    format: {
        code: "format",
        message: "Value does not match format \"{format}\"",
        explanation: "This field expects a specific format (like email, date, or URL). Your value doesn't match.",
        hint: "Use the correct format. For example: email should be user@domain.com, date should be YYYY-MM-DD.",
    },
    minimum: {
        code: "minimum",
        message: "Value must be >= {minimum}",
        explanation: "This number is too small. It must be at least the minimum value shown.",
        hint: "Increase the value to meet the minimum requirement.",
    },
    maximum: {
        code: "maximum",
        message: "Value must be <= {maximum}",
        explanation: "This number is too large. It must not exceed the maximum value shown.",
        hint: "Decrease the value to stay within the allowed range.",
    },
    minLength: {
        code: "minLength",
        message: "String length must be >= {minLength}",
        explanation: "This text is too short. It needs to be at least the minimum number of characters.",
        hint: "Add more characters to meet the minimum length requirement.",
    },
    maxLength: {
        code: "maxLength",
        message: "String length must be <= {maxLength}",
        explanation: "This text is too long. It must not exceed the maximum number of characters.",
        hint: "Shorten the text to stay within the allowed length.",
    },
    additionalProperties: {
        code: "additionalProperties",
        message: "Additional property \"{property}\" is not allowed",
        explanation: "This field is not allowed in the schema. Only predefined fields are accepted.",
        hint: "Remove the extra field or add it to the schema if it should be allowed.",
    },
    oneOf: {
        code: "oneOf",
        message: "Value must match exactly one of the oneOf schemas",
        explanation: "This field must match one of several possible formats. Your value doesn't match any of them exactly.",
        hint: "Ensure your value matches exactly one of the allowed formats. Check the schema for options.",
    },
    anyOf: {
        code: "anyOf",
        message: "Value must match at least one of the anyOf schemas",
        explanation: "This field must match at least one of several possible formats. Your value doesn't match any.",
        hint: "Adjust your value to match at least one of the allowed formats.",
    },
    "ref-unsupported": {
        code: "ref-unsupported",
        message: "$ref not yet supported",
        explanation: "This schema uses references ($ref) which are not yet supported in this validator.",
        hint: "Use inline schemas instead of $ref, or wait for $ref support in a future version.",
    },

    // I/O and runtime errors
    "file-not-found": {
        code: "file-not-found",
        message: "File not found: {path}",
        explanation: "The file could not be found at the specified path.",
        hint: "Check that the file path is correct and the file exists. Use an absolute path or correct relative path.",
    },
    "file-parse-error": {
        code: "file-parse-error",
        message: "Failed to parse JSON",
        explanation: "The file could not be read as valid JSON.",
        hint: "Check the file for syntax errors: missing commas, brackets, or quotes. Use a JSON validator.",
    },
    "schema-not-found": {
        code: "schema-not-found",
        message: "Schema file not found",
        explanation: "The JSON Schema file could not be found.",
        hint: "Verify the schema path is correct and the file exists. Run 'jayson init' to set up the schema directory.",
    },
    "path-required": {
        code: "path-required",
        message: "File path is required",
        explanation: "A file path must be provided for this operation.",
        hint: "Add the path to the file you want to read or write.",
    },
    "data-required": {
        code: "data-required",
        message: "Data is required for object source",
        explanation: "Data must be provided when using an inline data source.",
        hint: "Pass the data object you want to validate or process.",
    },
    "url-required": {
        code: "url-required",
        message: "URL is required for url data source",
        explanation: "A URL must be provided when fetching data from the web.",
        hint: "Add the URL (e.g., https://api.example.com/data.json) you want to load.",
    },
    "url-requires-async": {
        code: "url-requires-async",
        message: "URL data source requires async API",
        explanation: "Loading from URLs requires the async API because it involves network requests.",
        hint: "Use readDataAsync() or readJsonAsync() instead of readData() for URL sources.",
    },
    "unknown-source": {
        code: "unknown-source",
        message: "Unknown data source type",
        explanation: "The data source type specified is not recognized.",
        hint: "Use 'file', 'object', or 'url' as the data source type.",
    },
    "split-requires-array": {
        code: "split-requires-array",
        message: "splitJsonFile requires an array input",
        explanation: "The file must contain a JSON array to split. It currently contains something else.",
        hint: "Ensure your JSON file has a root array, e.g. [{...}, {...}]. Objects cannot be split.",
    },
    "unknown-format": {
        code: "unknown-format",
        message: "Unknown report format",
        explanation: "The requested report format is not supported.",
        hint: "Use 'terminal', 'markdown', or 'html' as the format.",
    },
};

/**
 * Options for enriching errors with user-facing explanations.
 */
export interface ErrorEnrichmentOptions {
    /** Include simple explanation for users. Default: true. */
    includeExplanation?: boolean;
    /** Include fix hint when available. Default: true. */
    includeHint?: boolean;
}

const DEFAULT_ENRICHMENT: ErrorEnrichmentOptions = {
    includeExplanation: true,
    includeHint: true,
};

/**
 * Gets the error definition for a code, with optional placeholder substitution.
 *
 * @param code - Error code
 * @param placeholders - Key-value pairs to replace in message (e.g. { expected: "string", actual: "number" })
 * @returns Error definition or undefined if not found
 */
export function getErrorDefinition(
    code: string,
    placeholders?: Record<string, string | number>
): ErrorDefinition | undefined {
    const def = ERROR_CATALOG[code];
    if (!def) return undefined;

    if (placeholders && Object.keys(placeholders).length > 0) {
        let message = def.message;
        let explanation = def.explanation;
        let hint = def.hint;

        for (const [key, value] of Object.entries(placeholders)) {
            const placeholder = `{${key}}`;
            message = message.replace(placeholder, String(value));
            explanation = explanation?.replace(placeholder, String(value));
            hint = hint?.replace(placeholder, String(value));
        }

        return { ...def, message, explanation, hint };
    }

    return def;
}

/**
 * Enriches an error object with explanation and hint from the catalog.
 *
 * @param error - Base error with at least code and message
 * @param options - Whether to include explanation and hint
 * @returns Error with optional explanation and hint added
 */
export function enrichError<T extends { code?: string; message: string }>(
    error: T,
    options: ErrorEnrichmentOptions = {}
): T & { explanation?: string; hint?: string } {
    const opts = { ...DEFAULT_ENRICHMENT, ...options };
    const code = error.code;
    if (!code || (!opts.includeExplanation && !opts.includeHint)) {
        return error as T & { explanation?: string; hint?: string };
    }

    const def = getErrorDefinition(code);
    if (!def) return error as T & { explanation?: string; hint?: string };

    const enriched = { ...error } as T & { explanation?: string; hint?: string };
    if (opts.includeExplanation && def.explanation) {
        enriched.explanation = def.explanation;
    }
    if (opts.includeHint && def.hint) {
        enriched.hint = def.hint;
    }
    return enriched;
}

/**
 * All error codes in the catalog.
 */
export const ERROR_CODES = Object.keys(ERROR_CATALOG) as string[];

/**
 * Creates a validation-style error from the catalog for non-validation cases (I/O, etc.).
 * Use when returning errors to users in ValidationResult or similar structures.
 *
 * @param code - Error code from the catalog
 * @param path - Path/location (use "" for root)
 * @param placeholders - Optional placeholders for message substitution
 * @returns Error object with path, message, code, explanation, hint
 */
export function createErrorFromCatalog(
    code: string,
    path: string = "",
    placeholders?: Record<string, string | number>
): {
    path: string;
    message: string;
    code: string;
    explanation?: string;
    hint?: string;
} {
    const def = getErrorDefinition(code, placeholders);
    return {
        path,
        message: def?.message ?? code,
        code,
        ...(def?.explanation && { explanation: def.explanation }),
        ...(def?.hint && { hint: def.hint }),
    };
}
