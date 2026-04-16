import { Hono, type Context } from 'hono';
import { eq, and, ilike, inArray, gte, lte, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import {
  bookings,
  rooms,
  serviceCharges,
  payments,
} from '../db/schema/index.js';
import { validateJson } from '../middleware/validate.js';
import {
  createBookingSchema,
  addServiceChargeSchema,
  recordPaymentSchema,
  type CreateBookingInput,
  type AddServiceChargeInput,
  type RecordPaymentInput,
} from '../validators/booking.js';
import {
  assertTransition,
  InvalidTransitionError,
} from '../services/booking-state.js';

const app = new Hono();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const uuidParam = z.string().uuid();

async function loadBookingOrNull(id: string) {
  const rows = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  return rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// GET /bookings  — list bookings with optional filters
//
// Query params:
//   status    — filter by status (comma-separated: BOOKED,CHECKED_IN)
//   roomId    — filter by room
//   guest     — search guest name (case-insensitive partial match)
//   from      — bookings with checkIn >= this date
//   to        — bookings with checkOut <= this date
//   limit     — max results (default 50)
//   offset    — pagination offset (default 0)
// ---------------------------------------------------------------------------

app.get('/', async (c) => {
  const statusParam = c.req.query('status');
  const roomId = c.req.query('roomId');
  const guest = c.req.query('guest');
  const from = c.req.query('from');
  const to = c.req.query('to');
  const limit = Math.min(Number(c.req.query('limit')) || 50, 100);
  const offset = Number(c.req.query('offset')) || 0;

  const conditions = [];

  if (statusParam) {
    const statuses = statusParam.split(',').filter(Boolean);
    const validStatuses = ['BOOKED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED'] as const;
    const filtered = statuses.filter((s): s is typeof validStatuses[number] =>
      (validStatuses as readonly string[]).includes(s),
    );
    if (filtered.length > 0) {
      conditions.push(inArray(bookings.status, filtered));
    }
  }

  if (roomId) {
    const parsed = uuidParam.safeParse(roomId);
    if (parsed.success) conditions.push(eq(bookings.roomId, parsed.data));
  }

  if (guest) {
    conditions.push(ilike(bookings.guestName, `%${guest}%`));
  }

  if (from) {
    conditions.push(gte(bookings.checkIn, from));
  }

  if (to) {
    conditions.push(lte(bookings.checkOut, to));
  }

  const rows = await db.query.bookings.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: { room: true },
    orderBy: [desc(bookings.createdAt)],
    limit,
    offset,
  });

  return c.json(rows);
});

// ---------------------------------------------------------------------------
// GET /bookings/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD
// Returns all non-cancelled bookings that overlap with the date range.
// ---------------------------------------------------------------------------

app.get('/calendar', async (c) => {
  const from = c.req.query('from');
  const to = c.req.query('to');

  if (!from || !to) {
    return c.json({ error: 'from and to query params are required' }, 400);
  }

  // Overlap condition: checkIn <= to AND checkOut >= from
  const rows = await db.query.bookings.findMany({
    where: and(
      lte(bookings.checkIn, to),
      gte(bookings.checkOut, from),
      inArray(bookings.status, ['BOOKED', 'CHECKED_IN', 'COMPLETED']),
    ),
    with: { room: true },
    orderBy: [desc(bookings.checkIn)],
  });

  return c.json(rows);
});

// ---------------------------------------------------------------------------
// POST /bookings  — create a new booking
// ---------------------------------------------------------------------------

app.post('/', validateJson(createBookingSchema), async (c) => {
  const input: CreateBookingInput = c.get('validated');

  const room = await db
    .select({ id: rooms.id, status: rooms.status })
    .from(rooms)
    .where(eq(rooms.id, input.roomId))
    .limit(1);

  if (room.length === 0) {
    return c.json({ error: 'Room not found' }, 404);
  }
  if (room[0].status === 'MAINTENANCE') {
    return c.json({ error: 'Room is under maintenance' }, 409);
  }

  const [created] = await db
    .insert(bookings)
    .values({
      roomId: input.roomId,
      guestName: input.guestName,
      phone: input.phone,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      totalRoomPrice: input.totalRoomPrice.toString(),
      notes: input.notes ?? null,
    })
    .returning();

  return c.json(created, 201);
});

// ---------------------------------------------------------------------------
// GET /bookings/:id  — fetch a booking with charges and payments
// ---------------------------------------------------------------------------

app.get('/:id', async (c) => {
  const parseResult = uuidParam.safeParse(c.req.param('id'));
  if (!parseResult.success) return c.json({ error: 'Invalid booking id' }, 400);
  const id = parseResult.data;

  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, id),
    with: {
      room: true,
      serviceCharges: true,
      payments: true,
    },
  });

  if (!booking) return c.json({ error: 'Booking not found' }, 404);
  return c.json(booking);
});

// ---------------------------------------------------------------------------
// POST /bookings/:id/check-in   BOOKED -> CHECKED_IN (+ room OCCUPIED)
// ---------------------------------------------------------------------------

