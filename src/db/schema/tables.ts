import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  date,
  timestamp,
  check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import {
  roomStatusEnum,
  bookingStatusEnum,
  paymentMethodEnum,
  serviceChargeTypeEnum,
} from './enums.js';

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
// Single-owner auth. Seeded, no registration.
// ---------------------------------------------------------------------------

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// ---------------------------------------------------------------------------
// rooms
// ---------------------------------------------------------------------------
// Fixed inventory: Bạch Yến, Như Ý, Đông Ba, An Cựu (seeded, not enforced here).
// ---------------------------------------------------------------------------

export const rooms = pgTable(
  'rooms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    pricePerNight: numeric('price_per_night', { precision: 10, scale: 2 }).notNull().default('0'),
    status: roomStatusEnum('status').notNull().default('AVAILABLE'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check('chk_room_price_nonneg', sql`${table.pricePerNight} >= 0`)],
);

export const roomsRelations = relations(rooms, ({ many }) => ({
  bookings: many(bookings),
}));

// ---------------------------------------------------------------------------
// bookings
// ---------------------------------------------------------------------------
// Strictly 1 booking = 1 room. Guest info is embedded (no separate guests table).
// ---------------------------------------------------------------------------

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roomId: uuid('room_id').notNull().references(() => rooms.id),
    guestName: varchar('guest_name', { length: 200 }).notNull(),
    phone: varchar('phone', { length: 20 }).notNull(),
    checkIn: date('check_in').notNull(),
    checkOut: date('check_out').notNull(),
    totalRoomPrice: numeric('total_room_price', { precision: 12, scale: 2 }).notNull(),
    status: bookingStatusEnum('status').notNull().default('BOOKED'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('chk_booking_dates', sql`${table.checkOut} > ${table.checkIn}`),
    check('chk_total_room_price_nonneg', sql`${table.totalRoomPrice} >= 0`),
  ],
);

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  room: one(rooms, {
    fields: [bookings.roomId],
    references: [rooms.id],
  }),
  serviceCharges: many(serviceCharges),
  payments: many(payments),
}));

// ---------------------------------------------------------------------------
// service_charges
// ---------------------------------------------------------------------------
// Extras added during a stay: food, drinks, damage fees, laundry, etc.
// ---------------------------------------------------------------------------

export const serviceCharges = pgTable(
  'service_charges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    description: varchar('description', { length: 255 }).notNull(),
    quantity: integer('quantity').notNull().default(1),
    unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
    type: serviceChargeTypeEnum('type').notNull().default('OTHER'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('chk_quantity_positive', sql`${table.quantity} > 0`),
    check('chk_unit_price_nonneg', sql`${table.unitPrice} >= 0`),
  ],
);

export const serviceChargesRelations = relations(serviceCharges, ({ one }) => ({
  booking: one(bookings, {
    fields: [serviceCharges.bookingId],
    references: [bookings.id],
  }),
}));

// ---------------------------------------------------------------------------
// payments
// ---------------------------------------------------------------------------
// Minimal payment tracking: what was paid, how, when.
// ---------------------------------------------------------------------------

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    method: paymentMethodEnum('method').notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check('chk_amount_positive', sql`${table.amount} > 0`)],
);

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
}));

// ---------------------------------------------------------------------------
// Inferred types for application layer
// ---------------------------------------------------------------------------

export type Room = typeof rooms.$inferSelect;
export type NewRoom = typeof rooms.$inferInsert;

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

export type ServiceCharge = typeof serviceCharges.$inferSelect;
export type NewServiceCharge = typeof serviceCharges.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
