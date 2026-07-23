const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'cafepos-dev-secret-change-me';
const TOKEN_EXPIRY = '12h';

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = token && verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });
  req.user = payload;
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
  next();
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken, authenticate, requireAdmin };
