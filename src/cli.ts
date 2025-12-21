#!/usr/bin/env node
/**
 * JaySON CLI - Command Line Interface for JSON Schema operations
 */

import * as fs from "fs";
import * as path from "path";
import { JsonMaker } from "./index.js";
import {
    standardsUpdater,
    checkInternetAccess,
    checkForUpdates,
    detectStandard,
} from "./update-standards.js";

const VERSION = "1.0.0";
const PROGRAM_NAME = "jayson";

// ANSI color codes
const colors = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m",
};

function color(text: string, code: string): string {
    return `${code}${text}${colors.reset}`;
}

/**
 * Print the main help message
 */
function printHelp(): void {
    console.log(`
${color("JaySON", colors.bold + colors.cyan)} - JSON Schema Utility Tool v${VERSION}

${color("USAGE:", colors.bold)}
    ${PROGRAM_NAME} <command> [options]

${color("COMMANDS:", colors.bold)}
    ${color("init", colors.green)}        Initialize JaySON in the current directory
    ${color("validate", colors.green)}    Validate JSON files against a schema
    ${color("report", colors.green)}      Generate validation reports in multiple formats
    ${color("generate", colors.green)}    Generate TypeScript/JavaScript types from schema
    ${color("update", colors.green)}      Download or update JSON Schema standards
    ${color("detect", colors.green)}      Detect the JSON Schema standard used in a file

${color("OPTIONS:", colors.bold)}
    -h, --help      Show help for a command
    -v, --version   Show version number

${color("EXAMPLES:", colors.bold)}
    ${color("$", colors.dim)} ${PROGRAM_NAME} init
    ${color("$", colors.dim)} ${PROGRAM_NAME} validate data.json --schema schema.json
    ${color("$", colors.dim)} ${PROGRAM_NAME} report data.json --schema schema.json --format html
    ${color("$", colors.dim)} ${PROGRAM_NAME} generate schema.json --output ./types

${color("DOCUMENTATION:", colors.bold)}
    Run '${PROGRAM_NAME} <command> --help' for more information on a command.
`);
}

/**
 * Print help for init command
 */
function printInitHelp(): void {
    console.log(`
${color("jayson init", colors.bold + colors.cyan)} - Initialize JaySON configuration

${color("USAGE:", colors.bold)}
    ${PROGRAM_NAME} init [options]

${color("DESCRIPTION:", colors.bold)}
    Creates a jayson.json configuration file in the current directory
    and sets up the recommended folder structure for schemas.

${color("OPTIONS:", colors.bold)}
    -d, --dir <path>    Directory to initialize (default: current directory)
    -f, --force         Overwrite existing configuration
    -h, --help          Show this help message

${color("EXAMPLES:", colors.bold)}
    ${color("$", colors.dim)} ${PROGRAM_NAME} init
    ${color("$", colors.dim)} ${PROGRAM_NAME} init --dir ./my-project
    ${color("$", colors.dim)} ${PROGRAM_NAME} init --force
`);
}

/**
 * Print help for validate command
 */
function printValidateHelp(): void {
    console.log(`
${color("jayson validate", colors.bold + colors.cyan)} - Validate JSON files against a schema

${color("USAGE:", colors.bold)}
    ${PROGRAM_NAME} validate <file> [options]
    ${PROGRAM_NAME} validate <file1> <file2> ... --schema <schema>

${color("DESCRIPTION:", colors.bold)}
    Validates one or more JSON files against a JSON Schema.
    Checks for updates if internet is available.

${color("ARGUMENTS:", colors.bold)}
    <file>              JSON file(s) to validate

${color("OPTIONS:", colors.bold)}
    -s, --schema <path>     Path to the JSON Schema file (required)
    -q, --quiet             Only output errors, no success messages
    --no-update-check       Skip checking for schema updates
    -h, --help              Show this help message

${color("EXAMPLES:", colors.bold)}
    ${color("$", colors.dim)} ${PROGRAM_NAME} validate data.json --schema schema.json
    ${color("$", colors.dim)} ${PROGRAM_NAME} validate *.json --schema schema.json
    ${color("$", colors.dim)} ${PROGRAM_NAME} validate data.json -s schema.json --quiet
`);
}

