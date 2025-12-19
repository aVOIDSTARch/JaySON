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
import * as path from "path";

// Schema definitions
interface JsonSchema {
    $schema?: string;
    title?: string;
    description?: string;
    type: string;
    items?: JsonSchema | JsonSchemaRef;
    properties?: Record<string, JsonSchemaProperty>;
    required?: string[];
    additionalProperties?: boolean | JsonSchemaProperty;
    enum?: (string | number | boolean)[];
    oneOf?: JsonSchemaProperty[];
    anyOf?: JsonSchemaProperty[];
    allOf?: JsonSchemaProperty[];
    $ref?: string;
    definitions?: Record<string, JsonSchema>;
    pattern?: string;
    format?: string;
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    default?: unknown;
}

interface JsonSchemaRef {
    $ref: string;
}

interface JsonSchemaProperty {
    type?: string | string[];
    description?: string;
    properties?: Record<string, JsonSchemaProperty>;
    items?: JsonSchemaProperty | JsonSchemaRef;
    required?: string[];
    enum?: (string | number | boolean)[];
    pattern?: string;
    format?: string;
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    default?: unknown;
    oneOf?: JsonSchemaProperty[];
    anyOf?: JsonSchemaProperty[];
    allOf?: JsonSchemaProperty[];
    $ref?: string;
    additionalProperties?: boolean | JsonSchemaProperty;
}

interface ValidationError {
    path: string;
    message: string;
    value?: unknown;
}

interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}

interface SchemaInfo {
    title: string;
    description: string;
    rootType: string;
    requiredFields: string[];
    properties: string[];
}

type DataSource = "file" | "object" | "url";

interface DataSourceConfig {
    type: DataSource;
    path?: string;
    data?: unknown;
    url?: string;
}

