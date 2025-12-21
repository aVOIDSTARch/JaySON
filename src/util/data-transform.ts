/**
 * @fileoverview Data Transform - Transform and extract data from JSON
 * @module util/data-transform
 * @description Provides utility functions for transforming, filtering, and
 * extracting data from JSON structures. Supports nested property access
 * using dot notation and functional transformation patterns.
 */

/**
 * Gets a nested value from an object using dot notation path.
 * Safely navigates through nested objects and arrays.
 *
 * @param {Record<string, unknown>} obj - The object to extract value from
 * @param {string} path - Dot-notation path to the value (e.g., "user.address.city")
 * @returns {unknown} The value at the path, or undefined if not found
 *
 * @example
 * const obj = {
 *   user: {
 *     profile: { name: "John", email: "john@example.com" }
 *   }
 * };
 *
 * getNestedValue(obj, "user.profile.name");  // returns "John"
 * getNestedValue(obj, "user.profile.age");   // returns undefined
 * getNestedValue(obj, "items.0.id");         // works with array indices
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
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

/**
 * Extracts specific fields from JSON data into a new array of objects.
 * Supports nested field extraction using dot notation.
 *
 * @template T - The type of the extracted objects
 * @param {unknown} data - The source data (object or array of objects)
 * @param {string[]} fields - Array of field paths to extract
 * @returns {T[]} Array of objects containing only the specified fields
 *
 * @example
 * const users = [
 *   { id: 1, name: "John", email: "john@example.com", age: 30 },
 *   { id: 2, name: "Jane", email: "jane@example.com", age: 25 }
 * ];
 *
 * extractFields(users, ["name", "email"]);
 * // Returns: [
 * //   { name: "John", email: "john@example.com" },
 * //   { name: "Jane", email: "jane@example.com" }
 * // ]
 *
 * // Works with nested paths
 * extractFields(data, ["user.name", "user.address.city"]);
 */
export function extractFields<T = unknown>(data: unknown, fields: string[]): T[] {
    const dataArray = Array.isArray(data) ? data : [data];

    return (dataArray as Record<string, unknown>[]).map((item) => {
        const extracted: Record<string, unknown> = {};
        for (const field of fields) {
            extracted[field] = getNestedValue(item, field);
        }
        return extracted as T;
    });
}

/**
 * Transforms an array of data using a mapping function.
 * A type-safe wrapper around Array.map() with index access.
 *
 * @template TInput - The type of input items
 * @template TOutput - The type of output items
 * @param {TInput[]} data - The array of items to transform
 * @param {(item: TInput, index: number) => TOutput} transformer - Function to transform each item
 * @returns {TOutput[]} Array of transformed items
 *
 * @example
 * const numbers = [1, 2, 3, 4, 5];
 * const doubled = transformData(numbers, (n) => n * 2);
 * // Returns: [2, 4, 6, 8, 10]
 *
 * const users = [{ name: "john" }, { name: "jane" }];
 * const formatted = transformData(users, (user, index) => ({
 *   id: index + 1,
 *   name: user.name.toUpperCase()
 * }));
 * // Returns: [{ id: 1, name: "JOHN" }, { id: 2, name: "JANE" }]
 */
export function transformData<TInput, TOutput>(
    data: TInput[],
    transformer: (item: TInput, index: number) => TOutput
): TOutput[] {
    return data.map(transformer);
}

/**
 * Filters an array of data based on a predicate function.
 * A type-safe wrapper around Array.filter().
 *
 * @template T - The type of items in the array
 * @param {T[]} data - The array of items to filter
 * @param {(item: T) => boolean} predicate - Function that returns true for items to keep
 * @returns {T[]} Array containing only items that passed the predicate
 *
 * @example
 * const numbers = [1, 2, 3, 4, 5, 6];
 * const evens = filterData(numbers, (n) => n % 2 === 0);
 * // Returns: [2, 4, 6]
 *
 * const users = [
 *   { name: "John", active: true },
 *   { name: "Jane", active: false },
 *   { name: "Bob", active: true }
 * ];
 * const activeUsers = filterData(users, (user) => user.active);
 * // Returns: [{ name: "John", active: true }, { name: "Bob", active: true }]
 */
export function filterData<T>(data: T[], predicate: (item: T) => boolean): T[] {
    return data.filter(predicate);
}
