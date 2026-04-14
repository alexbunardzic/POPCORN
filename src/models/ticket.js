import { z } from 'zod';
import { db } from '../db.js';
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

export function create(input) {
  const data = CreateSchema.parse(input);
  const position = db.prepare(
    'SELECT COALESCE(MAX(position) + 1, 0) AS next FROM tickets WHERE org_id = ? AND column = ?'
  ).get(data.orgId, data.column).next;

  const stmt = db.prepare(`
    INSERT INTO tickets
      (org_id, created_by, parent_id, title, owner, status, description, column, position,
       action, duration, expected_outcome, hypothesis, actual_results, learning)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `);
  return stmt.get(
    data.orgId, data.createdBy, data.parentId ?? null,
    data.title, data.owner ?? null, data.status,
    data.description ?? null,
    data.column, position,
    data.action ?? null, data.duration ?? null, data.expected_outcome ?? null,
    data.hypothesis ?? null, data.actual_results ?? null, data.learning ?? null,
  );
}

export function findChildren(orgId, parentId) {
  return db.prepare(
    'SELECT * FROM tickets WHERE org_id = ? AND parent_id = ? ORDER BY column, position'
  ).all(orgId, parentId);
}

export function findByOrg(orgId) {
  return db.prepare(
    'SELECT * FROM tickets WHERE org_id = ? ORDER BY column, position'
  ).all(orgId);
}

export function findByColumn(orgId, column) {
  return db.prepare(
    'SELECT * FROM tickets WHERE org_id = ? AND column = ? ORDER BY position'
  ).all(orgId, column);
}

export function findById(id) {
  return db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);
}

export function update(id, orgId, fields) {
  const ticket = findById(id);
  if (!ticket || ticket.org_id !== orgId) throw new NotFoundError(`Ticket ${id} not found`);

  const safe = Object.fromEntries(
    Object.entries(fields).filter(([k]) => ALLOWED_UPDATE_FIELDS.includes(k))
  );

  if (Object.keys(safe).length === 0) return ticket;

  const sets = Object.keys(safe).map(k => `${k} = ?`).join(', ');
  const values = Object.values(safe);
  db.prepare(
    `UPDATE tickets SET ${sets}, updated_at = datetime('now') WHERE id = ? RETURNING *`
  ).get(...values, id);

  return findById(id);
}

export function move(id, orgId, direction) {
  const ticket = findById(id);
  if (!ticket || ticket.org_id !== orgId) throw new NotFoundError(`Ticket ${id} not found`);

  const currentIndex = COLUMNS.indexOf(ticket.column);
  const targetIndex = direction === 'right' ? currentIndex + 1 : currentIndex - 1;

  if (targetIndex < 0 || targetIndex >= COLUMNS.length) {
    throw new InvalidMoveError(
      `Cannot move ${direction} from '${ticket.column}'`
    );
  }

  const targetColumn = COLUMNS[targetIndex];

  if (targetColumn === 'ongoing') {
    const org = findOrg(orgId);
    const wipLimit = org?.wip_limit ?? 3;
    const count = db.prepare(
      'SELECT COUNT(*) AS n FROM tickets WHERE org_id = ? AND column = ?'
    ).get(orgId, 'ongoing').n;
    if (count >= wipLimit) {
      throw new WipLimitError(
        `WiP limit of ${wipLimit} reached for 'ongoing' column`
      );
    }
  }

  const position = db.prepare(
    'SELECT COALESCE(MAX(position) + 1, 0) AS next FROM tickets WHERE org_id = ? AND column = ?'
  ).get(orgId, targetColumn).next;

  db.prepare(
    `UPDATE tickets SET column = ?, position = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(targetColumn, position, id);

  return findById(id);
}

export function remove(id, orgId) {
  const ticket = findById(id);
  if (!ticket || ticket.org_id !== orgId) throw new NotFoundError(`Ticket ${id} not found`);
  db.prepare('DELETE FROM tickets WHERE id = ?').run(id);
}
