/**
 * @fileoverview Type Generator - Generate TypeScript interfaces and JavaScript classes from JSON schemas
 * @module util/type-generator
 * @description Provides functionality to generate strongly-typed TypeScript interfaces
 * and JavaScript ES5 classes from JSON Schema definitions. Generated code includes
 * validation methods, serialization helpers, and proper type annotations.
 */

import * as fs from "fs";
import * as path from "path";
import type { JsonSchema, JsonSchemaProperty } from "./json-types.js";

/**
 * Options for type generation.
 * @interface GenerateOptions
 */
export interface GenerateOptions {
    /** Custom name for the exported type/class (defaults to schema title) */
    exportName?: string;
    /** Whether to include JSDoc comments from schema descriptions */
    includeDescriptions?: boolean;
    /** Number of spaces for indentation (default: 4) */
    indentSize?: number;
}

/**
 * Converts a JSON Schema property type to its TypeScript equivalent.
 *
 * @param {JsonSchemaProperty} prop - The schema property to convert
 * @returns {string} The TypeScript type string
 * @private
 *
 * @description Handles:
 * - Enum types (converted to union of literal types)
 * - $ref references (converted to PascalCase type name)
 * - oneOf/anyOf (converted to union types)
 * - allOf (converted to intersection types)
 * - Primitive types (string, number, boolean, null)
 * - Array types (with item type inference)
 * - Object types (as Record or named interface)
 */
function schemaTypeToTs(prop: JsonSchemaProperty): string {
    if (prop.enum) {
        return prop.enum.map((v) => (typeof v === "string" ? `"${v}"` : String(v))).join(" | ");
    }

    if (prop.$ref) {
        const refName = prop.$ref.split("/").pop() || "unknown";
        return toPascalCase(refName);
    }

    if (prop.oneOf || prop.anyOf) {
        const types = (prop.oneOf || prop.anyOf)!.map((s) => schemaTypeToTs(s));
        return types.join(" | ");
    }

    if (prop.allOf) {
        const types = prop.allOf.map((s) => schemaTypeToTs(s));
        return types.join(" & ");
    }

    const type = Array.isArray(prop.type) ? prop.type : [prop.type];

    const tsTypes = type.map((t) => {
        switch (t) {
            case "string":
                return "string";
            case "number":
            case "integer":
                return "number";
            case "boolean":
                return "boolean";
            case "null":
                return "null";
            case "array":
                if (prop.items) {
                    const itemType = schemaTypeToTs(prop.items as JsonSchemaProperty);
                    return `${itemType}[]`;
                }
                return "unknown[]";
            case "object":
                if (prop.properties) {
                    return "object";
                }
                return "Record<string, unknown>";
            default:
                return "unknown";
        }
    });

    return tsTypes.join(" | ");
}

/**
 * Converts a string to PascalCase.
 *
 * @param {string} str - The string to convert
 * @returns {string} The PascalCase string
 * @private
 *
 * @example
 * toPascalCase("user_profile");  // returns "UserProfile"
 * toPascalCase("my-component");  // returns "MyComponent"
 */
function toPascalCase(str: string): string {
    return str
        .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
        .replace(/^(.)/, (_, c) => c.toUpperCase());
}

/**
 * Converts a string to camelCase.
 *
 * @param {string} str - The string to convert
 * @returns {string} The camelCase string
 * @private
 *
 * @example
 * toCamelCase("user_profile");  // returns "userProfile"
 * toCamelCase("MyComponent");   // returns "myComponent"
 */
function toCamelCase(str: string): string {
    return str
        .replace(/[-_](.)/g, (_, c) => c.toUpperCase())
        .replace(/^(.)/, (_, c) => c.toLowerCase());
}

/**
 * Generates a TypeScript interface definition from a JSON Schema.
 * Creates properly typed interfaces with optional properties, nested types,
 * and JSDoc comments from schema descriptions.
 *
 * @param {JsonSchema} schema - The JSON Schema to generate from
 * @param {GenerateOptions} [options={}] - Generation options
 * @returns {string} The generated TypeScript code
 *
 * @example
 * const schema: JsonSchema = {
 *   title: "User",
 *   type: "object",
 *   properties: {
 *     id: { type: "integer", description: "Unique identifier" },
 *     name: { type: "string" },
 *     role: { type: "string", enum: ["admin", "user"] }
 *   },
 *   required: ["id", "name"]
 * };
 *
 * const tsCode = generateTypeScript(schema);
 * // Generates an interface like:
 * // export interface User { id: number; name: string; role?: "admin" | "user"; }
 */
