import { z } from 'zod';
import { pool } from '../db.js';
import { findById as findOrg } from './organization.js';

export const COLUMNS = [
  'problems', 'options', 'possible', 'committed', 'ongoing', 'review', 'next',
];

const ColumnEnum = z.enum(COLUMNS);

const CreateSchema = z.object({
  orgId: z.number().int().positive(),
  createdBy: z.number().int().positive(),
  parentId: z.number().int().positive().optional(),
  title: z.string().min(1),
  owner: z.string().optional(),
  column: ColumnEnum,
  status: z.enum(['open', 'blocked', 'done']).default('open'),
  description: z.string().optional(),
  action: z.string().optional(),
  duration: z.string().optional(),
  expected_outcome: z.string().optional(),
  hypothesis: z.string().optional(),
  actual_results: z.string().optional(),
  learning: z.string().optional(),
});

const ALLOWED_UPDATE_FIELDS = [
  'title', 'owner', 'status', 'description', 'action', 'duration',
  'expected_outcome', 'hypothesis', 'actual_results', 'learning',
];

export class InvalidMoveError extends Error {
  constructor(msg) { super(msg); this.name = 'InvalidMoveError'; }
}

export class WipLimitError extends Error {
  constructor(msg) { super(msg); this.name = 'WipLimitError'; }
}

export class NotFoundError extends Error {
  constructor(msg) { super(msg); this.name = 'NotFoundError'; }
}

export async function create(input) {
  const data = CreateSchema.parse(input);
  const { rows: posRows } = await pool.query(
    'SELECT COALESCE(MAX(position) + 1, 0) AS next FROM tickets WHERE org_id = $1 AND "column" = $2',
    [data.orgId, data.column],
  );
  const position = posRows[0].next;

  const { rows } = await pool.query(`
    INSERT INTO tickets
      (org_id, created_by, parent_id, title, owner, status, description, "column", position,
       action, duration, expected_outcome, hypothesis, actual_results, learning)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *
  `, [
    data.orgId, data.createdBy, data.parentId ?? null,
    data.title, data.owner ?? null, data.status,
    data.description ?? null,
    data.column, position,
    data.action ?? null, data.duration ?? null, data.expected_outcome ?? null,
    data.hypothesis ?? null, data.actual_results ?? null, data.learning ?? null,
  ]);
  return rows[0];
}

export async function findChildren(orgId, parentId) {
  const { rows } = await pool.query(
    'SELECT * FROM tickets WHERE org_id = $1 AND parent_id = $2 ORDER BY "column", position',
    [orgId, parentId],
  );
  return rows;
}

export async function findByOrg(orgId) {
  const { rows } = await pool.query(
    'SELECT * FROM tickets WHERE org_id = $1 ORDER BY "column", position',
    [orgId],
  );
  return rows;
}

export async function findByColumn(orgId, column) {
  const { rows } = await pool.query(
    'SELECT * FROM tickets WHERE org_id = $1 AND "column" = $2 ORDER BY position',
    [orgId, column],
  );
  return rows;
}

export async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
  return rows[0] ?? null;
}

export async function update(id, orgId, fields) {
  const ticket = await findById(id);
  if (!ticket || ticket.org_id !== orgId) throw new NotFoundError(`Ticket ${id} not found`);

  const safe = Object.fromEntries(
    Object.entries(fields).filter(([k]) => ALLOWED_UPDATE_FIELDS.includes(k)),
  );

  if (Object.keys(safe).length === 0) return ticket;

  const keys = Object.keys(safe);
  const values = Object.values(safe);
  const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  await pool.query(
    `UPDATE tickets SET ${sets}, updated_at = NOW() WHERE id = $${keys.length + 1}`,
    [...values, id],
  );

  return findById(id);
}

export async function move(id, orgId, direction) {
  const ticket = await findById(id);
  if (!ticket || ticket.org_id !== orgId) throw new NotFoundError(`Ticket ${id} not found`);

  const currentIndex = COLUMNS.indexOf(ticket.column);
  const targetIndex = direction === 'right' ? currentIndex + 1 : currentIndex - 1;

  if (targetIndex < 0 || targetIndex >= COLUMNS.length) {
    throw new InvalidMoveError(`Cannot move ${direction} from '${ticket.column}'`);
  }

  const targetColumn = COLUMNS[targetIndex];

  if (targetColumn === 'ongoing') {
    const org = await findOrg(orgId);
    const wipLimit = org?.wip_limit ?? 3;
    const { rows } = await pool.query(
      'SELECT COUNT(*) AS n FROM tickets WHERE org_id = $1 AND "column" = $2',
      [orgId, 'ongoing'],
    );
    if (Number(rows[0].n) >= wipLimit) {
      throw new WipLimitError(`WiP limit of ${wipLimit} reached for 'ongoing' column`);
    }
  }

  const { rows: posRows } = await pool.query(
    'SELECT COALESCE(MAX(position) + 1, 0) AS next FROM tickets WHERE org_id = $1 AND "column" = $2',
    [orgId, targetColumn],
  );
  const position = posRows[0].next;

  await pool.query(
    'UPDATE tickets SET "column" = $1, position = $2, updated_at = NOW() WHERE id = $3',
    [targetColumn, position, id],
  );

  return findById(id);
}

export async function remove(id, orgId) {
  const ticket = await findById(id);
  if (!ticket || ticket.org_id !== orgId) throw new NotFoundError(`Ticket ${id} not found`);
  await pool.query('DELETE FROM tickets WHERE id = $1', [id]);
}