/**
 * Print help for report command
 */
function printReportHelp(): void {
    console.log(`
${color("jayson report", colors.bold + colors.cyan)} - Generate validation reports

${color("USAGE:", colors.bold)}
    ${PROGRAM_NAME} report <file> [options]

${color("DESCRIPTION:", colors.bold)}
    Validates a JSON file and generates a formatted report.
    Supports terminal, markdown, and HTML output formats.

${color("ARGUMENTS:", colors.bold)}
    <file>              JSON file to validate and report on

${color("OPTIONS:", colors.bold)}
    -s, --schema <path>     Path to the JSON Schema file (required)
    -o, --output <path>     Output file path (default: stdout for terminal)
    -f, --format <fmt>      Output format: terminal, markdown, html, all
                            (default: terminal)
    -a, --all               Generate reports in all formats
    -h, --help              Show this help message

${color("EXAMPLES:", colors.bold)}
    ${color("$", colors.dim)} ${PROGRAM_NAME} report data.json --schema schema.json
    ${color("$", colors.dim)} ${PROGRAM_NAME} report data.json -s schema.json -f markdown -o report.md
    ${color("$", colors.dim)} ${PROGRAM_NAME} report data.json -s schema.json --all -o ./reports/
`);
}

/**
 * Print help for generate command
 */
function printGenerateHelp(): void {
    console.log(`
${color("jayson generate", colors.bold + colors.cyan)} - Generate TypeScript/JavaScript from schema

${color("USAGE:", colors.bold)}
    ${PROGRAM_NAME} generate <schema> [options]

${color("DESCRIPTION:", colors.bold)}
    Generates TypeScript interfaces and/or JavaScript ES5 classes
    from a JSON Schema file. Output is ES5 module ready for import.

${color("ARGUMENTS:", colors.bold)}
    <schema>            Path to the JSON Schema file

${color("OPTIONS:", colors.bold)}
    -o, --output <path>     Output directory (default: current directory)
    -n, --name <name>       Base name for output files (default: from schema title)
    -t, --typescript        Generate TypeScript only
    -j, --javascript        Generate JavaScript only
    --no-comments           Exclude JSDoc comments
    -h, --help              Show this help message

${color("EXAMPLES:", colors.bold)}
    ${color("$", colors.dim)} ${PROGRAM_NAME} generate schema.json
    ${color("$", colors.dim)} ${PROGRAM_NAME} generate schema.json --output ./types
    ${color("$", colors.dim)} ${PROGRAM_NAME} generate schema.json -t -o ./src/types
    ${color("$", colors.dim)} ${PROGRAM_NAME} generate schema.json -n User --output ./models
`);
}

/**
 * Print help for update command
 */
function printUpdateHelp(): void {
    console.log(`
${color("jayson update", colors.bold + colors.cyan)} - Download or update JSON Schema standards

${color("USAGE:", colors.bold)}
    ${PROGRAM_NAME} update [options]

${color("DESCRIPTION:", colors.bold)}
    Downloads JSON Schema meta-schemas and checks for updates
    to previously downloaded schemas.

${color("OPTIONS:", colors.bold)}
    --check             Check for updates without downloading
    --all               Download all JSON Schema versions
    --version <ver>     Download specific version (draft-04, draft-07, 2019-09, 2020-12)
    --list              List downloaded schemas
    -h, --help          Show this help message

${color("EXAMPLES:", colors.bold)}
    ${color("$", colors.dim)} ${PROGRAM_NAME} update --check
    ${color("$", colors.dim)} ${PROGRAM_NAME} update --all
    ${color("$", colors.dim)} ${PROGRAM_NAME} update --version draft-07
    ${color("$", colors.dim)} ${PROGRAM_NAME} update --list
`);
}

