import { findById as findUser } from '../models/user.js';
import { findById as findOrg } from '../models/organization.js';

export async function authenticate(req, res, next) {
  const { userId, orgId } = req.session ?? {};

  if (!userId || !orgId) {
    return res.status(401).render('partials/error', { message: 'Not authenticated' });
  }

  const user = findUser(userId);

  if (!user || user.org_id !== orgId) {
    return res.status(401).render('partials/error', { message: 'Not authenticated' });
  }

  const org = findOrg(orgId);

  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
    orgId: org.id,
    orgSlug: org.slug,
  };

  next();
}
