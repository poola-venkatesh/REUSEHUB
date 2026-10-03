const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'rent-and-reuse-super-secure-jwt-secret-key-2026';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Authentication required. Please log in.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await db.get('SELECT * FROM users WHERE id = ? AND is_active = 1', [decoded.id]);
    if (!user) {
      return res.status(401).json({ success: false, error: 'User account not found or deactivated.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired session. Please log in again.' });
  }
}

async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await db.get('SELECT * FROM users WHERE id = ? AND is_active = 1', [decoded.id]);
      if (user) req.user = user;
    }
  } catch (e) {
    // Proceed as unauthenticated
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, error: 'Access denied. Administrative privileges required.' });
  }
  next();
}

module.exports = {
  JWT_SECRET,
  generateToken,
  requireAuth,
  optionalAuth,
  requireAdmin
};
