/**
 * Vitest Global Setup
 * This file runs before all tests
 */

import { beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

// Test output directories
const TEST_OUTPUT_DIR = path.join(process.cwd(), "testing-suite", ".test-output");
const TEST_TEMP_DIR = path.join(process.cwd(), "testing-suite", ".temp");

/**
 * Create test directories before running tests
 */
beforeAll(() => {
    // Clean and recreate output directories
    if (fs.existsSync(TEST_TEMP_DIR)) {
        fs.rmSync(TEST_TEMP_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_TEMP_DIR, { recursive: true });

    if (!fs.existsSync(TEST_OUTPUT_DIR)) {
        fs.mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
    }
});

/**
 * Clean up after all tests complete
 */
afterAll(() => {
    // Clean up temp directory after all tests
    if (fs.existsSync(TEST_TEMP_DIR)) {
        fs.rmSync(TEST_TEMP_DIR, { recursive: true, force: true });
    }
});

// Export paths for use in tests
export { TEST_OUTPUT_DIR, TEST_TEMP_DIR };