export function generateTypeScript(
    schema: JsonSchema,
    options: GenerateOptions = {}
): string {
    const {
        exportName = schema.title ? toPascalCase(schema.title) : "GeneratedType",
        includeDescriptions = true,
        indentSize = 4,
    } = options;

    const indent = " ".repeat(indentSize);
    const lines: string[] = [];

    // File header
    lines.push("/**");
    lines.push(" * Auto-generated TypeScript interface from JSON Schema");
    lines.push(` * Generated: ${new Date().toISOString()}`);
    if (schema.title) {
        lines.push(` * Schema: ${schema.title}`);
    }
    lines.push(" */");
    lines.push("");

    // Generate nested interfaces for definitions
    if (schema.definitions) {
        for (const [name, defSchema] of Object.entries(schema.definitions)) {
            lines.push(...generateInterface(defSchema, toPascalCase(name), indent, includeDescriptions));
            lines.push("");
        }
    }

    // Generate nested interfaces for complex properties
    if (schema.properties) {
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
            if (propSchema.type === "object" && propSchema.properties) {
                const nestedName = exportName + toPascalCase(propName);
                lines.push(...generateInterface(propSchema, nestedName, indent, includeDescriptions));
                lines.push("");
            }
        }
    }

    // Generate main interface
    lines.push(...generateInterface(schema, exportName, indent, includeDescriptions));
    lines.push("");

    // Export default
    lines.push(`export default ${exportName};`);

    return lines.join("\n");
}

/**
 * Generates a single TypeScript interface.
 *
 * @param {JsonSchema | JsonSchemaProperty} schema - The schema to generate from
 * @param {string} name - The interface name
 * @param {string} indent - The indentation string
 * @param {boolean} includeDescriptions - Whether to include JSDoc comments
 * @returns {string[]} Array of code lines
 * @private
 */
function generateInterface(
    schema: JsonSchema | JsonSchemaProperty,
    name: string,
    indent: string,
    includeDescriptions: boolean
): string[] {
    const lines: string[] = [];
    const required = new Set(schema.required || []);

    if (includeDescriptions && schema.description) {
        lines.push("/**");
        lines.push(` * ${schema.description}`);
        lines.push(" */");
    }

    lines.push(`export interface ${name} {`);

    if (schema.properties) {
        for (const [propName, propSchema] of Object.entries(schema.properties)) {
            if (includeDescriptions && propSchema.description) {
                lines.push(`${indent}/** ${propSchema.description} */`);
            }

            const optional = required.has(propName) ? "" : "?";
            let tsType: string;

            // Check if this is a nested object that got its own interface
            if (propSchema.type === "object" && propSchema.properties) {
                tsType = name + toPascalCase(propName);
            } else {
                tsType = schemaTypeToTs(propSchema);
            }

            lines.push(`${indent}${propName}${optional}: ${tsType};`);
        }
    }

    lines.push("}");
    return lines;
}

/**
 * Generates a TypeScript interface and writes it to a file.
 * Creates parent directories if they don't exist.
 *
 * @param {JsonSchema} schema - The JSON Schema to generate from
 * @param {string} outputPath - The file path to write to
 * @param {GenerateOptions} [options={}] - Generation options
 * @returns {void}
 *
 * @example
 * generateTypeScriptFile(userSchema, "./types/User.ts");
 */
export function generateTypeScriptFile(
    schema: JsonSchema,
    outputPath: string,
    options: GenerateOptions = {}
): void {
    const content = generateTypeScript(schema, options);
    ensureDir(path.dirname(outputPath));
    fs.writeFileSync(outputPath, content, "utf-8");
}

/**
 * Gets the default value for a property type (for JavaScript class generation).
 *
 * @param {JsonSchemaProperty} prop - The property schema
 * @returns {string} JavaScript code for the default value
 * @private
 */
function getDefaultValue(prop: JsonSchemaProperty): string {
    if (prop.default !== undefined) {
        return JSON.stringify(prop.default);
    }

    if (prop.enum && prop.enum.length > 0) {
        return JSON.stringify(prop.enum[0]);
    }

    const type = Array.isArray(prop.type) ? prop.type[0] : prop.type;

    switch (type) {
        case "string":
            return '""';
        case "number":
        case "integer":
            return String(prop.minimum ?? 0);
        case "boolean":
            return "false";
        case "array":
            return "[]";
        case "object":
            return "{}";
        case "null":
            return "null";
        default:
            return "null";
    }
}

