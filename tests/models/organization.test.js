import { db } from '../../src/db.js';
import { runMigrations } from '../../src/db/migrate.js';
import {
  create,
  findAll,
  findById,
  findBySlug,
} from '../../src/models/organization.js';
import { ZodError } from 'zod';

beforeAll(() => {
  runMigrations(db);
});

beforeEach(() => {
  db.exec('DELETE FROM tickets');
  db.exec('DELETE FROM users');
  db.exec('DELETE FROM organizations');
});

// ── Zero ────────────────────────────────────────────────────────────────────

test('Z: findAll returns [] when no organizations exist', () => {
  expect(findAll()).toEqual([]);
});

test('Z: findBySlug returns undefined for unknown slug', () => {
  expect(findBySlug('unknown')).toBeUndefined();
});

// ── One ─────────────────────────────────────────────────────────────────────

test('O: create returns the new org with an id', () => {
  const org = create({ name: 'Acme', slug: 'acme' });
  expect(org.id).toBeDefined();
  expect(org.name).toBe('Acme');
  expect(org.slug).toBe('acme');
});

test('O: findBySlug finds the created org', () => {
  create({ name: 'Acme', slug: 'acme' });
  const org = findBySlug('acme');
  expect(org.name).toBe('Acme');
});

test('O: findById finds the created org', () => {
  const created = create({ name: 'Acme', slug: 'acme' });
  const found = findById(created.id);
  expect(found.slug).toBe('acme');
});

// ── Many ────────────────────────────────────────────────────────────────────

test('M: findAll returns all organizations', () => {
  create({ name: 'Acme', slug: 'acme' });
  create({ name: 'Beta', slug: 'beta' });
  create({ name: 'Gamma', slug: 'gamma' });
  expect(findAll()).toHaveLength(3);
});

// ── Boundary ────────────────────────────────────────────────────────────────

test('B: duplicate slug throws', () => {
  create({ name: 'Acme', slug: 'acme' });
  expect(() => create({ name: 'Acme Two', slug: 'acme' })).toThrow();
});

test('B: wip_limit defaults to 3', () => {
  const org = create({ name: 'Acme', slug: 'acme' });
  expect(org.wip_limit).toBe(3);
});

test('B: wip_limit can be set explicitly', () => {
  const org = create({ name: 'Acme', slug: 'acme', wip_limit: 5 });
  expect(org.wip_limit).toBe(5);
});

// ── Interface ───────────────────────────────────────────────────────────────

test('I: all exports are functions', () => {
  expect(typeof create).toBe('function');
  expect(typeof findAll).toBe('function');
  expect(typeof findById).toBe('function');
  expect(typeof findBySlug).toBe('function');
});

// ── Exceptions ──────────────────────────────────────────────────────────────

test('E: create without name throws ZodError', () => {
  expect(() => create({ slug: 'acme' })).toThrow(ZodError);
});

test('E: create without slug throws ZodError', () => {
  expect(() => create({ name: 'Acme' })).toThrow(ZodError);
});

// ── Simple scenario ──────────────────────────────────────────────────────────

test('S: create org, retrieve by slug and id, verify all fields round-trip', () => {
  const org = create({ name: 'Round Trip', slug: 'round-trip', wip_limit: 4 });
  const bySlug = findBySlug('round-trip');
  const byId = findById(org.id);
  expect(bySlug).toMatchObject({ id: org.id, name: 'Round Trip', slug: 'round-trip', wip_limit: 4 });
  expect(byId).toMatchObject({ id: org.id, name: 'Round Trip', slug: 'round-trip', wip_limit: 4 });
});
