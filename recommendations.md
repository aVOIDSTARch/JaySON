# JaySON JSON Library — Recommendations

A comprehensive recommendations document covering design issues, missing functionality, and general improvements for the JaySON JSON library.

---

## 1. Design Issues

### 1.1 `$ref` Silently Skipped

`$ref` references in JSON Schema are currently skipped without warning or error. This leads to:

- **Silent failures**: Schemas that rely on `$ref` for reuse or composition appear to validate but do not actually enforce the referenced constraints.
- **User confusion**: Developers may assume their schema is fully applied when it is not.
- **Recommendation**: Either implement proper `$ref` resolution (with cycle detection) or emit a clear warning/error when `$ref` is encountered, rather than silently ignoring it.

### 1.2 `allOf` Not Implemented

The `allOf` keyword for schema composition is not implemented. This prevents:

- Combining multiple schemas (e.g., base + extension)
- Reusable schema fragments
- Common patterns for inheritance and mixins

**Recommendation**: Implement `allOf` so that an instance must validate against all subschemas in the array.

### 1.3 `additionalProperties` Not Implemented

Without `additionalProperties`, schemas cannot restrict or allow extra properties on objects. This affects:

- Strict object validation
- Open vs. closed object models
- Schema clarity and predictability

**Recommendation**: Implement `additionalProperties` (boolean or schema) to control whether properties not listed in `properties` are allowed.

### 1.4 `format` Not Implemented

The `format` keyword (e.g., `date-time`, `email`, `uri`) is typically not enforced. This means:

- No validation of `date-time`, `email`, `uri`, `uuid`, etc.
- Weaker data quality guarantees
- Inconsistency with common JSON Schema expectations

**Recommendation**: Add optional format validation (ideally behind a flag to avoid breaking changes) for common formats such as `date-time`, `email`, `uri`, and `uuid`.

### 1.5 God Class `JsonMaker`

`JsonMaker` appears to handle too many responsibilities, leading to:

- Hard-to-maintain code
- Difficult testing and mocking
- Violations of single-responsibility principle

**Recommendation**: Split `JsonMaker` into smaller, focused components (e.g., schema loader, validator, error builder, type handlers) and compose them rather than centralizing logic in one class.

### 1.6 API Mismatches

Inconsistencies between the public API and implementation (e.g., method signatures, return types, or behavior) can cause:

- Surprise for users of the library
- Brittle integrations
- Extra support burden

**Recommendation**: Audit the public API against documentation and tests, align behavior with expectations, and version the API clearly (e.g., semantic versioning).

### 1.7 Schema Path vs. Schema Object API

Most methods take `schemaPath: string` and load from disk. No first-class API for validating against an in-memory schema object (common when schemas come from APIs, codegen, or dynamic sources).

**Recommendation**: Support both `validate(data, schemaPath)` and `validate(data, schemaObject)`.

### 1.8 extractFields Semantics

`extractFields(data, ["user.name"])` returns `[{ "user.name": "John" }]` — the path becomes the key. Users may expect nested structure `[{ user: { name: "John" } }]`.

**Recommendation**: Document clearly or add option for flatten vs. nested output.

### 1.9 splitJsonFile Assumes Array

`splitJsonFile` assumes input is always an array. Non-array input causes runtime errors when iterating.

**Recommendation**: Validate input type and throw a clear error, or support wrapping a single object in an array.

---

## 2. Missing Functionality

### 2.1 Validation Features

- **Custom validators**: No pluggable validation logic for custom keywords or formats.
- **Error collection**: Limited or no support for collecting all validation errors in one pass.
- **Path reporting**: Validation errors may not include clear JSON Pointer paths to the failing location.
- **Recommendation**: Add extensible validation hooks, full error collection mode, and structured error paths (e.g., JSON Pointer).

### 2.2 Schema Compilation

- Schemas are likely interpreted on each validation, which can be slow for repeated use.
- **Recommendation**: Provide a schema compilation step that produces an optimized validator for reuse across many instances.

### 2.3 Async / Streaming

- No async validation API for large inputs.
- No streaming validation for incremental parsing.
- **Recommendation**: Add async validation and streaming APIs for large or network-sourced JSON.

### 2.4 URL Data Source

- No built-in support for loading schemas or data from URLs (e.g., `http://`, `https://`).
- **Recommendation**: Provide optional URL-based loading for schemas and data, with configurable fetch behavior and caching.

### 2.5 Format Validation

- As noted in design issues, `format` is not implemented.
- **Recommendation**: Implement format validation for common types (`date-time`, `email`, `uri`, `uuid`, etc.) with optional enable/disable.

### 2.6 Browser Support

- Library may be Node.js–centric.
- **Recommendation**: Ensure compatibility with bundlers (Webpack, Vite, etc.) and provide a browser-friendly build (e.g., UMD or ES modules) with clear documentation for browser usage.

---

## 3. General Recommendations

### 3.1 Modular Exports

- Export functionality in smaller, composable modules (e.g., `validate`, `compile`, `formats`).
- Allow tree-shaking so consumers only bundle what they use.
- **Recommendation**: Use named exports and package.json `exports` field for clear, modular entry points.

### 3.2 Benchmarks

- Lack of benchmarks makes performance regressions and comparisons difficult.
- **Recommendation**: Add a benchmark suite (e.g., against other JSON Schema validators) and run it in CI to track performance over time.

### 3.3 Error Quality

- Validation errors should be clear, actionable, and include:
  - JSON Pointer or path to the failing location
  - Schema keyword that failed
  - Human-readable message
  - Optional machine-readable error codes
- **Recommendation**: Define a structured error format (e.g., compatible with JSON Schema error output) and ensure all validation failures use it.

### 3.4 Documentation

- Provide:
  - Quick start and installation
  - API reference (e.g., JSDoc or generated docs)
  - Examples for common use cases
  - Migration guides for breaking changes
- **Recommendation**: Maintain a docs site or README with examples, and keep API docs in sync with the codebase.

### 3.5 Testing

- Expand test coverage for edge cases, invalid inputs, and schema combinations.
- Add property-based or fuzz testing for robustness.
- **Recommendation**: Aim for high coverage of the validation engine and schema handling, including JSON Schema test suite compliance where applicable.

### 3.6 Differentiator Positioning

- Clarify what makes JaySON distinct (e.g., speed, simplicity, bundle size, specific use case).
- **Recommendation**: Document the library’s goals, trade-offs, and target users so adopters can choose it confidently vs. alternatives like Ajv, ajv-formats, or other validators.

---

## 4. Priority Summary

| Priority | Item |
|----------|------|
| P0 | Fix $ref (implement or fail explicitly); Implement allOf and additionalProperties |
| P1 | Add schema object overload for validate(); Implement URL data source; Modular exports |
| P2 | Schema compilation; Format validation (opt-in); Async I/O |
| P3 | Benchmarks and performance docs; Browser/edge build |

---

*Document generated for the JaySON JSON library project.*
