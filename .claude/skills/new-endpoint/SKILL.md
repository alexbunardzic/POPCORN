# Skill: new-endpoint

Creates a complete, working Express route for a new resource, following project conventions.

## Steps

1. **Identify the resource** — confirm the resource name (singular noun, e.g. `post`) and the HTTP methods needed (GET list, GET single, POST create, PUT update, DELETE).

2. **Create the model** — add `src/models/<resource>.js` with named exports for each database operation (`findAll`, `findById`, `create`, `update`, `remove`). Use parameterised SQLite queries.

3. **Create the route file** — add `src/routes/<resource>.js`:
   - Import the model
   - Detect HTMX requests via `req.headers['hx-request']`
   - Return full page or partial accordingly
   - Validate request bodies before calling the model
   - Error responses: `res.status(4xx).render('partials/error', { message })`

4. **Create views** — add `src/views/<resource>/index.ejs` (list) and `src/views/<resource>/show.ejs` (detail) for full-page renders.

5. **Create partials** — add `src/partials/<resource>/list.ejs` and `src/partials/<resource>/item.ejs` for HTMX swaps.

6. **Register the router** — mount in `src/app.js`: `app.use('/<resource>s', <resource>Router)`.

7. **Write tests** — add `tests/routes/<resource>.test.js` covering each endpoint with Supertest; add `tests/models/<resource>.test.js` for model logic.
