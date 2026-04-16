import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import 'dotenv/config';
import authRoute from './routes/auth.js';
import bookingsRoute from './routes/bookings.js';
import roomsRoute from './routes/rooms.js';
import dashboardRoute from './routes/dashboard.js';
import reportsRoute from './routes/reports.js';
import { requireAuth } from './middleware/auth.js';

const app = new Hono();

app.use(logger());

// CORS allowlist:
//   - local dev frontend (vite): http://localhost:5173
//   - production frontend: set via CORS_ORIGIN env (comma-separated for multiple)
const corsOrigins = [
  'http://localhost:5173',
  ...(process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean) ?? []),
];
app.use(cors({ origin: corsOrigins, credentials: true }));

// Global error handler
app.onError((err, c) => {
  console.error(`[ERROR] ${err.message}`, err.stack);
  return c.json({ error: 'Internal server error' }, 500);
});

app.get('/', (c) => {
  return c.json({ message: 'Mai Ngoi Homestay Management API', version: '0.1.0' });
});

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Auth routes (public)
app.route('/auth', authRoute);

// Protect all API routes except public ones
const publicPaths = ['/', '/health', '/auth'];
app.use(async (c, next) => {
  const path = c.req.path;
  if (publicPaths.some((p) => path === p || path.startsWith(p + '/'))) {
    return next();
  }
  return (requireAuth as any)(c, next);
});

app.route('/rooms', roomsRoute);
app.route('/bookings', bookingsRoute);
app.route('/dashboard', dashboardRoute);
app.route('/reports', reportsRoute);

const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on http://localhost:${port}`);
});

export default app;
