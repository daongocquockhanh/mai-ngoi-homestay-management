import { createMiddleware } from 'hono/factory';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'mai-ngoi-default-secret-change-me';

export interface JwtPayload {
  userId: string;
  username: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

/**
 * Auth middleware — requires valid Bearer token on all protected routes.
 */
export const requireAuth = createMiddleware<{ Variables: { user: JwtPayload } }>(
  async (c, next) => {
    const header = c.req.header('Authorization');
    if (!header?.startsWith('Bearer ')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
      const payload = verifyToken(header.slice(7));
      c.set('user', payload);
      await next();
    } catch {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }
  },
);
