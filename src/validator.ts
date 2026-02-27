/**
 * @fileoverview JaySON Validator - Validation-only entry point
 * @module jayson/validator
 * @description Browser-safe validation module. No Node.js fs/path dependencies.
 * Use this when you only need schema validation without file I/O.
 *
 * @example
 * import { validate, type ValidateOptions } from "@casinelli/jayson/validator";
 *
 * const result = validate(data, schema, { validateFormat: true });
 */

export {
    validate,
    validateAsync,
    validateValue,
    getValueType,
    compile,
    pathToInstancePointer,
    type ValidateOptions,
    type CompiledValidator,
} from "./util/json-validator.js";

export type {
    JsonSchema,
    JsonSchemaRef,
    JsonSchemaProperty,
    ValidationError,
    ValidationResult,
} from "./util/json-types.js";

export {
    ERROR_CATALOG,
    getErrorDefinition,
    createErrorFromCatalog,
    type ErrorDefinition,
} from "./util/errors.js";
