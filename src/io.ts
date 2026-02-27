/**
 * @fileoverview JaySON I/O - File and URL I/O entry point
 * @module jayson/io
 * @description JSON read/write, merge, and split operations.
 * Use this when you need file or URL I/O without validation.
 *
 * @example
 * import { readJson, writeJson, readJsonAsync } from "@casinelli/jayson/io";
 *
 * const data = readJson("./data.json");
 * await readJsonAsync("https://api.example.com/data.json");
 */

export {
    readData,
    readDataAsync,
    readJsonAsync,
    writeJson,
    mergeJsonFiles,
    splitJsonFile,
} from "./util/json-io.js";

export type { DataSourceConfig, WriteOptions } from "./util/json-types.js";
