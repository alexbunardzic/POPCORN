# Skill: new-partial

Creates a new HTMX partial and wires it to its triggering route.

## Steps

1. **Identify the partial** — confirm the partial name, the route that returns it, and the HTMX swap target (e.g. `#results`, `#modal`).

2. **Create the partial file** — add `src/partials/<resource>/<name>.ejs`:
   - HTML fragment only — no `<html>`, `<head>`, or `<body>`
   - No inline `<script>` tags
   - Use EJS includes for any shared sub-components

3. **Update the route handler** — in `src/routes/<resource>.js`, add a branch for `HX-Request`:
   ```js
   if (req.headers['hx-request']) {
     return res.render('partials/<resource>/<name>', { ...data });
   }
   res.render('<resource>/index', { ...data });
   ```

4. **Wire the trigger in the view** — add the HTMX attributes to the relevant element in the parent view or partial:
   ```html
   hx-get="/route" hx-target="#target" hx-swap="innerHTML"
   ```

5. **Add `HX-Trigger` header if needed** — for events that other parts of the page should react to, set the header in the route handler instead of emitting JS.

6. **Test the partial** — add a Supertest case that sends `HX-Request: true` and asserts the response is an HTML fragment (no `<html>` tag, correct content).
