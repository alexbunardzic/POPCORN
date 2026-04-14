import { db } from '../../src/db.js';
import { runMigrations } from '../../src/db/migrate.js';
import { create as createOrg } from '../../src/models/organization.js';
import {
  create,
  findByEmail,
  findById,
  findByOrg,
  verifyPassword,
} from '../../src/models/user.js';
import { ZodError } from 'zod';

beforeAll(() => {
  runMigrations(db);
});

beforeEach(() => {
  db.exec('DELETE FROM tickets');
  db.exec('DELETE FROM users');
  db.exec('DELETE FROM organizations');
});

let orgId;
beforeEach(() => {
  const org = createOrg({ name: 'Acme', slug: 'acme' });
  orgId = org.id;
});

// ── Zero ────────────────────────────────────────────────────────────────────

test('Z: findByOrg returns [] when org has no users', () => {
  expect(findByOrg(orgId)).toEqual([]);
});

test('Z: findByEmail returns undefined for unknown email', () => {
  expect(findByEmail(orgId, 'nobody@example.com')).toBeUndefined();
});

// ── One ─────────────────────────────────────────────────────────────────────

test('O: create returns user with id; password is not stored in plain text', () => {
  const user = create({ orgId, email: 'admin@acme.com', password: 'secret', role: 'admin' });
  expect(user.id).toBeDefined();
  expect(user.email).toBe('admin@acme.com');
  expect(user.password_hash).not.toBe('secret');
  expect(user.role).toBe('admin');
});

test('O: findByEmail finds the created user', () => {
  create({ orgId, email: 'admin@acme.com', password: 'secret', role: 'admin' });
  const found = findByEmail(orgId, 'admin@acme.com');
  expect(found.email).toBe('admin@acme.com');
});

test('O: findById returns the user', () => {
  const created = create({ orgId, email: 'admin@acme.com', password: 'secret', role: 'admin' });
  const found = findById(created.id);
  expect(found.id).toBe(created.id);
});

test('O: verifyPassword returns true for correct password', async () => {
  const user = create({ orgId, email: 'admin@acme.com', password: 'correct', role: 'admin' });
  const result = await verifyPassword(user.password_hash, 'correct');
  expect(result).toBe(true);
});

// ── Many ────────────────────────────────────────────────────────────────────

test('M: findByOrg returns all users belonging to that org', () => {
  create({ orgId, email: 'a@acme.com', password: 'pw', role: 'admin' });
  create({ orgId, email: 'b@acme.com', password: 'pw', role: 'member' });
  expect(findByOrg(orgId)).toHaveLength(2);
});

test('M: users from org A are not visible via org B', () => {
  const orgB = createOrg({ name: 'Beta', slug: 'beta' });
  create({ orgId, email: 'a@acme.com', password: 'pw', role: 'admin' });
  expect(findByOrg(orgB.id)).toEqual([]);
});

// ── Boundary ────────────────────────────────────────────────────────────────

test('B: duplicate email within the same org throws', () => {
  create({ orgId, email: 'a@acme.com', password: 'pw', role: 'admin' });
  expect(() =>
    create({ orgId, email: 'a@acme.com', password: 'pw2', role: 'member' })
  ).toThrow();
});

test('B: same email in different orgs is allowed', () => {
  const orgB = createOrg({ name: 'Beta', slug: 'beta' });
  create({ orgId, email: 'shared@example.com', password: 'pw', role: 'admin' });
  const userB = create({ orgId: orgB.id, email: 'shared@example.com', password: 'pw', role: 'admin' });
  expect(userB.id).toBeDefined();
});

test('B: role must be admin or member (invalid role throws ZodError)', () => {
  expect(() =>
    create({ orgId, email: 'x@acme.com', password: 'pw', role: 'superuser' })
  ).toThrow(ZodError);
});

// ── Interface ───────────────────────────────────────────────────────────────

test('I: verifyPassword returns a boolean, never throws', async () => {
  const user = create({ orgId, email: 'a@acme.com', password: 'pw', role: 'admin' });
  const result = await verifyPassword(user.password_hash, 'wrong');
  expect(typeof result).toBe('boolean');
});

// ── Exceptions ──────────────────────────────────────────────────────────────

test('E: verifyPassword returns false for wrong password', async () => {
  const user = create({ orgId, email: 'a@acme.com', password: 'correct', role: 'admin' });
  const result = await verifyPassword(user.password_hash, 'wrong');
  expect(result).toBe(false);
});

test('E: create without email throws ZodError', () => {
  expect(() =>
    create({ orgId, password: 'pw', role: 'admin' })
  ).toThrow(ZodError);
});

// ── Simple scenario ──────────────────────────────────────────────────────────

test('S: register admin, register member, verify both passwords', async () => {
  const admin = create({ orgId, email: 'admin@acme.com', password: 'adminpw', role: 'admin' });
  const member = create({ orgId, email: 'member@acme.com', password: 'memberpw', role: 'member' });

  expect(await verifyPassword(admin.password_hash, 'adminpw')).toBe(true);
  expect(await verifyPassword(member.password_hash, 'memberpw')).toBe(true);
  expect(await verifyPassword(admin.password_hash, 'memberpw')).toBe(false);
});
