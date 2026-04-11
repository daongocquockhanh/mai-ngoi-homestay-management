import { Hono } from 'hono';
import { eq, and, gt, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { rooms, bookings } from '../db/schema/index.js';

const app = new Hono();

/**
 * Returns YYYY-MM-DD for the server's local date (not UTC).
 * Using 'sv-SE' locale because it formats as ISO-style YYYY-MM-DD natively.
 */
function todayLocal(): string {
  return new Date().toLocaleDateString('sv-SE');
}

// ---------------------------------------------------------------------------
// GET /dashboard/today  — operational snapshot
//
// Returns:
//   rooms       — all rooms with current status
//   arrivals    — BOOKED bookings with checkIn = today
//   departures  — CHECKED_IN bookings with checkOut = today
//   inHouse     — all CHECKED_IN bookings
//   upcoming    — all BOOKED bookings with checkIn > today (future arrivals)
//   stats       — summary counts
// ---------------------------------------------------------------------------

app.get('/today', async (c) => {
  const today = todayLocal();

  const [allRooms, arrivals, departures, inHouse, upcoming] = await Promise.all([
    db.select().from(rooms).orderBy(rooms.name),

    // Today's arrivals
    db.query.bookings.findMany({
      where: and(
        eq(bookings.checkIn, today),
        eq(bookings.status, 'BOOKED'),
      ),
      with: { room: true },
    }),

    // Today's departures
    db.query.bookings.findMany({
      where: and(
        eq(bookings.checkOut, today),
        inArray(bookings.status, ['CHECKED_IN', 'BOOKED']),
      ),
      with: { room: true },
    }),

    // Currently in house
    db.query.bookings.findMany({
      where: eq(bookings.status, 'CHECKED_IN'),
      with: { room: true },
    }),

    // Upcoming: all future BOOKED bookings (checkIn > today)
    db.query.bookings.findMany({
      where: and(
        eq(bookings.status, 'BOOKED'),
        gt(bookings.checkIn, today),
      ),
      with: { room: true },
      orderBy: (b, { asc }) => [asc(b.checkIn)],
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
    upcomingCount: upcoming.length,
  };

  return c.json({ stats, rooms: allRooms, arrivals, departures, inHouse, upcoming });
});

export default app;
