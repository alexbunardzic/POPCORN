import { z } from 'zod';
import { db } from '../db.js';

const CreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  wip_limit: z.number().int().positive().default(3),
});

export function create(input) {
  const data = CreateSchema.parse(input);
  const stmt = db.prepare(
    'INSERT INTO organizations (name, slug, wip_limit) VALUES (?, ?, ?) RETURNING *'
  );
  return stmt.get(data.name, data.slug, data.wip_limit);
}

export function findAll() {
  return db.prepare('SELECT * FROM organizations ORDER BY name').all();
}

export function findById(id) {
  return db.prepare('SELECT * FROM organizations WHERE id = ?').get(id);
}

export function findBySlug(slug) {
  return db.prepare('SELECT * FROM organizations WHERE slug = ?').get(slug);
}
