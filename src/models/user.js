import { z } from 'zod';
import bcrypt from 'bcrypt';
import { db } from '../db.js';

const SALT_ROUNDS = 10;

const CreateSchema = z.object({
  orgId: z.number().int().positive(),
  email: z.string().email(),
  password: z.string().min(1),
  role: z.enum(['admin', 'member']),
});

export function create(input) {
  const data = CreateSchema.parse(input);
  const passwordHash = bcrypt.hashSync(data.password, SALT_ROUNDS);
  const stmt = db.prepare(
    'INSERT INTO users (org_id, email, password_hash, role) VALUES (?, ?, ?, ?) RETURNING *'
  );
  return stmt.get(data.orgId, data.email, passwordHash, data.role);
}

export function findByEmail(orgId, email) {
  return db.prepare(
    'SELECT * FROM users WHERE org_id = ? AND email = ?'
  ).get(orgId, email);
}

export function findById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function findByOrg(orgId) {
  return db.prepare('SELECT * FROM users WHERE org_id = ? ORDER BY email').all(orgId);
}

export async function verifyPassword(hash, plain) {
  return bcrypt.compare(plain, hash);
}
