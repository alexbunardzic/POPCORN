import { pool } from '../db.js';

export const VOTABLE_COLUMNS = ['problems', 'options', 'possible'];

export async function toggle(ticketId, userId) {
  const del = await pool.query(
    'DELETE FROM votes WHERE ticket_id = $1 AND user_id = $2',
    [ticketId, userId],
  );
  if (del.rowCount === 0) {
    await pool.query(
      'INSERT INTO votes (ticket_id, user_id) VALUES ($1, $2)',
      [ticketId, userId],
    );
  }
}

export async function countsByOrg(orgId) {
  const { rows } = await pool.query(`
    SELECT v.ticket_id, COUNT(v.id)::int AS count
    FROM votes v
    JOIN tickets t ON t.id = v.ticket_id
    WHERE t.org_id = $1
    GROUP BY v.ticket_id
  `, [orgId]);
  return Object.fromEntries(rows.map(r => [r.ticket_id, r.count]));
}

export async function votedByUser(orgId, userId) {
  const { rows } = await pool.query(`
    SELECT v.ticket_id
    FROM votes v
    JOIN tickets t ON t.id = v.ticket_id
    WHERE t.org_id = $1 AND v.user_id = $2
  `, [orgId, userId]);
  return new Set(rows.map(r => r.ticket_id));
}
