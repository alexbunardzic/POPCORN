import { z } from 'zod';
import bcrypt from 'bcrypt';
import { pool } from '../db.js';

const SALT_ROUNDS = 10;

const CreateSchema = z.object({
  orgId: z.number().int().positive(),
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(['admin', 'member']),
});

export async function create(input) {
  const data = CreateSchema.parse(input);
  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  const { rows } = await pool.query(
    'INSERT INTO users (org_id, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *',
    [data.orgId, data.email, passwordHash, data.role],
  );
  return rows[0];
}

export async function findByEmail(orgId, email) {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE org_id = $1 AND email = $2',
    [orgId, email],
  );
  return rows[0] ?? null;
}

export async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function findByOrg(orgId) {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE org_id = $1 ORDER BY email',
    [orgId],
  );
  return rows;
}

export async function verifyPassword(hash, plain) {
  return bcrypt.compare(plain, hash);
}
