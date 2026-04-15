import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { findBySlug } from '../models/organization.js';
import { findByOrg, COLUMNS } from '../models/ticket.js';
import { countsByOrg, votedByUser, VOTABLE_COLUMNS } from '../models/vote.js';

export const boardRouter = Router();

const NON_PROBLEM_COLS = COLUMNS.slice(1); // options … next

async function buildBoardData(org, userId) {
  const [allTickets, voteCounts, userVotedIds] = await Promise.all([
    findByOrg(org.id),
    countsByOrg(org.id),
    votedByUser(org.id, userId),
  ]);

  const ticketMap = Object.fromEntries(allTickets.map(t => [t.id, t]));

  function getRootProblemId(ticket, seen = new Set()) {
    if (seen.has(ticket.id)) return null;
    seen.add(ticket.id);
    if (ticket.column === 'problems') return ticket.id;
    if (!ticket.parent_id) return null;
    const parent = ticketMap[ticket.parent_id];
    return parent ? getRootProblemId(parent, seen) : null;
  }

  const voteSort = (a, b) =>
    (voteCounts[b.id] || 0) - (voteCounts[a.id] || 0) || a.position - b.position;

  const problems = allTickets
    .filter(t => t.column === 'problems')
    .sort(voteSort);

  const rows = problems.map(problem => {
    const byColumn = Object.fromEntries(
      NON_PROBLEM_COLS.map(col => [
        col,
        allTickets
          .filter(t => t.column === col && getRootProblemId(t) === problem.id)
          .sort(VOTABLE_COLUMNS.includes(col) ? voteSort : (a, b) => a.position - b.position),
      ])
    );
    return { problem, byColumn };
  });

  const wipCount = allTickets.filter(t => t.column === 'ongoing').length;

  return { rows, ticketMap, wipCount, wipLimit: org.wip_limit, voteCounts, userVotedIds };
}

// GET /orgs/:slug/board
boardRouter.get('/:slug/board', authenticate, async (req, res) => {
  const org = await findBySlug(req.params.slug);
  if (!org || org.id !== req.user.orgId) {
    return res.status(404).render('partials/error', { message: 'Organisation not found' });
  }

  const data = await buildBoardData(org, req.user.id);

  if (req.headers['hx-request']) {
    return res.render('partials/board/board-inner', { ...data, org, user: req.user });
  }

  res.render('board/index', { ...data, org, user: req.user });
});
