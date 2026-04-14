---
path: src/partials/**
---

# HTMX Partials Rules

- Partials are HTML fragments — never full `<html>` documents
- Do not include `<html>`, `<head>`, or `<body>` tags
- Every partial must be renderable standalone (no assumptions about surrounding layout)
- Use `HX-Trigger` response headers for signalling events to the client; do not emit `<script>` tags
- Do not embed inline JavaScript in partials
- Keep partials focused on a single UI concern; split large partials into composable sub-partials
- Use EJS includes (`<%- include('...') %>`) for shared markup (e.g. form fields, error messages)
- Partial filenames should mirror the route that returns them (e.g. `/users/list` → `partials/users/list.ejs`)
- Pages must remain functional with JavaScript disabled — partials are an enhancement, not a requirement