/**
 * Print help for detect command
 */
function printDetectHelp(): void {
    console.log(`
${color("jayson detect", colors.bold + colors.cyan)} - Detect JSON Schema standard

${color("USAGE:", colors.bold)}
    ${PROGRAM_NAME} detect <file>

${color("DESCRIPTION:", colors.bold)}
    Analyzes a JSON Schema file and detects which JSON Schema
    standard version it uses.

${color("ARGUMENTS:", colors.bold)}
    <file>              JSON Schema file to analyze

${color("OPTIONS:", colors.bold)}
    -h, --help          Show this help message

${color("EXAMPLES:", colors.bold)}
    ${color("$", colors.dim)} ${PROGRAM_NAME} detect schema.json
`);
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): { command: string; positional: string[]; options: Record<string, string | boolean> } {
    const result = {
        command: "",
        positional: [] as string[],
        options: {} as Record<string, string | boolean>,
    };

    let i = 0;

    // First arg is the command
    if (args.length > 0 && !args[0].startsWith("-")) {
        result.command = args[0];
        i = 1;
    }

    while (i < args.length) {
        const arg = args[i];

        if (arg.startsWith("--")) {
            const key = arg.slice(2);
            if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
                result.options[key] = args[i + 1];
                i += 2;
            } else {
                result.options[key] = true;
                i++;
            }
        } else if (arg.startsWith("-")) {
            const key = arg.slice(1);
            if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
                result.options[key] = args[i + 1];
                i += 2;
            } else {
                result.options[key] = true;
                i++;
            }
        } else {
            result.positional.push(arg);
            i++;
        }
    }

    return result;
}

/**
 * Init command implementation
 */
function cmdInit(positional: string[], options: Record<string, string | boolean>): void {
    if (options.help || options.h) {
        printInitHelp();
        return;
    }

    const targetDir = (options.dir as string) || (options.d as string) || process.cwd();
    const force = options.force || options.f;

    const configPath = path.join(targetDir, "jayson.json");
    const schemaDir = path.join(targetDir, "json-schema");

    // Check if already initialized
    if (fs.existsSync(configPath) && !force) {
        console.log(color("Error:", colors.red) + " JaySON is already initialized in this directory.");
        console.log("Use --force to overwrite existing configuration.");
        process.exit(1);
    }

    // Create schema directory
    if (!fs.existsSync(schemaDir)) {
        fs.mkdirSync(schemaDir, { recursive: true });
        console.log(color("Created:", colors.green) + ` ${schemaDir}`);
    }

    // Create config file
    const config = {
        $schema: "https://json-schema.org/draft-07/schema",
        schemaDir: "./json-schema",
        outputDir: "./dist",
        defaultFormat: "terminal",
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 4), "utf-8");
    console.log(color("Created:", colors.green) + ` ${configPath}`);

    console.log(`
${color("JaySON initialized successfully!", colors.green + colors.bold)}

Next steps:
  1. Add your JSON schemas to ${color("./json-schema/", colors.cyan)}
  2. Validate files: ${color(`${PROGRAM_NAME} validate data.json -s schema.json`, colors.dim)}
  3. Generate types: ${color(`${PROGRAM_NAME} generate schema.json`, colors.dim)}
`);
}

/**
 * Validate command implementation
 */
