import { Hono, type Context } from 'hono';
import { eq, and, notInArray, lt, gt } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { rooms, bookings } from '../db/schema/index.js';
import { validateJson } from '../middleware/validate.js';
import {
  updateRoomStatusSchema,
  availabilityQuerySchema,
} from '../validators/room.js';

const app = new Hono();

const uuidParam = z.string().uuid();

// ---------------------------------------------------------------------------
// GET /rooms  — list all rooms with current status
// ---------------------------------------------------------------------------

app.get('/', async (c) => {
  const allRooms = await db
    .select()
    .from(rooms)
    .orderBy(rooms.name);

  return c.json(allRooms);
});

// ---------------------------------------------------------------------------
// GET /rooms/availability?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD
// Returns rooms that have NO overlapping active bookings for the date range.
// ---------------------------------------------------------------------------

app.get('/availability', async (c) => {
  const parsed = availabilityQuerySchema.safeParse({
    checkIn: c.req.query('checkIn'),
    checkOut: c.req.query('checkOut'),
  });

  if (!parsed.success) {
    return c.json({ error: 'Invalid query', issues: parsed.error.issues }, 400);
  }

  const { checkIn, checkOut } = parsed.data;

  // Find rooms that have overlapping active bookings
  const occupiedRoomRows = await db
    .select({ roomId: bookings.roomId })
    .from(bookings)
    .where(
      and(
        notInArray(bookings.status, ['CANCELLED', 'COMPLETED']),
        lt(bookings.checkIn, checkOut),
        gt(bookings.checkOut, checkIn),
      ),
    );

  const occupiedRoomIds = occupiedRoomRows.map((r) => r.roomId);

  // Return all rooms with an `available` flag
  const allRooms = await db.select().from(rooms).orderBy(rooms.name);

  const result = allRooms.map((room) => ({
    ...room,
    available:
      !occupiedRoomIds.includes(room.id) &&
      room.status !== 'MAINTENANCE',
  }));

  return c.json(result);
});

// ---------------------------------------------------------------------------
// PATCH /rooms/:id/status  — update room operational status
// ---------------------------------------------------------------------------

app.patch('/:id/status', validateJson(updateRoomStatusSchema), async (c) => {
  const parseResult = uuidParam.safeParse(c.req.param('id'));
  if (!parseResult.success) return c.json({ error: 'Invalid room id' }, 400);
  const id = parseResult.data;

  const { status } = c.get('validated');

  const existing = await db
    .select({ id: rooms.id })
    .from(rooms)
    .where(eq(rooms.id, id))
    .limit(1);

  if (existing.length === 0) {
    return c.json({ error: 'Room not found' }, 404);
  }

  const [updated] = await db
    .update(rooms)
    .set({ status, updatedAt: new Date() })
    .where(eq(rooms.id, id))
    .returning();

  return c.json(updated);
});

export default app;
