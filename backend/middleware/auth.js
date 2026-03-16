// middleware/auth.js
const { auth } = require('../utils/firebase');

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await auth.verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Optional auth – doesn't fail if no token
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.split('Bearer ')[1];
      req.user = await auth.verifyIdToken(token);
    } catch { req.user = null; }
  } else {
    req.user = null;
  }
  next();
}

module.exports = { verifyToken, optionalAuth };