function cmdValidate(positional: string[], options: Record<string, string | boolean>): void {
    if (options.help || options.h) {
        printValidateHelp();
        return;
    }

    const schemaPath = (options.schema as string) || (options.s as string);
    const quiet = options.quiet || options.q;
    const noUpdateCheck = options["no-update-check"];

    if (!schemaPath) {
        console.log(color("Error:", colors.red) + " --schema is required");
        console.log(`Run '${PROGRAM_NAME} validate --help' for usage.`);
        process.exit(1);
    }

    if (positional.length === 0) {
        console.log(color("Error:", colors.red) + " No files specified");
        console.log(`Run '${PROGRAM_NAME} validate --help' for usage.`);
        process.exit(1);
    }

    const maker = new JsonMaker(path.dirname(schemaPath));

    // Check for updates if enabled
    if (!noUpdateCheck) {
        checkInternetAccess().then(async (hasInternet) => {
            if (hasInternet) {
                const updates = await checkForUpdates();
                const available = updates.filter((u) => u.hasUpdate);
                if (available.length > 0) {
                    console.log(color("Updates available:", colors.yellow) + ` ${available.map((u) => u.name).join(", ")}`);
                    console.log(`Run '${PROGRAM_NAME} update' to download updates.\n`);
                }
            }
        }).catch(() => {
            // Ignore errors
        });
    }

    let hasErrors = false;

    for (const file of positional) {
        if (!fs.existsSync(file)) {
            console.log(color("Error:", colors.red) + ` File not found: ${file}`);
            hasErrors = true;
            continue;
        }

        const result = maker.validateFile(file, schemaPath);

        if (result.valid) {
            if (!quiet) {
                console.log(color("PASS", colors.green) + ` ${file}`);
            }
        } else {
            hasErrors = true;
            console.log(color("FAIL", colors.red) + ` ${file}`);
            for (const error of result.errors) {
                console.log(`  ${color(error.path || "(root)", colors.yellow)}: ${error.message}`);
            }
        }
    }

    process.exit(hasErrors ? 1 : 0);
}

/**
 * Report command implementation
 */
function cmdReport(positional: string[], options: Record<string, string | boolean>): void {
    if (options.help || options.h) {
        printReportHelp();
        return;
    }

    const schemaPath = (options.schema as string) || (options.s as string);
    const outputPath = (options.output as string) || (options.o as string);
    const format = ((options.format as string) || (options.f as string) || "terminal") as "terminal" | "markdown" | "html";
    const allFormats = options.all || options.a;

    if (!schemaPath) {
        console.log(color("Error:", colors.red) + " --schema is required");
        console.log(`Run '${PROGRAM_NAME} report --help' for usage.`);
        process.exit(1);
    }

    if (positional.length === 0) {
        console.log(color("Error:", colors.red) + " No file specified");
        console.log(`Run '${PROGRAM_NAME} report --help' for usage.`);
        process.exit(1);
    }

    const file = positional[0];

    if (!fs.existsSync(file)) {
        console.log(color("Error:", colors.red) + ` File not found: ${file}`);
        process.exit(1);
    }

    const maker = new JsonMaker(path.dirname(schemaPath));
    const result = maker.validateFile(file, schemaPath);

    const reportOptions = {
        title: `Validation Report: ${path.basename(file)}`,
        filePath: file,
        schemaPath: schemaPath,
        timestamp: true,
    };

    if (allFormats) {
        if (!outputPath) {
            console.log(color("Error:", colors.red) + " --output directory is required when using --all");
            process.exit(1);
        }

        const baseName = path.basename(file, path.extname(file)) + "-report";
        const files = maker.generateAllFormats(result, outputPath, baseName, reportOptions);

        console.log(color("Generated reports:", colors.green));
        for (const f of files) {
            console.log(`  ${f}`);
        }
    } else if (outputPath) {
        maker.generateReport(result, outputPath, { ...reportOptions, format });
        console.log(color("Generated:", colors.green) + ` ${outputPath}`);
    } else {
        // Print to stdout
        maker.printReport(result, reportOptions);
    }
}

/**
 * Generate command implementation
 */
