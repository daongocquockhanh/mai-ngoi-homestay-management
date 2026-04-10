import { pgEnum } from 'drizzle-orm/pg-core';

export const roomStatusEnum = pgEnum('room_status', [
  'AVAILABLE',
  'OCCUPIED',
  'CLEANING',
  'MAINTENANCE',
]);

export const bookingStatusEnum = pgEnum('booking_status', [
  'BOOKED',
  'CHECKED_IN',
  'COMPLETED',
  'CANCELLED',
]);

export const paymentMethodEnum = pgEnum('payment_method', [
  'CASH',
  'BANK_TRANSFER',
  'CREDIT_CARD',
]);

export const serviceChargeTypeEnum = pgEnum('service_charge_type', [
  'FOOD',
  'DAMAGE',
  'OTHER',
]);
