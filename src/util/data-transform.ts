/**
 * Data Transform - Transform and extract data from JSON
 */

/**
 * Get a nested value from an object using dot notation
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
 * Extract specific fields from JSON data
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
 * Transform data using a mapping function
 */
export function transformData<TInput, TOutput>(
    data: TInput[],
    transformer: (item: TInput, index: number) => TOutput
): TOutput[] {
    return data.map(transformer);
}

/**
 * Filter data based on a predicate
 */
export function filterData<T>(data: T[], predicate: (item: T) => boolean): T[] {
    return data.filter(predicate);
}