function cmdGenerate(positional: string[], options: Record<string, string | boolean>): void {
    if (options.help || options.h) {
        printGenerateHelp();
        return;
    }

    if (positional.length === 0) {
        console.log(color("Error:", colors.red) + " No schema file specified");
        console.log(`Run '${PROGRAM_NAME} generate --help' for usage.`);
        process.exit(1);
    }

    const schemaPath = positional[0];
    const outputDir = (options.output as string) || (options.o as string) || process.cwd();
    const baseName = (options.name as string) || (options.n as string);
    const tsOnly = options.typescript || options.t;
    const jsOnly = options.javascript || options.j;
    const noComments = options["no-comments"];

    if (!fs.existsSync(schemaPath)) {
        console.log(color("Error:", colors.red) + ` Schema file not found: ${schemaPath}`);
        process.exit(1);
    }

    const maker = new JsonMaker(path.dirname(schemaPath));
    const generateOptions = {
        exportName: baseName,
        includeDescriptions: !noComments,
    };

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Determine base name from schema if not provided
    let finalBaseName = baseName;
    if (!finalBaseName) {
        const schema = maker.loadSchema(schemaPath);
        finalBaseName = schema.title || path.basename(schemaPath, path.extname(schemaPath));
        finalBaseName = finalBaseName.replace(/[^a-zA-Z0-9]/g, "");
    }

    if (tsOnly) {
        const outputPath = path.join(outputDir, `${finalBaseName}.ts`);
        maker.generateTypeScriptFile(schemaPath, outputPath, generateOptions);
        console.log(color("Generated:", colors.green) + ` ${outputPath}`);
    } else if (jsOnly) {
        const outputPath = path.join(outputDir, `${finalBaseName}.js`);
        maker.generateJavaScriptFile(schemaPath, outputPath, generateOptions);
        console.log(color("Generated:", colors.green) + ` ${outputPath}`);
    } else {
        const result = maker.generateTypes(schemaPath, outputDir, finalBaseName, generateOptions);
        console.log(color("Generated:", colors.green));
        console.log(`  ${result.tsPath}`);
        console.log(`  ${result.jsPath}`);
    }
}

/**
 * Update command implementation
 */
async function cmdUpdate(positional: string[], options: Record<string, string | boolean>): Promise<void> {
    if (options.help || options.h) {
        printUpdateHelp();
        return;
    }

    const checkOnly = options.check;
    const downloadAll = options.all;
    const version = options.version as string;
    const list = options.list;

    // Check internet access
    const hasInternet = await checkInternetAccess();
    if (!hasInternet && !list) {
        console.log(color("Error:", colors.red) + " No internet connection available");
        process.exit(1);
    }

    if (list) {
        const schemas = standardsUpdater.listDownloadedSchemas();
        if (schemas.length === 0) {
            console.log("No schemas downloaded yet.");
            console.log(`Run '${PROGRAM_NAME} update --all' to download JSON Schema standards.`);
        } else {
            console.log(color("Downloaded schemas:", colors.bold));
            for (const schema of schemas) {
                console.log(`  ${color(schema.name, colors.cyan)} (${schema.version}) - ${schema.localPath}`);
            }
        }
        return;
    }

    if (checkOnly) {
        console.log("Checking for updates...\n");
        const updates = await checkForUpdates();

        let hasUpdates = false;
        for (const update of updates) {
            if (update.hasUpdate) {
                hasUpdates = true;
                console.log(color("Update available:", colors.yellow) + ` ${update.name} (current: ${update.currentVersion})`);
            }
        }

        if (!hasUpdates) {
            console.log(color("All schemas are up to date.", colors.green));
        }
        return;
    }

    if (downloadAll) {
        console.log("Downloading all JSON Schema meta-schemas...\n");
        standardsUpdater.init();
        const result = await standardsUpdater.downloadAllMetaSchemas();

        console.log(color("\nDownload complete:", colors.green));
        console.log(`  Updated: ${result.updated.length}`);
        console.log(`  Skipped: ${result.skipped.length}`);
        if (result.failed.length > 0) {
            console.log(`  Failed: ${result.failed.length}`);
            for (const fail of result.failed) {
                console.log(`    ${color(fail.name, colors.red)}: ${fail.error}`);
            }
        }
        return;
    }

    if (version) {
        const validVersions = ["draft-04", "draft-06", "draft-07", "2019-09", "2020-12"];
        if (!validVersions.includes(version)) {
            console.log(color("Error:", colors.red) + ` Invalid version: ${version}`);
            console.log(`Valid versions: ${validVersions.join(", ")}`);
            process.exit(1);
        }

        console.log(`Downloading JSON Schema ${version}...`);
        standardsUpdater.init();
        const result = await standardsUpdater.downloadMetaSchema(version as "draft-04" | "draft-06" | "draft-07" | "2019-09" | "2020-12");

        if (result.success) {
            console.log(color("Downloaded:", colors.green) + ` ${result.path}`);
        } else {
            console.log(color("Error:", colors.red) + ` ${result.error}`);
            process.exit(1);
        }
        return;
    }

    // Default: update all previously downloaded schemas
    console.log("Updating all downloaded schemas...\n");
    const result = await standardsUpdater.updateAllSchemas();

    console.log(color("\nUpdate complete:", colors.green));
    console.log(`  Updated: ${result.updated.length}`);
    if (result.failed.length > 0) {
        console.log(`  Failed: ${result.failed.length}`);
        for (const fail of result.failed) {
            console.log(`    ${color(fail.name, colors.red)}: ${fail.error}`);
        }
    }
}

