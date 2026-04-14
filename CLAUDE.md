# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
This project uses HTMX. Server endpoints return HTML fragments. There is no frontend JavaScript framework.

## Project Overview

POPCORN is a RESTful API backend built with Node.js/Express serving an HTMX frontend with server-rendered HTML partials. There is no build step and no SPA.

**Stack:** Node.js 22 (ES modules), Express 5, HTMX 2.x, EJS templating, SQLite, Jest + Supertest + Playwright

## Commands

```bash
npm run dev        # Start dev server with watch (port 3000)
npm test           # Run unit + integration tests
npm run test:e2e   # Playwright end-to-end tests
npm run lint       # ESLint check
npm run db:migrate # Run migrations
```

To run a single test file: `npx jest path/to/test.js`

## Architecture

- `/src/routes/` — Express route handlers, one file per resource
- `/src/views/` — EJS templates for full pages
- `/src/partials/` — HTMX partial HTML responses
- `/src/middleware/` — Express middleware
- `/src/models/` — Database models / data access (all DB queries go here, never in routes)
- `/src/public/` — Static assets (htmx.js, CSS)
- `/tests/` — Mirrors `/src` structure

## Code Conventions

- Use ES modules (`import`/`export`), never CommonJS
- Named exports, not default exports
- `async/await` over callbacks or raw promises
- Validate request bodies with zod/joi before processing
- Database queries go in `/src/models/`, never in route handlers

## HTMX Response Pattern

Route handlers must check the `HX-Request` header:
- **HTMX request** → return an HTML fragment (partial) from `/src/partials/`
- **Regular request** → return a full page from `/src/views/`

Error responses use: `res.status(4xx).render('partials/error', { message })`

Use `HX-Trigger` response headers for server-sent events — no custom JS.

Pages must work with JS disabled (progressive enhancement).

## Critical Rules

- NEVER modify tests written by humans
- NEVER return JSON from routes that serve HTMX partials
- NEVER use client-side JS frameworks alongside HTMX
- See `docs/api-design.md` for REST endpoint conventions
- See `docs/htmx-patterns.md` for HTMX response conventions
