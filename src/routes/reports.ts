import { Hono } from 'hono';
import { and, gte, ne } from 'drizzle-orm';
import { db } from '../db/index.js';
import { bookings } from '../db/schema/index.js';

const app = new Hono();

/**
 * Returns YYYY-MM-DD for the server's local date.
 */
function todayLocal(): string {
  return new Date().toLocaleDateString('sv-SE');
}

/** Subtract N months from a YYYY-MM-DD string and return YYYY-MM-DD. */
function subMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() - months);
  return d.toLocaleDateString('sv-SE');
}

/** Whole days between two YYYY-MM-DD dates (checkOut - checkIn). */
function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

interface MonthlyRow {
  month: string;
  bookingCount: number;
  nightsSold: number;
  roomRevenue: number;
  serviceRevenue: number;
  totalRevenue: number;
}

// ---------------------------------------------------------------------------
// GET /reports/monthly  — revenue aggregated by check-in month (last 12 months)
//
// Groups non-cancelled bookings by YYYY-MM of check-in and sums:
//   - bookingCount   : number of bookings
//   - nightsSold     : total nights
//   - roomRevenue    : sum of totalRoomPrice
//   - serviceRevenue : sum of (quantity * unitPrice) from service charges
//   - totalRevenue   : room + service
// ---------------------------------------------------------------------------

app.get('/monthly', async (c) => {
  const cutoff = subMonths(todayLocal(), 12);

  const rows = await db.query.bookings.findMany({
    where: and(
      gte(bookings.checkIn, cutoff),
      ne(bookings.status, 'CANCELLED'),
    ),
    with: { serviceCharges: true },
  });

  const byMonth = new Map<string, MonthlyRow>();

  for (const b of rows) {
    const month = b.checkIn.slice(0, 7); // YYYY-MM
    if (!byMonth.has(month)) {
      byMonth.set(month, {
        month,
        bookingCount: 0,
        nightsSold: 0,
        roomRevenue: 0,
        serviceRevenue: 0,
        totalRevenue: 0,
      });
    }
    const row = byMonth.get(month)!;

    const serviceSum = b.serviceCharges.reduce(
      (sum, sc) => sum + sc.quantity * parseFloat(sc.unitPrice),
      0,
    );
    const roomSum = parseFloat(b.totalRoomPrice);

    row.bookingCount += 1;
    row.nightsSold += nightsBetween(b.checkIn, b.checkOut);
    row.roomRevenue += roomSum;
    row.serviceRevenue += serviceSum;
    row.totalRevenue += roomSum + serviceSum;
  }

  const result = Array.from(byMonth.values()).sort((a, b) =>
    b.month.localeCompare(a.month),
  );

  return c.json(result);
});

export default app;