/**
 * Detect command implementation
 */
function cmdDetect(positional: string[], options: Record<string, string | boolean>): void {
    if (options.help || options.h) {
        printDetectHelp();
        return;
    }

    if (positional.length === 0) {
        console.log(color("Error:", colors.red) + " No file specified");
        console.log(`Run '${PROGRAM_NAME} detect --help' for usage.`);
        process.exit(1);
    }

    const file = positional[0];

    if (!fs.existsSync(file)) {
        console.log(color("Error:", colors.red) + ` File not found: ${file}`);
        process.exit(1);
    }

    const result = detectStandard(file);

    if (result.version) {
        console.log(color("Detected:", colors.green) + ` JSON Schema ${color(result.version, colors.cyan)}`);
        if (result.schemaUrl) {
            console.log(`  $schema: ${result.schemaUrl}`);
        }
        console.log(`  ${result.description}`);
    } else {
        console.log(color("Unknown:", colors.yellow) + " Could not detect JSON Schema version");
        if (result.schemaUrl) {
            console.log(`  $schema: ${result.schemaUrl}`);
        } else {
            console.log("  No $schema property found");
        }
    }
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const { command, positional, options } = parseArgs(args);

    // Handle global flags
    if (options.version || options.v) {
        console.log(`jayson version ${VERSION}`);
        return;
    }

    // Show main help only when no command or explicit help for root
    if (!command) {
        printHelp();
        return;
    }

    // Route to command handlers
    switch (command) {
        case "init":
            cmdInit(positional, options);
            break;
        case "validate":
            cmdValidate(positional, options);
            break;
        case "report":
            cmdReport(positional, options);
            break;
        case "generate":
        case "gen":
            cmdGenerate(positional, options);
            break;
        case "update":
            await cmdUpdate(positional, options);
            break;
        case "detect":
            cmdDetect(positional, options);
            break;
        case "help":
            if (positional[0]) {
                switch (positional[0]) {
                    case "init":
                        printInitHelp();
                        break;
                    case "validate":
                        printValidateHelp();
                        break;
                    case "report":
                        printReportHelp();
                        break;
                    case "generate":
                        printGenerateHelp();
                        break;
                    case "update":
                        printUpdateHelp();
                        break;
                    case "detect":
                        printDetectHelp();
                        break;
                    default:
                        console.log(color("Error:", colors.red) + ` Unknown command: ${positional[0]}`);
                        printHelp();
                }
            } else {
                printHelp();
            }
            break;
        default:
            console.log(color("Error:", colors.red) + ` Unknown command: ${command}`);
            console.log(`Run '${PROGRAM_NAME} --help' for available commands.`);
            process.exit(1);
    }
}

main().catch((error) => {
    console.error(color("Error:", colors.red), error.message);
    process.exit(1);
});
