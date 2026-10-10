// JWT autentifikacija za dashboard rute
const jwt = require('jsonwebtoken');
const { config } = require('../config/env');

// Payload tokena: { id, username, plan }
function signToken(user) {
  return jwt.sign(
    { id: String(user._id), username: user.username, plan: user.plan },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { signToken, requireAuth };
