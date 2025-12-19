# JSON Maker

A TypeScript utility for working with JSON schemas, validating data, and creating JSON files.

## Features

- Load and parse JSON schemas (draft-07)
- Validate JSON data against schemas
- Create and write JSON files
- Read and extract data from JSON files
- Transform and filter data
- Merge and split JSON files
- Generate template objects from schemas

## Installation

The module is part of the color-server project. Import it directly:

```typescript
import { JsonMaker, jsonMaker, validateJson, readJson, writeJson } from "./json-maker";
```

## Usage

### Basic Validation

```typescript
import { jsonMaker } from "./json-maker";

// Validate data against a schema
const result = jsonMaker.validate(myData, "color-file-schema.json");

if (result.valid) {
    console.log("Data is valid!");
} else {
    console.log("Validation errors:", result.errors);
}

// Validate a JSON file
const fileResult = jsonMaker.validateFile("./data/colors/red.json", "color-file-schema.json");
```

### Reading and Writing JSON

```typescript
import { readJson, writeJson } from "./json-maker";

// Read a JSON file
const colors = readJson<ColorData[]>("./data/colors.json");

// Write data to a JSON file
writeJson(myData, "./output/result.json", {
    prettyPrint: true,
    indentSize: 4
});

// Write with schema reference
writeJson(myData, "./output/result.json", {
    includeSchema: true,
    schemaUrl: "./json-schema/color-file-schema.json"
});
```

### Create Validated JSON

```typescript
// Only writes the file if validation passes
const result = jsonMaker.createValidatedJson(
    colorData,
    "color-file-schema.json",
    "./output/new-color.json"
);

if (!result.valid) {
    console.log("Failed to create file:", result.errors);
}
```

### Schema Information

```typescript
import { getSchemaInfo } from "./json-maker";

const info = getSchemaInfo("color-palette-schema.json");
console.log(info);
// {
//   title: "Color Palette Schema",
//   description: "Schema for color palette definition files",
//   rootType: "object",
//   requiredFields: ["palette-name", "version", "author", "date-created", "collection"],
//   properties: ["palette-name", "project-name", "version", ...]
// }
```

### Generate Templates

```typescript
// Generate an empty object matching the schema structure
const template = jsonMaker.generateTemplate("color-file-schema.json");
```

### Data Transformation

```typescript
// Extract specific fields
const names = jsonMaker.extractFields(colorData, ["name", "color-family"]);

// Transform data
const transformed = jsonMaker.transformData(colors, (color, index) => ({
    id: index,
    displayName: color.name.toUpperCase(),
    hex: color["color-codes"].hex
}));

// Filter data
const redColors = jsonMaker.filterData(colors,
    color => color["color-family"] === "Red Shades"
);
```

### Merge and Split Files

```typescript
// Merge multiple JSON files into one
jsonMaker.mergeJsonFiles(
    ["./colors/red.json", "./colors/blue.json", "./colors/green.json"],
    "./output/all-colors.json"
);

// Split a JSON array into multiple files by a field
const createdFiles = jsonMaker.splitJsonFile(
    "./data/all-colors.json",
    "./output/by-family/",
    "color-family",
    (family) => `${family.toLowerCase().replace(" ", "-")}.json`
);
```

### List Available Schemas

```typescript
const schemas = jsonMaker.listSchemas();
// ["./json-schema/color-file-schema.json", "./json-schema/color-palette-schema.json", ...]
```

## API Reference

### Class: JsonMaker

#### Constructor

```typescript
new JsonMaker(schemaDir?: string)
```

- `schemaDir` - Directory containing schema files (default: `"./json-schema"`)

#### Methods

| Method | Description |
|--------|-------------|
| `loadSchema(schemaPath)` | Load a JSON schema from file |
| `getSchemaInfo(schemaPath)` | Get metadata about a schema |
| `validate(data, schemaPath)` | Validate data against a schema |
| `validateFile(filePath, schemaPath)` | Validate a JSON file |
| `validateFiles(filePaths, schemaPath)` | Validate multiple files |
| `readData(config)` | Read data from a source |
| `writeJson(data, outputPath, options?)` | Write data to JSON file |
| `createValidatedJson(data, schemaPath, outputPath, options?)` | Create JSON file with validation |
| `extractFields(data, fields)` | Extract specific fields from data |
| `transformData(data, transformer)` | Transform data using a function |
| `filterData(data, predicate)` | Filter data based on a predicate |
| `mergeJsonFiles(filePaths, outputPath)` | Merge multiple JSON files |
| `splitJsonFile(inputPath, outputDir, splitBy, fileNamePattern)` | Split JSON into multiple files |
| `generateTemplate(schemaPath)` | Generate empty object from schema |
| `listSchemas()` | List all available schemas |

### Convenience Functions

```typescript
validateJson(data, schemaPath): ValidationResult
validateJsonFile(filePath, schemaPath): ValidationResult
writeJson(data, outputPath, options?): void
readJson<T>(filePath): T
getSchemaInfo(schemaPath): SchemaInfo
```

### Interfaces

#### ValidationResult

```typescript
interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}
```

#### ValidationError

```typescript
interface ValidationError {
    path: string;
    message: string;
    value?: unknown;
}
```

#### WriteOptions

```typescript
interface WriteOptions {
    prettyPrint?: boolean;    // Default: true
    indentSize?: number;      // Default: 4
    includeSchema?: boolean;  // Default: false
    schemaUrl?: string;
}
```

#### SchemaInfo

```typescript
interface SchemaInfo {
    title: string;
    description: string;
    rootType: string;
    requiredFields: string[];
    properties: string[];
}
```

## Schema Support

The validator supports JSON Schema draft-07 features including:

- Type validation (`string`, `number`, `integer`, `boolean`, `array`, `object`, `null`)
- Required fields
- Enum values
- String patterns (regex)
- Number ranges (`minimum`, `maximum`)
- String length (`minLength`, `maxLength`)
- Nested object validation
- Array item validation
- `oneOf` and `anyOf` combinators

## Available Schemas

The following schemas are available in `./json-schema/`:

- `color-file-schema.json` - Individual color definitions
- `color-collection-schema.json` - Color file collections
- `color-palette-schema.json` - Color palettes with metadata
- `color-families-schema.json` - Color family definitions
- `color-code-formats-schema.json` - Color code format definitions
- `website-theme-schema.json` - Website theme configurations
