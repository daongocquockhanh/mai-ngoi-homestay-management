import type { Booking } from '../db/schema/index.js';

/**
 * Booking state machine.
 *
 * Valid transitions:
 *   BOOKED      -> CHECKED_IN | CANCELLED
 *   CHECKED_IN  -> COMPLETED
 *   COMPLETED   -> (terminal)
 *   CANCELLED   -> (terminal)
 */

export type BookingStatus = Booking['status'];

export const BOOKING_TRANSITIONS: Readonly<Record<BookingStatus, ReadonlyArray<BookingStatus>>> = {
  BOOKED: ['CHECKED_IN', 'CANCELLED'],
  CHECKED_IN: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
} as const;

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return BOOKING_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}

export class InvalidTransitionError extends Error {
  constructor(
    public readonly from: BookingStatus,
    public readonly to: BookingStatus,
  ) {
    super(`Invalid booking status transition: ${from} -> ${to}`);
    this.name = 'InvalidTransitionError';
  }
}
