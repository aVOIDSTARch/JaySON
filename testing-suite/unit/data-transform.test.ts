/**
 * Unit Tests for data-transform.ts
 */

import { describe, it, expect } from "vitest";
import {
    getNestedValue,
    extractFields,
    transformData,
    filterData,
} from "../../src/util/data-transform.js";

describe("data-transform", () => {
    describe("getNestedValue()", () => {
        it("should get top-level property", () => {
            const obj = { name: "John", age: 30 };
            expect(getNestedValue(obj, "name")).toBe("John");
            expect(getNestedValue(obj, "age")).toBe(30);
        });

        it("should get nested property using dot notation", () => {
            const obj = {
                user: {
                    profile: {
                        name: "John",
                        email: "john@example.com",
                    },
                },
            };
            expect(getNestedValue(obj, "user.profile.name")).toBe("John");
            expect(getNestedValue(obj, "user.profile.email")).toBe("john@example.com");
        });

        it("should return undefined for non-existent path", () => {
            const obj = { name: "John" };
            expect(getNestedValue(obj, "email")).toBeUndefined();
            expect(getNestedValue(obj, "user.name")).toBeUndefined();
        });

        it("should handle null values in path", () => {
            const obj = { user: null };
            expect(getNestedValue(obj, "user.name")).toBeUndefined();
        });

        it("should handle array indices in path", () => {
            const obj = {
                items: [{ id: 1 }, { id: 2 }],
            };
            expect(getNestedValue(obj, "items.0.id")).toBe(1);
            expect(getNestedValue(obj, "items.1.id")).toBe(2);
        });
    });

    describe("extractFields()", () => {
        it("should extract specified fields from object", () => {
            const data = { id: 1, name: "John", email: "john@example.com", age: 30 };
            const result = extractFields(data, ["name", "email"]);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({ name: "John", email: "john@example.com" });
        });

        it("should extract fields from array of objects", () => {
            const data = [
                { id: 1, name: "John", email: "john@example.com" },
                { id: 2, name: "Jane", email: "jane@example.com" },
            ];
            const result = extractFields(data, ["name"]);

            expect(result).toHaveLength(2);
            expect(result[0]).toEqual({ name: "John" });
            expect(result[1]).toEqual({ name: "Jane" });
        });

        it("should extract nested fields using dot notation", () => {
            const data = {
                user: {
                    profile: {
                        name: "John",
                        settings: {
                            theme: "dark",
                        },
                    },
                },
            };
            const result = extractFields(data, ["user.profile.name", "user.profile.settings.theme"]);

            expect(result[0]["user.profile.name"]).toBe("John");
            expect(result[0]["user.profile.settings.theme"]).toBe("dark");
        });

        it("should set undefined for non-existent fields", () => {
            const data = { name: "John" };
            const result = extractFields(data, ["name", "nonexistent"]);

            expect(result[0].name).toBe("John");
            expect(result[0].nonexistent).toBeUndefined();
        });

        it("should handle empty fields array", () => {
            const data = { name: "John" };
            const result = extractFields(data, []);

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual({});
        });
    });

    describe("transformData()", () => {
        it("should transform array items using mapper function", () => {
            const data = [1, 2, 3, 4, 5];
            const result = transformData(data, (x) => x * 2);

            expect(result).toEqual([2, 4, 6, 8, 10]);
        });

        it("should provide index to transformer function", () => {
            const data = ["a", "b", "c"];
            const result = transformData(data, (item, index) => `${index}:${item}`);

            expect(result).toEqual(["0:a", "1:b", "2:c"]);
        });

        it("should transform objects", () => {
            const data = [
                { name: "john", age: 25 },
                { name: "jane", age: 30 },
            ];
            const result = transformData(data, (user) => ({
                ...user,
                name: user.name.toUpperCase(),
            }));

            expect(result[0].name).toBe("JOHN");
            expect(result[1].name).toBe("JANE");
        });

        it("should handle empty array", () => {
            const result = transformData([], (x) => x);
            expect(result).toEqual([]);
        });

        it("should transform to different types", () => {
            const data = [{ value: 10 }, { value: 20 }];
            const result = transformData(data, (obj) => obj.value);

            expect(result).toEqual([10, 20]);
        });
    });

    describe("filterData()", () => {
        it("should filter array based on predicate", () => {
            const data = [1, 2, 3, 4, 5, 6];
            const result = filterData(data, (x) => x % 2 === 0);

            expect(result).toEqual([2, 4, 6]);
        });

        it("should filter objects based on property", () => {
            const data = [
                { name: "John", active: true },
                { name: "Jane", active: false },
                { name: "Bob", active: true },
            ];
            const result = filterData(data, (user) => user.active);

            expect(result).toHaveLength(2);
            expect(result.map((u) => u.name)).toEqual(["John", "Bob"]);
        });

        it("should return empty array when no items match", () => {
            const data = [1, 2, 3];
            const result = filterData(data, (x) => x > 10);

            expect(result).toEqual([]);
        });

        it("should return all items when all match", () => {
            const data = [2, 4, 6];
            const result = filterData(data, (x) => x % 2 === 0);

            expect(result).toEqual([2, 4, 6]);
        });

        it("should handle empty input array", () => {
            const result = filterData([], () => true);
            expect(result).toEqual([]);
        });
    });
});
