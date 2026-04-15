import { app } from './app.js';
import { pool } from './db.js';
import { runMigrations } from './db/migrate.js';

const PORT = process.env.PORT ?? 3000;

await runMigrations(pool);
app.listen(PORT, () => {
  console.log(`POPCORN running on http://localhost:${PORT}`);
});
