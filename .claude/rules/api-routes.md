---
path: src/routes/**
---

# API Routes Rules

- One file per resource (e.g. `users.js`, `posts.js`)
- Export a single Express `Router` instance using a named export
- Check `req.headers['hx-request']` to decide between partial and full-page response
- Full-page responses render from `/src/views/`; partial responses render from `/src/partials/`
- Never query the database directly — delegate all data access to `/src/models/`
- Never return JSON; always render an EJS template
- Error shape: `res.status(4xx).render('partials/error', { message })`
- Validate request bodies before any model call; use zod or joi schemas defined alongside the route file
- Route files must import only from `../models/`, `../middleware/`, and npm packages
