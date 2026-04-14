import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function openDatabase() {
  if (process.env.NODE_ENV === 'test') {
    return new Database(':memory:');
  }
  const dataDir = join(__dirname, '..', 'data');
  mkdirSync(dataDir, { recursive: true });
  return new Database(join(dataDir, 'popcorn.db'));
}

const db = openDatabase();
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export { db };
