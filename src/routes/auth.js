import { Router } from 'express';
import { z, ZodError } from 'zod';
import { create as createOrg, findBySlug } from '../models/organization.js';
import { create as createUser, findByEmail, verifyPassword } from '../models/user.js';

export const authRouter = Router();

const isHtmx = req => Boolean(req.headers['hx-request']);

function renderError(req, res, status, message) {
  if (isHtmx(req)) {
    return res.status(status).render('partials/error', { message });
  }
  // Re-render the relevant full page with the error
  const view = req.path.includes('register') ? 'auth/register' : 'auth/login';
  return res.status(status).render(view, { error: message });
}

// GET /auth/login
authRouter.get('/login', (req, res) => {
  res.render('auth/login', {});
});

// GET /auth/register
authRouter.get('/register', (req, res) => {
  res.render('auth/register', {});
});

// POST /auth/login
authRouter.post('/login', async (req, res) => {
  const { email, password, orgSlug } = req.body ?? {};

  if (!email || !password || !orgSlug) {
    return renderError(req, res, 422, 'Email, password, and organisation slug are required');
  }

  const org = findBySlug(orgSlug);
  if (!org) return renderError(req, res, 422, 'Invalid credentials');

  const user = findByEmail(org.id, email);
  if (!user) return renderError(req, res, 422, 'Invalid credentials');

  const ok = await verifyPassword(user.password_hash, password);
  if (!ok) return renderError(req, res, 422, 'Invalid credentials');

  req.session.userId = user.id;
  req.session.orgId = org.id;

  res.redirect(303, `/orgs/${org.slug}/board`);
});

// POST /auth/register
authRouter.post('/register', async (req, res) => {
  const { email, password, createOrg: createOrgFlag, orgName, orgSlug, joinSlug } = req.body ?? {};

  if (!email || !password) {
    return renderError(req, res, 422, 'Email and password are required');
  }

  const EmailSchema = z.string().email();
  const emailParsed = EmailSchema.safeParse(email);
  if (!emailParsed.success) {
    return renderError(req, res, 422, 'Invalid email address');
  }

  let org;
  let role;

  if (createOrgFlag === 'true') {
    if (!orgName || !orgSlug) {
      return renderError(req, res, 422, 'Organisation name and slug are required');
    }
    try {
      org = createOrg({ name: orgName, slug: orgSlug });
    } catch (err) {
      const message = err instanceof ZodError
        ? err.errors[0].message
        : 'Organisation slug already taken';
      return renderError(req, res, 422, message);
    }
    role = 'admin';
  } else {
    org = findBySlug(joinSlug);
    if (!org) return renderError(req, res, 422, 'Organisation not found');
    role = 'member';
  }

  try {
    const user = createUser({ orgId: org.id, email, password, role });
    req.session.userId = user.id;
    req.session.orgId = org.id;
  } catch {
    return renderError(req, res, 422, 'Email already registered in this organisation');
  }

  res.redirect(303, `/orgs/${org.slug}/board`);
});

// POST /auth/logout
authRouter.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect(303, '/');
  });
});
