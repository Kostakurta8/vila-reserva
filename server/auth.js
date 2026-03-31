import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const APP_PASSWORD = process.env.APP_PASSWORD || 'admin';

/* ── Login ───────────────────────────────────────────────────── */
export function login(password) {
  const input = Buffer.from(String(password));
  const expected = Buffer.from(APP_PASSWORD);

  // Constant-time comparison (prevents timing attacks)
  const match =
    input.length === expected.length &&
    crypto.timingSafeEqual(input, expected);

  if (!match) return null;

  return jwt.sign({ user: 'owner' }, JWT_SECRET, { expiresIn: '30d' });
}

/* ── Middleware ───────────────────────────────────────────────── */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
