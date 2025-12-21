import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        // Test file patterns
        include: ["testing-suite/**/*.test.ts"],

        // Environment
        environment: "node",

        // Global test timeout
        testTimeout: 10000,

        // Coverage configuration
        coverage: {
            provider: "v8",
            reporter: ["text", "html", "lcov", "json"],
            reportsDirectory: "./testing-suite/coverage",
            include: ["src/**/*.ts"],
            exclude: ["src/cli.ts", "**/*.d.ts", "**/node_modules/**"],
        },

        // Reporter configuration
        reporters: ["default"],

        // Setup files
        setupFiles: ["./testing-suite/setup.ts"],

        // Global variables available in tests
        globals: true,

        // Retry failed tests
        retry: 1,
    },
});
