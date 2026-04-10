import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import 'dotenv/config';
import bookingsRoute from './routes/bookings.js';
import roomsRoute from './routes/rooms.js';
import dashboardRoute from './routes/dashboard.js';

const app = new Hono();

app.use(logger());
app.use(cors({ origin: ['http://localhost:5173'], credentials: true }));

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

app.route('/rooms', roomsRoute);
app.route('/bookings', bookingsRoute);
app.route('/dashboard', dashboardRoute);

const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on http://localhost:${port}`);
});

export default app;
