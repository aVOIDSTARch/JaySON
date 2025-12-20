/**
 * JSON Types - Type definitions for JSON schema operations
 */

/**
 * JSON Schema definition
 */
export interface JsonSchema {
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

/**
 * JSON Schema reference
 */
export interface JsonSchemaRef {
    $ref: string;
}

/**
 * JSON Schema property definition
 */
export interface JsonSchemaProperty {
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

/**
 * Validation error details
 */
export interface ValidationError {
    path: string;
    message: string;
    value?: unknown;
}

/**
 * Result of validation operation
 */
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}

/**
 * Schema metadata information
 */
export interface SchemaInfo {
    title: string;
    description: string;
    rootType: string;
    requiredFields: string[];
    properties: string[];
}

/**
 * Data source types
 */
export type DataSource = "file" | "object" | "url";

/**
 * Data source configuration
 */
export interface DataSourceConfig {
    type: DataSource;
    path?: string;
    data?: unknown;
    url?: string;
}

/**
 * JSON write options
 */
export interface WriteOptions {
    prettyPrint?: boolean;
    indentSize?: number;
    includeSchema?: boolean;
    schemaUrl?: string;
}
