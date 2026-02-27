# E2E & Integration Testing

End-to-end and integration tests for JaySON. Requires the project to be built before running (`npm run build` or `npm run test:all`).

## Structure

- **`e2e-helpers.ts`** – Reusable utilities for E2E tests:
  - `runCLI(args, cwd?)` – Run the built CLI as a subprocess
  - `ensureBuilt()` – Assert dist exists; throw if not built
  - `createE2ETempDir(name)` / `cleanupE2ETempDir(name)` – Isolated temp dirs
  - `assertFileExists`, `assertFileContains`, `assertFileDoesNotExist`
  - `writeJsonFile`, `readJsonFile`, `copyFixture`

- **`e2e.test.ts`** – Black-box CLI workflow tests:
  - init → validate → report
  - validate → generate types
  - init → generate → validate
  - Report formats (terminal, markdown, html)
  - Error handling (missing schema, missing file, init without --force)

- **`integration.test.ts`** – API + CLI together:
  - API validation matches CLI validation
  - JsonMaker + CLI workflow (create validated file, CLI validates it)
  - API vs CLI type generation
  - `validateJson` vs `validateJsonFile` consistency
  - Report generation API vs CLI

## Running

```bash
npm run build          # Required first
npm run test:e2e       # E2E and integration only
npm run test:all        # Build + all tests (unit, integration, CLI, E2E)
```

## Design

- **E2E**: Runs the built CLI via `execSync`; no direct imports of src.
- **Integration**: Uses both API (`JsonMaker`, `validateJson`, etc.) and CLI; verifies consistency.
- **Isolation**: Each test uses `createE2ETempDir` for a clean workspace.
- **Fixtures**: Uses `testing-suite/fixtures/schemas` and `testing-suite/fixtures/data`.
