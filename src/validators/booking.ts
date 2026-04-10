import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

const uuidSchema = z.string().uuid('Must be a valid UUID');

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

const phoneSchema = z
  .string()
  .trim()
  .min(6, 'Phone number is too short')
  .max(20, 'Phone number is too long');

const moneySchema = z
  .number()
  .finite()
  .nonnegative('Amount must be zero or positive');

// ---------------------------------------------------------------------------
// createBookingSchema
// ---------------------------------------------------------------------------

export const createBookingSchema = z
  .object({
    roomId: uuidSchema,
    guestName: z.string().trim().min(1, 'Guest name is required').max(200),
    phone: phoneSchema,
    checkIn: isoDateSchema,
    checkOut: isoDateSchema,
    totalRoomPrice: moneySchema,
    notes: z.string().trim().max(1000).optional(),
  })
  .refine((data) => new Date(data.checkOut) > new Date(data.checkIn), {
    message: 'checkOut must be after checkIn',
    path: ['checkOut'],
  });

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

// ---------------------------------------------------------------------------
// addServiceChargeSchema
// ---------------------------------------------------------------------------

export const addServiceChargeSchema = z.object({
  description: z.string().trim().min(1, 'Description is required').max(255),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  unitPrice: moneySchema,
  type: z.enum(['FOOD', 'DAMAGE', 'OTHER']),
});

export type AddServiceChargeInput = z.infer<typeof addServiceChargeSchema>;

// ---------------------------------------------------------------------------
// recordPaymentSchema
// ---------------------------------------------------------------------------

export const recordPaymentSchema = z.object({
  amount: z.number().finite().positive('Amount must be greater than zero'),
  method: z.enum(['CASH', 'BANK_TRANSFER', 'CREDIT_CARD']),
  paidAt: z.string().datetime({ offset: true }).optional(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
