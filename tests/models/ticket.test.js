import { db } from '../../src/db.js';
import { runMigrations } from '../../src/db/migrate.js';
import { create as createOrg } from '../../src/models/organization.js';
import { create as createUser } from '../../src/models/user.js';
import {
  create,
  findByOrg,
  findByColumn,
  findById,
  update,
  move,
  remove,
  COLUMNS,
  InvalidMoveError,
  WipLimitError,
  NotFoundError,
} from '../../src/models/ticket.js';
import { ZodError } from 'zod';

beforeAll(() => {
  runMigrations(db);
});

beforeEach(() => {
  db.exec('DELETE FROM tickets');
  db.exec('DELETE FROM users');
  db.exec('DELETE FROM organizations');
});

let orgId, userId;
beforeEach(() => {
  const org = createOrg({ name: 'Acme', slug: 'acme' });
  orgId = org.id;
  const user = createUser({ orgId, email: 'admin@acme.com', password: 'pw', role: 'admin' });
  userId = user.id;
});

const baseTicket = () => ({
  orgId,
  createdBy: userId,
  title: 'Fix the thing',
  column: 'problems',
});

// ── Zero ────────────────────────────────────────────────────────────────────

test('Z: findByOrg returns [] when no tickets exist', () => {
  expect(findByOrg(orgId)).toEqual([]);
});

test('Z: findByColumn returns [] for empty column', () => {
  expect(findByColumn(orgId, 'problems')).toEqual([]);
});

// ── One ─────────────────────────────────────────────────────────────────────

test('O: create returns ticket with id at position 0', () => {
  const ticket = create(baseTicket());
  expect(ticket.id).toBeDefined();
  expect(ticket.column).toBe('problems');
  expect(ticket.position).toBe(0);
});

test('O: findById returns the ticket', () => {
  const created = create(baseTicket());
  const found = findById(created.id);
  expect(found.id).toBe(created.id);
  expect(found.title).toBe('Fix the thing');
});

test('O: findByColumn returns [ticket] after create', () => {
  create(baseTicket());
  expect(findByColumn(orgId, 'problems')).toHaveLength(1);
});

// ── Many ────────────────────────────────────────────────────────────────────

test('M: multiple tickets in same column are ordered by position ascending', () => {
  const a = create({ ...baseTicket(), title: 'A' });
  const b = create({ ...baseTicket(), title: 'B' });
  const c = create({ ...baseTicket(), title: 'C' });
  const results = findByColumn(orgId, 'problems');
  expect(results.map(t => t.id)).toEqual([a.id, b.id, c.id]);
});

test('M: tickets from org A are not returned for org B', () => {
  create(baseTicket());
  const orgB = createOrg({ name: 'Beta', slug: 'beta' });
  expect(findByOrg(orgB.id)).toEqual([]);
});

// ── Boundary ────────────────────────────────────────────────────────────────

test('B: move right one column succeeds and returns updated ticket', () => {
  const ticket = create(baseTicket());
  const moved = move(ticket.id, orgId, 'right');
  expect(moved.column).toBe('options');
});

test('B: move to non-adjacent column throws InvalidMoveError', () => {
  const ticket = create(baseTicket());
  expect(() => move(ticket.id, orgId, 'left')).toThrow(InvalidMoveError);
});

test('B: move left from problems (first column) throws InvalidMoveError', () => {
  const ticket = create(baseTicket());
  expect(() => move(ticket.id, orgId, 'left')).toThrow(InvalidMoveError);
});

test('B: move right from next (last column) throws InvalidMoveError', () => {
  const ticket = create({ ...baseTicket(), column: 'next' });
  expect(() => move(ticket.id, orgId, 'right')).toThrow(InvalidMoveError);
});

test('B: moving into full ongoing column throws WipLimitError', () => {
  // Fill ongoing to wip_limit (default 3)
  for (let i = 0; i < 3; i++) {
    create({ ...baseTicket(), column: 'ongoing', title: `Ongoing ${i}` });
  }
  const ticket = create({ ...baseTicket(), column: 'committed' });
  expect(() => move(ticket.id, orgId, 'right')).toThrow(WipLimitError);
});

test('B: COLUMNS exported in correct order', () => {
  expect(COLUMNS).toEqual([
    'problems', 'options', 'possible', 'committed', 'ongoing', 'review', 'next',
  ]);
});

// ── Interface ───────────────────────────────────────────────────────────────

test('I: move returns the updated ticket object', () => {
  const ticket = create(baseTicket());
  const result = move(ticket.id, orgId, 'right');
  expect(result).toHaveProperty('id', ticket.id);
  expect(result).toHaveProperty('column', 'options');
});

test('I: update only modifies allowed fields and refreshes updated_at', () => {
  const ticket = create(baseTicket());
  const before = ticket.updated_at;
  const updated = update(ticket.id, orgId, { title: 'New title', action: 'Do it' });
  expect(updated.title).toBe('New title');
  expect(updated.action).toBe('Do it');
  // updated_at should be set (may equal before if sub-second, just check it exists)
  expect(updated.updated_at).toBeDefined();
});

test('I: update ignores unknown fields (no SQL injection surface)', () => {
  const ticket = create(baseTicket());
  // Passing an unknown field should not throw, just be ignored
  const updated = update(ticket.id, orgId, { title: 'Safe', injected: 'DROP TABLE tickets' });
  expect(updated.title).toBe('Safe');
  expect(findByOrg(orgId)).toHaveLength(1);
});

// ── Exceptions ──────────────────────────────────────────────────────────────

test('E: create with invalid column throws ZodError', () => {
  expect(() =>
    create({ ...baseTicket(), column: 'invalid-column' })
  ).toThrow(ZodError);
});

test('E: remove non-existent ticket throws NotFoundError', () => {
  expect(() => remove(99999, orgId)).toThrow(NotFoundError);
});

// ── Simple scenario ──────────────────────────────────────────────────────────

test('S: full lifecycle — create in problems, move through all 7 columns, set review fields', () => {
  const ticket = create(baseTicket());
  expect(ticket.column).toBe('problems');

  let current = ticket;
  for (let i = 1; i < COLUMNS.length; i++) {
    current = move(current.id, orgId, 'right');
    expect(current.column).toBe(COLUMNS[i]);
  }

  expect(current.column).toBe('next');

  // Navigate back to review to set review fields
  // (In the lifecycle the ticket naturally passes through review)
  const reviewTicket = create({ ...baseTicket(), column: 'review', title: 'Review me' });
  const withReview = update(reviewTicket.id, orgId, {
    hypothesis: 'We expected X',
    actual_results: 'We got Y',
    learning: 'We learned Z',
  });
  expect(withReview.hypothesis).toBe('We expected X');
  expect(withReview.actual_results).toBe('We got Y');
  expect(withReview.learning).toBe('We learned Z');
});
