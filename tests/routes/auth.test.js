import request from 'supertest';
import { db } from '../../src/db.js';
import { runMigrations } from '../../src/db/migrate.js';
import { app } from '../../src/app.js';
import { findBySlug } from '../../src/models/organization.js';
import { findByEmail } from '../../src/models/user.js';

beforeAll(() => {
  runMigrations(db);
});

beforeEach(() => {
  db.exec('DELETE FROM tickets');
  db.exec('DELETE FROM users');
  db.exec('DELETE FROM organizations');
});

// ── Zero ────────────────────────────────────────────────────────────────────

test('Z: POST /auth/login with empty body → 422', async () => {
  const res = await request(app).post('/auth/login').send({});
  expect(res.status).toBe(422);
  expect(res.headers['content-type']).toMatch(/html/);
});

test('Z: POST /auth/register with empty body → 422', async () => {
  const res = await request(app).post('/auth/register').send({});
  expect(res.status).toBe(422);
  expect(res.headers['content-type']).toMatch(/html/);
});

// ── One ─────────────────────────────────────────────────────────────────────

test('O: register with new org → org + admin user created, redirect to board', async () => {
  const res = await request(app)
    .post('/auth/register')
    .type('form')
    .send({ email: 'admin@acme.com', password: 'secret', createOrg: 'true', orgName: 'Acme', orgSlug: 'acme' });

  expect(res.status).toBe(303);
  expect(res.headers.location).toBe('/orgs/acme/board');

  const org = findBySlug('acme');
  expect(org).toBeDefined();
  const user = findByEmail(org.id, 'admin@acme.com');
  expect(user.role).toBe('admin');
});

test('O: POST /auth/login with correct credentials → session set, redirect to board', async () => {
  // Setup: register first
  await request(app)
    .post('/auth/register')
    .type('form')
    .send({ email: 'admin@acme.com', password: 'secret', createOrg: 'true', orgName: 'Acme', orgSlug: 'acme' });

  const res = await request(app)
    .post('/auth/login')
    .type('form')
    .send({ email: 'admin@acme.com', password: 'secret', orgSlug: 'acme' });

  expect(res.status).toBe(303);
  expect(res.headers.location).toBe('/orgs/acme/board');
  expect(res.headers['set-cookie']).toBeDefined();
});

test('O: POST /auth/logout → session destroyed, redirect to /', async () => {
  const agent = request.agent(app);
  await agent.post('/auth/register').type('form')
    .send({ email: 'a@a.com', password: 'pw', createOrg: 'true', orgName: 'A', orgSlug: 'a-org' });

  const res = await agent.post('/auth/logout');
  expect(res.status).toBe(303);
  expect(res.headers.location).toBe('/');
});

// ── Many ────────────────────────────────────────────────────────────────────

test('M: two members can join the same org', async () => {
  // Admin creates org
  await request(app).post('/auth/register').type('form')
    .send({ email: 'admin@acme.com', password: 'pw', createOrg: 'true', orgName: 'Acme', orgSlug: 'acme' });

  const res = await request(app).post('/auth/register').type('form')
    .send({ email: 'member@acme.com', password: 'pw', createOrg: 'false', joinSlug: 'acme' });

  expect(res.status).toBe(303);
  const org = findBySlug('acme');
  const member = findByEmail(org.id, 'member@acme.com');
  expect(member.role).toBe('member');
});

// ── Boundary ────────────────────────────────────────────────────────────────

test('B: register member with unknown orgSlug → 422', async () => {
  const res = await request(app).post('/auth/register').type('form')
    .send({ email: 'x@x.com', password: 'pw', createOrg: 'false', joinSlug: 'no-such-org' });

  expect(res.status).toBe(422);
});

// ── Interface ───────────────────────────────────────────────────────────────

test('I: HTMX login failure returns partial (no full HTML doc)', async () => {
  const res = await request(app)
    .post('/auth/login')
    .set('HX-Request', 'true')
    .type('form')
    .send({ email: 'nobody@x.com', password: 'wrong', orgSlug: 'acme' });

  expect(res.status).toBe(422);
  expect(res.text).not.toMatch(/<html/i);
});

// ── Exceptions ──────────────────────────────────────────────────────────────

test('E: wrong password → 422 with "Invalid credentials" message', async () => {
  await request(app).post('/auth/register').type('form')
    .send({ email: 'a@acme.com', password: 'correct', createOrg: 'true', orgName: 'Acme', orgSlug: 'acme' });

  const res = await request(app).post('/auth/login').type('form')
    .send({ email: 'a@acme.com', password: 'wrong', orgSlug: 'acme' });

  expect(res.status).toBe(422);
  expect(res.text).toMatch(/Invalid credentials/i);
});

test('E: duplicate email in same org → 422', async () => {
  await request(app).post('/auth/register').type('form')
    .send({ email: 'a@acme.com', password: 'pw', createOrg: 'true', orgName: 'Acme', orgSlug: 'acme' });

  const res = await request(app).post('/auth/register').type('form')
    .send({ email: 'a@acme.com', password: 'pw2', createOrg: 'false', joinSlug: 'acme' });

  expect(res.status).toBe(422);
});

// ── Simple scenario ──────────────────────────────────────────────────────────

test('S: full register → login → logout → login cycle', async () => {
  const agent = request.agent(app);

  // Register
  let res = await agent.post('/auth/register').type('form')
    .send({ email: 'u@org.com', password: 'pw123', createOrg: 'true', orgName: 'Org', orgSlug: 'my-org' });
  expect(res.status).toBe(303);

  // Logout
  res = await agent.post('/auth/logout');
  expect(res.status).toBe(303);

  // Login again
  res = await agent.post('/auth/login').type('form')
    .send({ email: 'u@org.com', password: 'pw123', orgSlug: 'my-org' });
  expect(res.status).toBe(303);
  expect(res.headers.location).toBe('/orgs/my-org/board');
});
