# JaySON

A **comprehensive**, **lightweight**, and **fast** JSON library for TypeScript and JavaScript. Schema validation, I/O, transforms, type generation, and reports—with zero runtime dependencies.

## Why JaySON

- **Comprehensive** — JSON Schema validation (drafts 04, 06, 07, 2019-09, 2020-12), read/write/merge/split, transforms, templates, TypeScript/JS codegen, and multi-format reports (terminal, markdown, HTML).
- **Lightweight** — No npm runtime dependencies; uses only Node built-ins. Small surface area and tree-shakeable entry points.
- **Fast** — Schema caching, synchronous validation, and minimal allocations for hot paths.

## Features

- Load and parse JSON schemas (draft-04 through 2020-12)
- Validate JSON data against schemas (types, enums, patterns, ranges, `oneOf`/`anyOf`)
- Read/write JSON files with formatting options
- Transform, filter, and extract fields (including dot-notation)
- Merge and split JSON files
- Generate template objects from schemas
- Generate TypeScript interfaces and JavaScript ES5 classes from schemas
- Validation reports in terminal, markdown, and HTML
- CLI: `validate`, `report`, `generate`, `init`, `update`, `detect`
- Optional: download/update JSON Schema meta-schemas

## Installation

```bash
npm install @casinelli/jayson
```

## Usage

### Basic validation

```typescript
import { jsonMaker, validateJson } from "@casinelli/jayson";

// Validate data against a schema
const result = validateJson(myData, "./json-schema/user.json");

if (result.valid) {
  console.log("Data is valid!");
} else {
  console.log("Validation errors:", result.errors);
}

// Validate a JSON file
const fileResult = jsonMaker.validateFile("./data/user.json", "./json-schema/user.json");
```

### Reading and writing JSON

```typescript
import { readJson, writeJson } from "@casinelli/jayson";

const data = readJson<MyType[]>("./data.json");

writeJson(data, "./output/result.json", {
  prettyPrint: true,
  indentSize: 4,
});
```

### Create validated JSON

```typescript
const result = jsonMaker.createValidatedJson(
  myData,
  "./json-schema/config.json",
  "./output/config.json"
);
if (!result.valid) console.log("Validation failed:", result.errors);
```

### Schema info and templates

```typescript
import { getSchemaInfo, jsonMaker } from "@casinelli/jayson";

const info = getSchemaInfo("./json-schema/user.json");
const template = jsonMaker.generateTemplate("./json-schema/user.json");
```

### Transform and filter

```typescript
const names = jsonMaker.extractFields(data, ["name", "email"]);
const transformed = jsonMaker.transformData(data, (item, i) => ({ id: i, ...item }));
const filtered = jsonMaker.filterData(data, (item) => item.active);
```

### Merge and split files

```typescript
jsonMaker.mergeJsonFiles(
  ["./a.json", "./b.json", "./c.json"],
  "./output/merged.json"
);

const files = jsonMaker.splitJsonFile(
  "./data/all.json",
  "./output/by-category/",
  "category",
  (cat) => `${cat}.json`
);
```

### Generate types from schema

```typescript
const tsCode = jsonMaker.generateTypeScript("./json-schema/user.json");
jsonMaker.generateTypes("./json-schema/user.json", "./types", "User");
```

### Reports

```typescript
const result = jsonMaker.validateFile("./data.json", "./schema.json");
jsonMaker.printReport(result);
jsonMaker.generateReport(result, "./report.html", { format: "html" });
```

## CLI

```bash
jayson init
jayson validate data.json --schema schema.json
jayson report data.json --schema schema.json --format html
jayson generate schema.json --output ./types
jayson update --all
jayson detect schema.json
```

## API overview

| Area | Exports |
|------|--------|
| Core | `JsonMaker`, `jsonMaker`, `validateJson`, `validateJsonFile`, `readJson`, `writeJson`, `getSchemaInfo` |
| Types | `JsonSchema`, `ValidationResult`, `ValidationError`, `SchemaInfo`, `WriteOptions`, etc. |
| Standards | `StandardsUpdater`, `downloadMetaSchema`, `detectStandard`, `checkForUpdates`, … |
| Reports | `formatReport`, `formatSummary`, `ReportFormat`, `ReportOptions` |
| Codegen | `GenerateOptions` (used with `generateTypeScript` / `generateJavaScript`) |

## Schema support

- Types: `string`, `number`, `integer`, `boolean`, `null`, `array`, `object`
- Required fields, enums, string patterns (regex), number min/max, string minLength/maxLength
- Nested objects and array `items`
- Combinators: `oneOf`, `anyOf`

## License

MIT
