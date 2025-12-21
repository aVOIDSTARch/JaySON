/**
 * @fileoverview JSON Types - Core type definitions for JSON schema operations
 * @module util/json-types
 * @description Provides TypeScript interfaces and types for JSON Schema validation,
 * data handling, and schema operations throughout the JaySON library.
 */

/**
 * JSON Schema definition following the JSON Schema specification.
 * Represents a complete schema document that can be used for validation.
 *
 * @interface JsonSchema
 * @see {@link https://json-schema.org/specification.html JSON Schema Specification}
 *
 * @example
 * const userSchema: JsonSchema = {
 *   $schema: "https://json-schema.org/draft/2020-12/schema",
 *   title: "User",
 *   type: "object",
 *   properties: {
 *     id: { type: "integer" },
 *     name: { type: "string" }
 *   },
 *   required: ["id", "name"]
 * };
 */
export interface JsonSchema {
    /** The JSON Schema version URI (e.g., "https://json-schema.org/draft/2020-12/schema") */
    $schema?: string;
    /** Human-readable title for the schema */
    title?: string;
    /** Detailed description of what the schema represents */
    description?: string;
    /** The data type (object, array, string, number, integer, boolean, null) */
    type: string;
    /** Schema for array items (when type is "array") */
    items?: JsonSchema | JsonSchemaRef;
    /** Property definitions for object types */
    properties?: Record<string, JsonSchemaProperty>;
    /** List of required property names */
    required?: string[];
    /** Whether additional properties are allowed, or their schema */
    additionalProperties?: boolean | JsonSchemaProperty;
    /** Enumerated list of valid values */
    enum?: (string | number | boolean)[];
    /** Exactly one of these schemas must match */
    oneOf?: JsonSchemaProperty[];
    /** At least one of these schemas must match */
    anyOf?: JsonSchemaProperty[];
    /** All of these schemas must match */
    allOf?: JsonSchemaProperty[];
    /** Reference to another schema definition */
    $ref?: string;
    /** Reusable schema definitions */
    definitions?: Record<string, JsonSchema>;
    /** Regular expression pattern for string validation */
    pattern?: string;
    /** Semantic format hint (e.g., "email", "date-time", "uri") */
    format?: string;
    /** Minimum value for numbers */
    minimum?: number;
    /** Maximum value for numbers */
    maximum?: number;
    /** Minimum string length */
    minLength?: number;
    /** Maximum string length */
    maxLength?: number;
    /** Default value when property is not provided */
    default?: unknown;
}

/**
 * JSON Schema reference object.
 * Used to reference another schema definition using a JSON Pointer.
 *
 * @interface JsonSchemaRef
 *
 * @example
 * const ref: JsonSchemaRef = { $ref: "#/definitions/Address" };
 */
export interface JsonSchemaRef {
    /** JSON Pointer reference to another schema (e.g., "#/definitions/User") */
    $ref: string;
}

/**
 * JSON Schema property definition.
 * Represents the schema for a single property within an object schema.
 *
 * @interface JsonSchemaProperty
 *
 * @example
 * const emailProperty: JsonSchemaProperty = {
 *   type: "string",
 *   format: "email",
 *   description: "User's email address",
 *   minLength: 5
 * };
 */
export interface JsonSchemaProperty {
    /** The data type(s) for this property (can be single type or array of types) */
    type?: string | string[];
    /** Human-readable description of the property */
    description?: string;
    /** Nested property definitions for object types */
    properties?: Record<string, JsonSchemaProperty>;
    /** Schema for array items */
    items?: JsonSchemaProperty | JsonSchemaRef;
    /** Required nested properties */
    required?: string[];
    /** Enumerated list of valid values */
    enum?: (string | number | boolean)[];
    /** Regular expression pattern for string validation */
    pattern?: string;
    /** Semantic format hint */
    format?: string;
    /** Minimum value for numbers */
    minimum?: number;
    /** Maximum value for numbers */
    maximum?: number;
    /** Minimum string length */
    minLength?: number;
    /** Maximum string length */
    maxLength?: number;
    /** Default value */
    default?: unknown;
    /** Exactly one of these schemas must match */
    oneOf?: JsonSchemaProperty[];
    /** At least one of these schemas must match */
    anyOf?: JsonSchemaProperty[];
    /** All of these schemas must match */
    allOf?: JsonSchemaProperty[];
    /** Reference to another schema definition */
    $ref?: string;
    /** Whether additional properties are allowed */
    additionalProperties?: boolean | JsonSchemaProperty;
}

