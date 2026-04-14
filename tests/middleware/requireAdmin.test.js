import { jest } from '@jest/globals';
import { requireAdmin } from '../../src/middleware/requireAdmin.js';

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

test('Z: no req.user → 401', () => {
  const req = {};
  const res = makeRes();
  const next = jest.fn();

  requireAdmin(req, res, next);

  expect(res.statusCode).toBe(401);
  expect(next).not.toHaveBeenCalled();
});

// ── One ─────────────────────────────────────────────────────────────────────

test('O: admin role → next() called', () => {
  const req = { user: { role: 'admin' } };
  const res = makeRes();
  const next = jest.fn();

  requireAdmin(req, res, next);

  expect(next).toHaveBeenCalledTimes(1);
});

// ── Interface ───────────────────────────────────────────────────────────────

test('I: calls next() exactly once for admin', () => {
  const req = { user: { role: 'admin' } };
  const res = makeRes();
  const next = jest.fn();

  requireAdmin(req, res, next);

  expect(next).toHaveBeenCalledTimes(1);
});

// ── Exceptions ──────────────────────────────────────────────────────────────

test('E: member role → 403 and renders partials/error', () => {
  const req = { user: { role: 'member' } };
  const res = makeRes();
  const next = jest.fn();

  requireAdmin(req, res, next);

  expect(res.statusCode).toBe(403);
  expect(res._rendered.view).toBe('partials/error');
  expect(next).not.toHaveBeenCalled();
});

// ── Simple scenario ──────────────────────────────────────────────────────────

test('S: admin passes, member is blocked', () => {
  const next = jest.fn();
  const res = makeRes();

  requireAdmin({ user: { role: 'admin' } }, res, next);
  expect(next).toHaveBeenCalledTimes(1);

  next.mockClear();
  requireAdmin({ user: { role: 'member' } }, makeRes(), next);
  expect(next).not.toHaveBeenCalled();
});