/**
 * Generates a JavaScript ES5 class from a JSON Schema.
 * Creates a class with constructor, validation, serialization, and deserialization methods.
 *
 * @param {JsonSchema} schema - The JSON Schema to generate from
 * @param {GenerateOptions} [options={}] - Generation options
 * @returns {string} The generated JavaScript code
 *
 * @example
 * const schema: JsonSchema = {
 *   title: "User",
 *   type: "object",
 *   properties: {
 *     id: { type: "integer" },
 *     name: { type: "string", minLength: 1 }
 *   },
 *   required: ["id", "name"]
 * };
 *
 * const jsCode = generateJavaScript(schema);
 * // Generates a class with:
 * // - constructor(data)
 * // - validate() method
 * // - toJSON() method
 * // - static fromJSON(json) method
 */
export function generateJavaScript(
    schema: JsonSchema,
    options: GenerateOptions = {}
): string {
    const {
        exportName = schema.title ? toPascalCase(schema.title) : "GeneratedClass",
        includeDescriptions = true,
        indentSize = 4,
    } = options;

    const indent = " ".repeat(indentSize);
    const lines: string[] = [];

    // File header
    lines.push("/**");
    lines.push(" * Auto-generated JavaScript class from JSON Schema");
    lines.push(` * Generated: ${new Date().toISOString()}`);
    if (schema.title) {
        lines.push(` * Schema: ${schema.title}`);
    }
    lines.push(" * @module");
    lines.push(" */");
    lines.push("");

    // Generate nested classes for definitions
    if (schema.definitions) {
        for (const [name, defSchema] of Object.entries(schema.definitions)) {
            lines.push(...generateClass(defSchema, toPascalCase(name), indent, includeDescriptions));
            lines.push("");
        }
    }

    // Generate main class
    lines.push(...generateClass(schema, exportName, indent, includeDescriptions));
    lines.push("");

    // ES5 module export
    lines.push("// ES5 Module Export");
    lines.push(`export { ${exportName} };`);
    lines.push(`export default ${exportName};`);

    return lines.join("\n");
}

/**
 * Generates a single JavaScript class.
 *
 * @param {JsonSchema | JsonSchemaProperty} schema - The schema to generate from
 * @param {string} name - The class name
 * @param {string} indent - The indentation string
 * @param {boolean} includeDescriptions - Whether to include JSDoc comments
 * @returns {string[]} Array of code lines
 * @private
 */
