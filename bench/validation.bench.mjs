/**
 * Validation benchmarks for JaySON
 * Run: npm run build && npm run bench
 */

import { Bench } from "tinybench";
import { validate, compile } from "../dist/esm/validator.js";

const simpleSchema = {
    type: "object",
    properties: {
        id: { type: "integer" },
        name: { type: "string", minLength: 1 },
        email: { type: "string" },
        active: { type: "boolean" },
    },
    required: ["id", "name"],
};

const validData = {
    id: 1,
    name: "John Doe",
    email: "john@example.com",
    active: true,
};

const invalidData = {
    id: "not-a-number",
    name: "",
    email: "invalid",
};

const nestedSchema = {
    type: "object",
    properties: {
        user: {
            type: "object",
            properties: {
                profile: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        age: { type: "integer", minimum: 0 },
                    },
                    required: ["name"],
                },
            },
        },
    },
};

const nestedData = {
    user: {
        profile: {
            name: "Jane",
            age: 30,
        },
    },
};

async function main() {
    const compiled = compile(simpleSchema);

    const bench = new Bench({ time: 200 });

    bench
        .add("validate (simple, valid)", () => {
            validate(validData, simpleSchema);
        })
        .add("validate (simple, invalid)", () => {
            validate(invalidData, simpleSchema);
        })
        .add("compile + validate (simple, valid)", () => {
            compiled(validData);
        })
        .add("validate (nested, valid)", () => {
            validate(nestedData, nestedSchema);
        });

    console.log("\nJaySON Validation Benchmarks\n");
    await bench.run();
    console.table(bench.table());
}

main().catch(console.error);
