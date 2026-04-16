import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users } from '../db/schema/index.js';
import { signToken, requireAuth, type JwtPayload } from '../middleware/auth.js';

const app = new Hono<{ Variables: { user: JwtPayload } }>();

// POST /auth/login — { username, password } → { token }
app.post('/login', async (c) => {
  let body: { username?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const { username, password } = body;
  if (!username || !password) {
    return c.json({ error: 'Username and password are required' }, 400);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return c.json({ error: 'Sai tên đăng nhập hoặc mật khẩu' }, 401);
  }

  const token = signToken({ userId: user.id, username: user.username });
  return c.json({ token, username: user.username });
});

// GET /auth/me — returns current user info (requires auth)
app.get('/me', requireAuth, (c) => {
  const user = c.get('user');
  return c.json({ userId: user.userId, username: user.username });
});

// POST /auth/change-password — { currentPassword, newPassword } (requires auth)
app.post('/change-password', requireAuth, async (c) => {
  const { userId } = c.get('user');

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON' }, 400);
  }

  const { currentPassword, newPassword } = body;
  if (!currentPassword || !newPassword) {
    return c.json({ error: 'Current and new password are required' }, 400);
  }

  if (newPassword.length < 6) {
    return c.json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' }, 400);
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return c.json({ error: 'Mật khẩu hiện tại không đúng' }, 401);
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(users.id, userId));

  return c.json({ message: 'Đổi mật khẩu thành công' });
});

export default app;