function generateClass(
    schema: JsonSchema | JsonSchemaProperty,
    name: string,
    indent: string,
    includeDescriptions: boolean
): string[] {
    const lines: string[] = [];
    const properties = schema.properties || {};
    const required = new Set(schema.required || []);

    if (includeDescriptions && schema.description) {
        lines.push("/**");
        lines.push(` * ${schema.description}`);
        lines.push(" */");
    }

    lines.push(`class ${name} {`);

    // Constructor
    lines.push(`${indent}/**`);
    lines.push(`${indent} * Create a new ${name} instance`);
    lines.push(`${indent} * @param {Object} [data={}] - Initial data`);
    lines.push(`${indent} */`);
    lines.push(`${indent}constructor(data) {`);
    lines.push(`${indent}${indent}data = data || {};`);

    for (const [propName, propSchema] of Object.entries(properties)) {
        const defaultVal = getDefaultValue(propSchema);
        const camelName = toCamelCase(propName);
        lines.push(
            `${indent}${indent}this.${camelName} = data.${propName} !== undefined ? data.${propName} : ${defaultVal};`
        );
    }

    lines.push(`${indent}}`);
    lines.push("");

    // Validation method
    lines.push(`${indent}/**`);
    lines.push(`${indent} * Validate the instance`);
    lines.push(`${indent} * @returns {{ valid: boolean, errors: Array<{ path: string, message: string }> }}`);
    lines.push(`${indent} */`);
    lines.push(`${indent}validate() {`);
    lines.push(`${indent}${indent}var errors = [];`);

    Array.from(required).forEach((propName) => {
        const camelName = toCamelCase(propName);
        lines.push(
            `${indent}${indent}if (this.${camelName} === undefined || this.${camelName} === null) {`
        );
        lines.push(
            `${indent}${indent}${indent}errors.push({ path: "${propName}", message: "Missing required field: ${propName}" });`
        );
        lines.push(`${indent}${indent}}`);
    });

    for (const [propName, propSchema] of Object.entries(properties)) {
        const camelName = toCamelCase(propName);
        const type = Array.isArray(propSchema.type) ? propSchema.type[0] : propSchema.type;

        if (type === "string" && propSchema.minLength) {
            lines.push(`${indent}${indent}if (typeof this.${camelName} === "string" && this.${camelName}.length < ${propSchema.minLength}) {`);
            lines.push(`${indent}${indent}${indent}errors.push({ path: "${propName}", message: "String must be at least ${propSchema.minLength} characters" });`);
            lines.push(`${indent}${indent}}`);
        }

        if ((type === "number" || type === "integer") && propSchema.minimum !== undefined) {
            lines.push(`${indent}${indent}if (typeof this.${camelName} === "number" && this.${camelName} < ${propSchema.minimum}) {`);
            lines.push(`${indent}${indent}${indent}errors.push({ path: "${propName}", message: "Value must be at least ${propSchema.minimum}" });`);
            lines.push(`${indent}${indent}}`);
        }

        if (propSchema.enum) {
            const enumValues = JSON.stringify(propSchema.enum);
            lines.push(`${indent}${indent}if (${enumValues}.indexOf(this.${camelName}) === -1) {`);
            lines.push(`${indent}${indent}${indent}errors.push({ path: "${propName}", message: "Value must be one of: ${propSchema.enum.join(", ")}" });`);
            lines.push(`${indent}${indent}}`);
        }
    }

    lines.push(`${indent}${indent}return { valid: errors.length === 0, errors: errors };`);
    lines.push(`${indent}}`);
    lines.push("");

    // toJSON method
    lines.push(`${indent}/**`);
    lines.push(`${indent} * Convert to plain object`);
    lines.push(`${indent} * @returns {Object}`);
    lines.push(`${indent} */`);
    lines.push(`${indent}toJSON() {`);
    lines.push(`${indent}${indent}return {`);

    const propNames = Object.keys(properties);
    propNames.forEach((propName, index) => {
        const camelName = toCamelCase(propName);
        const comma = index < propNames.length - 1 ? "," : "";
        lines.push(`${indent}${indent}${indent}${propName}: this.${camelName}${comma}`);
    });

    lines.push(`${indent}${indent}};`);
    lines.push(`${indent}}`);
    lines.push("");

    // fromJSON static method
    lines.push(`${indent}/**`);
    lines.push(`${indent} * Create instance from plain object`);
    lines.push(`${indent} * @param {Object} json - Plain object`);
    lines.push(`${indent} * @returns {${name}}`);
    lines.push(`${indent} */`);
    lines.push(`${indent}static fromJSON(json) {`);
    lines.push(`${indent}${indent}return new ${name}(json);`);
    lines.push(`${indent}}`);

    lines.push("}");
    return lines;
}

/**
 * Generates a JavaScript class and writes it to a file.
 * Creates parent directories if they don't exist.
 *
 * @param {JsonSchema} schema - The JSON Schema to generate from
 * @param {string} outputPath - The file path to write to
 * @param {GenerateOptions} [options={}] - Generation options
 * @returns {void}
 *
 * @example
 * generateJavaScriptFile(userSchema, "./classes/User.js");
 */
export function generateJavaScriptFile(
    schema: JsonSchema,
    outputPath: string,
    options: GenerateOptions = {}
): void {
    const content = generateJavaScript(schema, options);
    ensureDir(path.dirname(outputPath));
    fs.writeFileSync(outputPath, content, "utf-8");
}

/**
 * Generates both TypeScript interface and JavaScript class files.
 * Creates both files in the specified output directory.
 *
 * @param {JsonSchema} schema - The JSON Schema to generate from
 * @param {string} outputDir - Directory to write the files
 * @param {string} baseName - Base name for the files (without extension)
 * @param {GenerateOptions} [options={}] - Generation options
 * @returns {{ tsPath: string, jsPath: string }} Paths to the created files
 *
 * @example
 * const { tsPath, jsPath } = generateBoth(userSchema, "./output", "User");
 * // Creates: ./output/User.ts and ./output/User.js
 */
export function generateBoth(
    schema: JsonSchema,
    outputDir: string,
    baseName: string,
    options: GenerateOptions = {}
): { tsPath: string; jsPath: string } {
    ensureDir(outputDir);

    const tsPath = path.join(outputDir, `${baseName}.ts`);
    const jsPath = path.join(outputDir, `${baseName}.js`);

    generateTypeScriptFile(schema, tsPath, options);
    generateJavaScriptFile(schema, jsPath, options);

    return { tsPath, jsPath };
}

/**
 * Ensures a directory exists, creating it recursively if necessary.
 *
 * @param {string} dir - Directory path to ensure exists
 * @returns {void}
 * @private
 */
function ensureDir(dir: string): void {
    if (dir && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}