interface WriteOptions {
    prettyPrint?: boolean;
    indentSize?: number;
    includeSchema?: boolean;
    schemaUrl?: string;
}

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
        const fullPath = path.isAbsolute(schemaPath)
            ? schemaPath
            : path.join(this.schemaDir, schemaPath);

        if (this.schemaCache.has(fullPath)) {
            return this.schemaCache.get(fullPath)!;
        }

        if (!fs.existsSync(fullPath)) {
            throw new Error(`Schema file not found: ${fullPath}`);
        }

        const content = fs.readFileSync(fullPath, "utf-8");
        const schema = JSON.parse(content) as JsonSchema;
        this.schemaCache.set(fullPath, schema);
        return schema;
    }

    /**
     * Get information about a schema
     */
    getSchemaInfo(schemaPath: string): SchemaInfo {
        const schema = this.loadSchema(schemaPath);

        let properties: string[] = [];
        let requiredFields: string[] = [];

        if (schema.type === "object" && schema.properties) {
            properties = Object.keys(schema.properties);
            requiredFields = schema.required || [];
        } else if (schema.type === "array" && schema.items) {
            const items = schema.items as JsonSchema;
            if (items.properties) {
                properties = Object.keys(items.properties);
                requiredFields = items.required || [];
            }
        }

        return {
            title: schema.title || "Untitled Schema",
            description: schema.description || "",
            rootType: schema.type,
            requiredFields,
            properties,
        };
    }

    /**
     * Validate data against a schema
     */
    validate(data: unknown, schemaPath: string): ValidationResult {
        const schema = this.loadSchema(schemaPath);
        const errors: ValidationError[] = [];

        this.validateValue(data, schema, "", errors);

        return {
            valid: errors.length === 0,
            errors,
        };
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
        switch (config.type) {
            case "file":
                if (!config.path) {
                    throw new Error("File path is required for file data source");
                }
                if (!fs.existsSync(config.path)) {
                    throw new Error(`File not found: ${config.path}`);
                }
                return JSON.parse(fs.readFileSync(config.path, "utf-8"));

            case "object":
                if (config.data === undefined) {
                    throw new Error("Data is required for object data source");
                }
                return config.data;

            case "url":
                throw new Error(
                    "URL data source not yet implemented - use WebFetch tool"
                );

            default:
                throw new Error(`Unknown data source type: ${config.type}`);
        }
    }

    /**
     * Write data to a JSON file
     */
    writeJson(
        data: unknown,
        outputPath: string,
        options: WriteOptions = {}
    ): void {
        const {
            prettyPrint = true,
            indentSize = 4,
            includeSchema = false,
            schemaUrl,
        } = options;

        let outputData = data;

        if (includeSchema && schemaUrl && typeof data === "object" && data !== null) {
            outputData = {
                $schema: schemaUrl,
                ...data,
            };
        }

        const content = prettyPrint
            ? JSON.stringify(outputData, null, indentSize)
            : JSON.stringify(outputData);

        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(outputPath, content, "utf-8");
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
        if (!Array.isArray(data)) {
            data = [data];
        }

        return (data as Record<string, unknown>[]).map((item) => {
            const extracted: Record<string, unknown> = {};
            for (const field of fields) {
                extracted[field] = this.getNestedValue(item, field);
            }
            return extracted as T;
        });
    }

    /**
     * Transform data using a mapping function
     */
    transformData<TInput, TOutput>(
        data: TInput[],
        transformer: (item: TInput, index: number) => TOutput
    ): TOutput[] {
        return data.map(transformer);
    }

    /**
     * Filter data based on a predicate
     */
    filterData<T>(data: T[], predicate: (item: T) => boolean): T[] {
        return data.filter(predicate);
    }

    /**
     * Merge multiple JSON files into one
     */
    mergeJsonFiles(filePaths: string[], outputPath: string): void {
        const merged: unknown[] = [];

        for (const filePath of filePaths) {
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, "utf-8");
                const data = JSON.parse(content);
                if (Array.isArray(data)) {
                    merged.push(...data);
                } else {
                    merged.push(data);
                }
            }
        }

        this.writeJson(merged, outputPath);
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
        const data = this.readData({ type: "file", path: inputPath }) as Record<
            string,
            unknown
        >[];
        const groups = new Map<string, Record<string, unknown>[]>();

        for (const item of data) {
            const key = String(item[splitBy] || "unknown");
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key)!.push(item);
        }

        const createdFiles: string[] = [];

        groups.forEach((items, key) => {
            const fileName = fileNamePattern(key);
            const outputPath = path.join(outputDir, fileName);
            this.writeJson(items, outputPath);
            createdFiles.push(outputPath);
        });

        return createdFiles;
    }

    /**
     * Generate an empty object that conforms to a schema
     */
    generateTemplate(schemaPath: string): Record<string, unknown> | unknown[] {
        const schema = this.loadSchema(schemaPath);
        return this.generateFromSchema(schema);
    }

    /**
     * List all available schemas
     */
    listSchemas(): string[] {
        if (!fs.existsSync(this.schemaDir)) {
            return [];
        }

        return fs
            .readdirSync(this.schemaDir)
            .filter((file) => file.endsWith(".json"))
            .map((file) => path.join(this.schemaDir, file));
    }

    // Private helper methods

    private validateValue(
        value: unknown,
        schema: JsonSchemaProperty | JsonSchema,
        path: string,
        errors: ValidationError[]
    ): void {
        // Handle $ref
        if (schema.$ref) {
            // For now, skip $ref validation
            return;
        }

        // Handle oneOf
        if (schema.oneOf) {
            const validCount = schema.oneOf.filter((subSchema) => {
                const subErrors: ValidationError[] = [];
                this.validateValue(value, subSchema, path, subErrors);
                return subErrors.length === 0;
            }).length;

            if (validCount !== 1) {
                errors.push({
                    path,
                    message: `Value must match exactly one of the oneOf schemas`,
                    value,
                });
            }
            return;
        }

        // Handle anyOf
        if (schema.anyOf) {
            const isValid = schema.anyOf.some((subSchema) => {
                const subErrors: ValidationError[] = [];
                this.validateValue(value, subSchema, path, subErrors);
                return subErrors.length === 0;
            });

            if (!isValid) {
                errors.push({
                    path,
                    message: `Value must match at least one of the anyOf schemas`,
                    value,
                });
            }
            return;
        }

        const schemaType = schema.type;

        // Type validation
        if (schemaType) {
            const types = Array.isArray(schemaType) ? schemaType : [schemaType];
            const actualType = this.getType(value);

            if (!types.includes(actualType)) {
                errors.push({
                    path,
                    message: `Expected type ${types.join(" | ")}, got ${actualType}`,
                    value,
                });
                return;
            }
        }

        // Enum validation
        if (schema.enum && !schema.enum.includes(value as string | number | boolean)) {
            errors.push({
                path,
                message: `Value must be one of: ${schema.enum.join(", ")}`,
                value,
            });
        }

        // Pattern validation for strings
        if (schema.pattern && typeof value === "string") {
            const regex = new RegExp(schema.pattern);
            if (!regex.test(value)) {
                errors.push({
                    path,
                    message: `Value does not match pattern: ${schema.pattern}`,
                    value,
                });
            }
        }

        // Number range validation
        if (typeof value === "number") {
            if (schema.minimum !== undefined && value < schema.minimum) {
                errors.push({
                    path,
                    message: `Value must be >= ${schema.minimum}`,
                    value,
                });
            }
            if (schema.maximum !== undefined && value > schema.maximum) {
                errors.push({
                    path,
                    message: `Value must be <= ${schema.maximum}`,
                    value,
                });
            }
        }

        // String length validation
        if (typeof value === "string") {
            if (schema.minLength !== undefined && value.length < schema.minLength) {
                errors.push({
                    path,
                    message: `String length must be >= ${schema.minLength}`,
                    value,
                });
            }
            if (schema.maxLength !== undefined && value.length > schema.maxLength) {
                errors.push({
                    path,
                    message: `String length must be <= ${schema.maxLength}`,
                    value,
                });
            }
        }

        // Object validation
        if (schemaType === "object" && typeof value === "object" && value !== null) {
            const obj = value as Record<string, unknown>;

            // Required fields
            if (schema.required) {
                for (const field of schema.required) {
                    if (!(field in obj)) {
                        errors.push({
                            path: path ? `${path}.${field}` : field,
                            message: `Required field missing`,
                        });
                    }
                }
            }

            // Property validation
            if (schema.properties) {
                for (const [key, propSchema] of Object.entries(schema.properties)) {
                    if (key in obj) {
                        this.validateValue(
                            obj[key],
                            propSchema,
                            path ? `${path}.${key}` : key,
                            errors
                        );
                    }
                }
            }
        }

        // Array validation
        if (schemaType === "array" && Array.isArray(value)) {
            if (schema.items) {
                value.forEach((item, index) => {
                    this.validateValue(
                        item,
                        schema.items as JsonSchemaProperty,
                        `${path}[${index}]`,
                        errors
                    );
                });
            }
        }
    }

    private getType(value: unknown): string {
        if (value === null) return "null";
        if (Array.isArray(value)) return "array";
        if (typeof value === "number" && Number.isInteger(value)) return "integer";
        return typeof value;
    }

    private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
        const parts = path.split(".");
        let current: unknown = obj;

        for (const part of parts) {
            if (current === null || current === undefined) {
                return undefined;
            }
            current = (current as Record<string, unknown>)[part];
        }

        return current;
    }

    private generateFromSchema(
        schema: JsonSchemaProperty | JsonSchema
    ): Record<string, unknown> | unknown[] {
        if (schema.type === "array") {
            return [];
        }

        if (schema.type !== "object" || !schema.properties) {
            return {};
        }

        const result: Record<string, unknown> = {};

        for (const [key, propSchema] of Object.entries(schema.properties)) {
            if (propSchema.default !== undefined) {
                result[key] = propSchema.default;
            } else if (propSchema.enum && propSchema.enum.length > 0) {
                result[key] = propSchema.enum[0];
            } else if (propSchema.type === "string") {
                result[key] = "";
            } else if (propSchema.type === "number" || propSchema.type === "integer") {
                result[key] = propSchema.minimum ?? 0;
            } else if (propSchema.type === "boolean") {
                result[key] = false;
            } else if (propSchema.type === "array") {
                result[key] = [];
            } else if (propSchema.type === "object") {
                result[key] = this.generateFromSchema(propSchema);
            } else {
                result[key] = null;
            }
        }

        return result;
    }
}

// Export a default instance
export const jsonMaker = new JsonMaker();

// Export utility functions for convenience
export function validateJson(
    data: unknown,
    schemaPath: string
): ValidationResult {
    return jsonMaker.validate(data, schemaPath);
}

export function validateJsonFile(
    filePath: string,
    schemaPath: string
): ValidationResult {
    return jsonMaker.validateFile(filePath, schemaPath);
}

export function writeJson(
    data: unknown,
    outputPath: string,
    options?: WriteOptions
): void {
    jsonMaker.writeJson(data, outputPath, options);
}

export function readJson<T = unknown>(filePath: string): T {
    return jsonMaker.readData({ type: "file", path: filePath }) as T;
}

export function getSchemaInfo(schemaPath: string): SchemaInfo {
    return jsonMaker.getSchemaInfo(schemaPath);
}
