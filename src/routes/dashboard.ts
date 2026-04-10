import { Hono } from 'hono';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { rooms, bookings } from '../db/schema/index.js';

const app = new Hono();

// ---------------------------------------------------------------------------
// GET /dashboard/today  — operational snapshot for the day
//
// Returns:
//   rooms       — all rooms with current status
//   arrivals    — bookings with checkIn = today (BOOKED status)
//   departures  — bookings with checkOut = today (CHECKED_IN status)
//   inHouse     — bookings currently CHECKED_IN
//   stats       — summary counts
// ---------------------------------------------------------------------------

app.get('/today', async (c) => {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const [allRooms, arrivals, departures, inHouse] = await Promise.all([
    // All rooms
    db.select().from(rooms).orderBy(rooms.name),

    // Today's arrivals: booked guests arriving today
    db.query.bookings.findMany({
      where: and(
        eq(bookings.checkIn, today),
        eq(bookings.status, 'BOOKED'),
      ),
      with: { room: true },
    }),

    // Today's departures: checked-in guests leaving today
    db.query.bookings.findMany({
      where: and(
        eq(bookings.checkOut, today),
        eq(bookings.status, 'CHECKED_IN'),
      ),
      with: { room: true },
    }),

    // Currently in house
    db.query.bookings.findMany({
      where: eq(bookings.status, 'CHECKED_IN'),
      with: { room: true },
    }),
  ]);

  const stats = {
    totalRooms: allRooms.length,
    available: allRooms.filter((r) => r.status === 'AVAILABLE').length,
    occupied: allRooms.filter((r) => r.status === 'OCCUPIED').length,
    cleaning: allRooms.filter((r) => r.status === 'CLEANING').length,
    maintenance: allRooms.filter((r) => r.status === 'MAINTENANCE').length,
    arrivalsToday: arrivals.length,
    departuresToday: departures.length,
    inHouseGuests: inHouse.length,
  };

  return c.json({ stats, rooms: allRooms, arrivals, departures, inHouse });
});

export default app;
