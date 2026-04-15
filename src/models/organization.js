import { z } from 'zod';
import { pool } from '../db.js';

const CreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  wip_limit: z.number().int().positive().default(3),
});

export async function create(input) {
  const data = CreateSchema.parse(input);
  const { rows } = await pool.query(
    'INSERT INTO organizations (name, slug, wip_limit) VALUES ($1, $2, $3) RETURNING *',
    [data.name, data.slug, data.wip_limit],
  );
  return rows[0];
}

export async function findAll() {
  const { rows } = await pool.query('SELECT * FROM organizations ORDER BY name');
  return rows;
}

export async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM organizations WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function findBySlug(slug) {
  const { rows } = await pool.query('SELECT * FROM organizations WHERE slug = $1', [slug]);
  return rows[0] ?? null;
}
