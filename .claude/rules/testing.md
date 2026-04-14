---
path: tests/**
---

# Testing Rules

- NEVER modify tests written by humans
- Mirror `/src` structure: `tests/routes/`, `tests/models/`, etc.
- Unit tests (Jest): test models and middleware in isolation using an in-memory SQLite database
- Integration tests (Supertest): mount the Express app and assert on HTTP status codes and HTML response bodies
- E2E tests (Playwright): live in `tests/e2e/` and run against the dev server on port 3000
- Assert on rendered HTML content, not JSON — responses are always HTML
- Use `expect(res.headers['content-type']).toMatch(/html/)` to confirm response type
- Each test file is responsible for its own database setup/teardown; never share state between test files
- Run a single test file: `npx jest path/to/test.js`
- Run a single test by name: `npx jest -t "test name"`

## Mutation Testing (Stryker)

- Run full mutation test suite: `npx stryker run`
- Run against a specific file: `npx stryker run --mutate src/models/post.js`
- Results are written to `reports/mutation/` — open `index.html` for the HTML report
- Target mutation score: ≥80% (killed / total mutants)
- A surviving mutant means a test is missing or too weak — add a test that would catch the mutant, do not weaken the production code
- Stryker config lives in `stryker.config.mjs`; the `mutate` glob controls which files are mutated (typically `src/models/**` and `src/routes/**`)
- Do not mutate `src/public/` or `src/views/` — static assets and templates are excluded by convention
