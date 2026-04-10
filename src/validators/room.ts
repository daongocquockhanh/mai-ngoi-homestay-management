import { z } from 'zod';

export const updateRoomStatusSchema = z.object({
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'CLEANING', 'MAINTENANCE']),
});

export type UpdateRoomStatusInput = z.infer<typeof updateRoomStatusSchema>;

export const availabilityQuerySchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
}).refine((data) => new Date(data.checkOut) > new Date(data.checkIn), {
  message: 'checkOut must be after checkIn',
  path: ['checkOut'],
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