app.post('/:id/check-in', async (c) => {
  const parseResult = uuidParam.safeParse(c.req.param('id'));
  if (!parseResult.success) return c.json({ error: 'Invalid booking id' }, 400);
  const id = parseResult.data;

  try {
    const updated = await db.transaction(async (tx) => {
      const booking = await tx
        .select()
        .from(bookings)
        .where(eq(bookings.id, id))
        .limit(1);

      if (booking.length === 0) throw new NotFoundError('Booking not found');

      assertTransition(booking[0].status, 'CHECKED_IN');

      const [updatedBooking] = await tx
        .update(bookings)
        .set({ status: 'CHECKED_IN', updatedAt: new Date() })
        .where(eq(bookings.id, id))
        .returning();

      await tx
        .update(rooms)
        .set({ status: 'OCCUPIED', updatedAt: new Date() })
        .where(eq(rooms.id, booking[0].roomId));

      return updatedBooking;
    });

    return c.json(updated);
  } catch (err) {
    return handleTransitionError(c, err);
  }
});

// ---------------------------------------------------------------------------
// POST /bookings/:id/check-out   CHECKED_IN -> COMPLETED (+ room CLEANING)
// ---------------------------------------------------------------------------

app.post('/:id/check-out', async (c) => {
  const parseResult = uuidParam.safeParse(c.req.param('id'));
  if (!parseResult.success) return c.json({ error: 'Invalid booking id' }, 400);
  const id = parseResult.data;

  try {
    const updated = await db.transaction(async (tx) => {
      const booking = await tx
        .select()
        .from(bookings)
        .where(eq(bookings.id, id))
        .limit(1);

      if (booking.length === 0) throw new NotFoundError('Booking not found');

      assertTransition(booking[0].status, 'COMPLETED');

      const [updatedBooking] = await tx
        .update(bookings)
        .set({ status: 'COMPLETED', updatedAt: new Date() })
        .where(eq(bookings.id, id))
        .returning();

      await tx
        .update(rooms)
        .set({ status: 'CLEANING', updatedAt: new Date() })
        .where(eq(rooms.id, booking[0].roomId));

      return updatedBooking;
    });

    return c.json(updated);
  } catch (err) {
    return handleTransitionError(c, err);
  }
});

// ---------------------------------------------------------------------------
// POST /bookings/:id/cancel   BOOKED -> CANCELLED
// ---------------------------------------------------------------------------

app.post('/:id/cancel', async (c) => {
  const parseResult = uuidParam.safeParse(c.req.param('id'));
  if (!parseResult.success) return c.json({ error: 'Invalid booking id' }, 400);
  const id = parseResult.data;

  try {
    const booking = await loadBookingOrNull(id);
    if (!booking) return c.json({ error: 'Booking not found' }, 404);

    assertTransition(booking.status, 'CANCELLED');

    const [updated] = await db
      .update(bookings)
      .set({ status: 'CANCELLED', updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();

    return c.json(updated);
  } catch (err) {
    return handleTransitionError(c, err);
  }
});

// ---------------------------------------------------------------------------
// POST /bookings/:id/service-charges  — add a service charge
// ---------------------------------------------------------------------------

app.post('/:id/service-charges', validateJson(addServiceChargeSchema), async (c) => {
  const parseResult = uuidParam.safeParse(c.req.param('id'));
  if (!parseResult.success) return c.json({ error: 'Invalid booking id' }, 400);
  const id = parseResult.data;

  const input: AddServiceChargeInput = c.get('validated');

  const booking = await loadBookingOrNull(id);
  if (!booking) return c.json({ error: 'Booking not found' }, 404);
  if (booking.status === 'CANCELLED' || booking.status === 'COMPLETED') {
    return c.json(
      { error: `Cannot add charges to a ${booking.status} booking` },
      409,
    );
  }

  const [created] = await db
    .insert(serviceCharges)
    .values({
      bookingId: id,
      description: input.description,
      quantity: input.quantity,
      unitPrice: input.unitPrice.toString(),
      type: input.type,
    })
    .returning();

  return c.json(created, 201);
});

// ---------------------------------------------------------------------------
// POST /bookings/:id/payments  — record a payment
// ---------------------------------------------------------------------------

app.post('/:id/payments', validateJson(recordPaymentSchema), async (c) => {
  const parseResult = uuidParam.safeParse(c.req.param('id'));
  if (!parseResult.success) return c.json({ error: 'Invalid booking id' }, 400);
  const id = parseResult.data;

  const input: RecordPaymentInput = c.get('validated');

  const booking = await loadBookingOrNull(id);
  if (!booking) return c.json({ error: 'Booking not found' }, 404);
  if (booking.status === 'CANCELLED') {
    return c.json({ error: 'Cannot record payment on a cancelled booking' }, 409);
  }

  const [created] = await db
    .insert(payments)
    .values({
      bookingId: id,
      amount: input.amount.toString(),
      method: input.method,
      paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
    })
    .returning();

  return c.json(created, 201);
});

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

function handleTransitionError(c: Context, err: unknown) {
  if (err instanceof NotFoundError) {
    return c.json({ error: err.message }, 404);
  }
  if (err instanceof InvalidTransitionError) {
    return c.json(
      { error: err.message, from: err.from, to: err.to },
      409,
    );
  }
  throw err;
}

export default app;
