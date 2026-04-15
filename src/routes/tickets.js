import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { findBySlug } from '../models/organization.js';
import {
  create,
  findById,
  findByOrg,
  update,
  move,
  remove,
  COLUMNS,
  NotFoundError,
  InvalidMoveError,
  WipLimitError,
} from '../models/ticket.js';

export const ticketsRouter = Router();

const isHtmx = req => Boolean(req.headers['hx-request']);

async function orgGuard(req, res) {
  const org = await findBySlug(req.params.slug);
  if (!org || org.id !== req.user.orgId) {
    res.status(403).render('partials/error', { message: 'Forbidden' });
    return null;
  }
  return org;
}

// POST /orgs/:slug/tickets
ticketsRouter.post('/:slug/tickets', authenticate, async (req, res) => {
  const org = await orgGuard(req, res);
  if (!org) return;

  const { title, column = 'problems', owner, status, parent_id, description,
          action, duration, expected_outcome, hypothesis, actual_results, learning } = req.body ?? {};

  if (!title) {
    return res.status(422).render('partials/error', { message: 'Title is required' });
  }

  const columnSchema = z.enum(COLUMNS);
  if (!columnSchema.safeParse(column).success) {
    return res.status(422).render('partials/error', { message: 'Invalid column' });
  }

  await create({
    orgId: org.id,
    createdBy: req.user.id,
    parentId: parent_id ? Number(parent_id) : undefined,
    title, column, owner, status, description, action, duration,
    expected_outcome, hypothesis, actual_results, learning,
  });

  res.setHeader('HX-Trigger', 'boardChange');
  if (!isHtmx(req)) return res.redirect(303, `/orgs/${org.slug}/board`);
  res.status(200).send('');
});

// GET /orgs/:slug/tickets/:id/edit
ticketsRouter.get('/:slug/tickets/:id/edit', authenticate, async (req, res) => {
  const org = await orgGuard(req, res);
  if (!org) return;

  const ticket = await findById(Number(req.params.id));
  if (!ticket || ticket.org_id !== org.id) {
    return res.status(404).render('partials/error', { message: 'Ticket not found' });
  }

  res.render('partials/tickets/form', { ticket, org, user: req.user });
});

// PUT /orgs/:slug/tickets/:id
ticketsRouter.put('/:slug/tickets/:id', authenticate, async (req, res) => {
  const org = await orgGuard(req, res);
  if (!org) return;

  const id = Number(req.params.id);
  const ticket = await findById(id);
  if (!ticket || ticket.org_id !== org.id) {
    return res.status(404).render('partials/error', { message: 'Ticket not found' });
  }

  const { title, owner, status, description, action, duration, expected_outcome,
          hypothesis, actual_results, learning } = req.body ?? {};

  const updated = await update(id, org.id, {
    title, owner, status, description, action, duration, expected_outcome,
    hypothesis, actual_results, learning,
  });

  const allTickets = await findByOrg(org.id);
  const ticketMap = Object.fromEntries(allTickets.map(t => [t.id, t]));
  res.status(200).render('partials/tickets/card', { ticket: updated, org, user: req.user, ticketMap });
});

// PATCH /orgs/:slug/tickets/:id/move
ticketsRouter.patch('/:slug/tickets/:id/move', authenticate, async (req, res) => {
  const org = await orgGuard(req, res);
  if (!org) return;

  const id = Number(req.params.id);
  const { direction } = req.body ?? {};

  try {
    await move(id, org.id, direction);
    res.setHeader('HX-Trigger', 'boardChange');
    if (!isHtmx(req)) return res.redirect(303, `/orgs/${org.slug}/board`);
    res.status(200).send('');
  } catch (err) {
    if (err instanceof InvalidMoveError || err instanceof WipLimitError) {
      return res.status(422).render('partials/error', { message: err.message });
    }
    if (err instanceof NotFoundError) {
      return res.status(404).render('partials/error', { message: err.message });
    }
    throw err;
  }
});

// DELETE /orgs/:slug/tickets/:id
ticketsRouter.delete('/:slug/tickets/:id', authenticate, requireAdmin, async (req, res) => {
  const org = await orgGuard(req, res);
  if (!org) return;

  const id = Number(req.params.id);
  try {
    await remove(id, org.id);
    res.setHeader('HX-Trigger', 'boardChange');
    if (!isHtmx(req)) return res.redirect(303, `/orgs/${org.slug}/board`);
    res.status(200).send('');
  } catch (err) {
    if (err instanceof NotFoundError) {
      return res.status(404).render('partials/error', { message: err.message });
    }
    throw err;
  }
});
