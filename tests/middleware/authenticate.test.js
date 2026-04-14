import { jest } from '@jest/globals';
import { db } from '../../src/db.js';
import { runMigrations } from '../../src/db/migrate.js';
import { create as createOrg } from '../../src/models/organization.js';
import { create as createUser } from '../../src/models/user.js';
import { authenticate } from '../../src/middleware/authenticate.js';

beforeAll(() => {
  runMigrations(db);
});

beforeEach(() => {
  db.exec('DELETE FROM tickets');
  db.exec('DELETE FROM users');
  db.exec('DELETE FROM organizations');
});

function makeReq(sessionData = {}) {
  return { session: { ...sessionData } };
}

function makeRes() {
  const res = {
    statusCode: 200,
    _rendered: null,
    status(code) { this.statusCode = code; return this; },
    render(view, locals) { this._rendered = { view, locals }; },
  };
  return res;
}

// ── Zero ────────────────────────────────────────────────────────────────────

test('Z: no session → 401 and renders partials/error', async () => {
  const req = makeReq();
  const res = makeRes();
  const next = jest.fn();

  await authenticate(req, res, next);

  expect(res.statusCode).toBe(401);
  expect(res._rendered.view).toBe('partials/error');
  expect(next).not.toHaveBeenCalled();
});

// ── One ─────────────────────────────────────────────────────────────────────

test('O: valid session → req.user populated and next() called', async () => {
  const org = createOrg({ name: 'Acme', slug: 'acme' });
  const user = createUser({ orgId: org.id, email: 'a@acme.com', password: 'pw', role: 'admin' });

  const req = makeReq({ userId: user.id, orgId: org.id });
  const res = makeRes();
  const next = jest.fn();

  await authenticate(req, res, next);

  expect(next).toHaveBeenCalledTimes(1);
  expect(req.user).toMatchObject({
    id: user.id,
    email: 'a@acme.com',
    role: 'admin',
    orgId: org.id,
    orgSlug: 'acme',
  });
});

// ── Boundary ────────────────────────────────────────────────────────────────

test('B: session with non-existent userId → 401', async () => {
  const org = createOrg({ name: 'Acme', slug: 'acme' });
  const req = makeReq({ userId: 99999, orgId: org.id });
  const res = makeRes();
  const next = jest.fn();

  await authenticate(req, res, next);

  expect(res.statusCode).toBe(401);
  expect(next).not.toHaveBeenCalled();
});

// ── Interface ───────────────────────────────────────────────────────────────

test('I: calls next() exactly once on success', async () => {
  const org = createOrg({ name: 'Acme', slug: 'acme' });
  const user = createUser({ orgId: org.id, email: 'a@acme.com', password: 'pw', role: 'member' });

  const req = makeReq({ userId: user.id, orgId: org.id });
  const res = makeRes();
  const next = jest.fn();

  await authenticate(req, res, next);

  expect(next).toHaveBeenCalledTimes(1);
});

// ── Exceptions ──────────────────────────────────────────────────────────────

test('E: session userId from a different org → 401', async () => {
  const orgA = createOrg({ name: 'Acme', slug: 'acme' });
  const orgB = createOrg({ name: 'Beta', slug: 'beta' });
  const userA = createUser({ orgId: orgA.id, email: 'a@acme.com', password: 'pw', role: 'admin' });

  // Session claims orgB but userId belongs to orgA
  const req = makeReq({ userId: userA.id, orgId: orgB.id });
  const res = makeRes();
  const next = jest.fn();

  await authenticate(req, res, next);

  expect(res.statusCode).toBe(401);
  expect(next).not.toHaveBeenCalled();
});

// ── Simple scenario ──────────────────────────────────────────────────────────

test('S: admin and member both pass authentication with correct session', async () => {
  const org = createOrg({ name: 'Acme', slug: 'acme' });
  const admin = createUser({ orgId: org.id, email: 'admin@acme.com', password: 'pw', role: 'admin' });
  const member = createUser({ orgId: org.id, email: 'member@acme.com', password: 'pw', role: 'member' });

  for (const user of [admin, member]) {
    const req = makeReq({ userId: user.id, orgId: org.id });
    const res = makeRes();
    const next = jest.fn();
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user.role).toBe(user.role);
  }
});