/**
 * Validation error details.
 * Contains information about a specific validation failure.
 *
 * @interface ValidationError
 *
 * @example
 * const error: ValidationError = {
 *   path: "user.email",
 *   message: "Value does not match pattern: ^[a-z]+@[a-z]+\\.[a-z]+$",
 *   value: "invalid-email"
 * };
 */
export interface ValidationError {
    /** JSON path to the invalid property (e.g., "user.address.city") */
    path: string;
    /** Human-readable error message explaining the validation failure */
    message: string;
    /** The actual value that failed validation */
    value?: unknown;
}

/**
 * Result of a validation operation.
 * Contains the validation status and any errors encountered.
 *
 * @interface ValidationResult
 *
 * @example
 * const result: ValidationResult = {
 *   valid: false,
 *   errors: [
 *     { path: "name", message: "Required field missing" }
 *   ]
 * };
 */
export interface ValidationResult {
    /** Whether the data passed validation */
    valid: boolean;
    /** Array of validation errors (empty if valid is true) */
    errors: ValidationError[];
}

/**
 * Schema metadata information.
 * Provides a summary of schema structure for display and analysis.
 *
 * @interface SchemaInfo
 *
 * @example
 * const info: SchemaInfo = {
 *   title: "User",
 *   description: "A user account",
 *   rootType: "object",
 *   requiredFields: ["id", "name", "email"],
 *   properties: ["id", "name", "email", "age", "active"]
 * };
 */
export interface SchemaInfo {
    /** The schema title */
    title: string;
    /** The schema description */
    description: string;
    /** The root data type */
    rootType: string;
    /** List of required field names */
    requiredFields: string[];
    /** List of all property names */
    properties: string[];
}

/**
 * Supported data source types.
 * Defines how data can be loaded for validation.
 *
 * @typedef {('file'|'object'|'url')} DataSource
 */
export type DataSource = "file" | "object" | "url";

/**
 * Data source configuration.
 * Specifies where and how to load data for validation.
 *
 * @interface DataSourceConfig
 *
 * @example
 * // Load from file
 * const fileConfig: DataSourceConfig = {
 *   type: "file",
 *   path: "./data/users.json"
 * };
 *
 * // Load from object
 * const objectConfig: DataSourceConfig = {
 *   type: "object",
 *   data: { id: 1, name: "John" }
 * };
 */
export interface DataSourceConfig {
    /** The type of data source */
    type: DataSource;
    /** File path (required when type is "file") */
    path?: string;
    /** Data object (required when type is "object") */
    data?: unknown;
    /** URL to fetch data from (required when type is "url") */
    url?: string;
}

/**
 * Options for writing JSON files.
 * Controls formatting and schema inclusion in output.
 *
 * @interface WriteOptions
 *
 * @example
 * const options: WriteOptions = {
 *   prettyPrint: true,
 *   indentSize: 2,
 *   includeSchema: true,
 *   schemaUrl: "https://example.com/schemas/user.json"
 * };
 */
export interface WriteOptions {
    /** Whether to format output with indentation (default: true) */
    prettyPrint?: boolean;
    /** Number of spaces for indentation (default: 4) */
    indentSize?: number;
    /** Whether to include $schema property in output */
    includeSchema?: boolean;
    /** URL of the schema to include */
    schemaUrl?: string;
}
