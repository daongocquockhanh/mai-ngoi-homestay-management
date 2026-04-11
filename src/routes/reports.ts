import { Hono } from 'hono';
import { and, gte, lt, ne, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { bookings } from '../db/schema/index.js';

const app = new Hono();

/** Parse "YYYY-MM" into { from: "YYYY-MM-01", to: "YYYY-(M+1)-01" }. */
function parseMonth(ym: string): { from: string; to: string } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  if (m < 1 || m > 12) return null;
  const from = `${match[1]}-${match[2]}-01`;
  const nextY = m === 12 ? y + 1 : y;
  const nextM = m === 12 ? 1 : m + 1;
  const to = `${nextY}-${String(nextM).padStart(2, '0')}-01`;
  return { from, to };
}

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

// ---------------------------------------------------------------------------
// GET /reports/monthly/:month/bookings  — bookings whose check-in falls in
// the given YYYY-MM (non-cancelled). Mirrors /reports/monthly grouping so the
// drill-down matches the aggregate exactly.
// ---------------------------------------------------------------------------

app.get('/monthly/:month/bookings', async (c) => {
  const range = parseMonth(c.req.param('month'));
  if (!range) return c.json({ error: 'Invalid month format, expected YYYY-MM' }, 400);

  const rows = await db.query.bookings.findMany({
    where: and(
      gte(bookings.checkIn, range.from),
      lt(bookings.checkIn, range.to),
      ne(bookings.status, 'CANCELLED'),
    ),
    with: { room: true, serviceCharges: true },
    orderBy: [desc(bookings.checkIn)],
  });

  return c.json(rows);
});

export default app;
