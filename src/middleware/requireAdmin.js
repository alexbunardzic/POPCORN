export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).render('partials/error', { message: 'Not authenticated' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).render('partials/error', { message: 'Admins only' });
  }
  next();
}
