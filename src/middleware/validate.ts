import { createMiddleware } from 'hono/factory';
import type { ZodType, z } from 'zod';

/**
 * Zod JSON body validator middleware for Hono.
 *
 * Usage:
 *   app.post('/', validateJson(mySchema), (c) => {
 *     const data = c.get('validated'); // fully typed as z.infer<typeof mySchema>
 *   });
 */
export const validateJson = <T extends ZodType>(schema: T) =>
  createMiddleware<{ Variables: { validated: z.infer<T> } }>(async (c, next) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400);
    }

    const result = schema.safeParse(body);
    if (!result.success) {
      return c.json(
        { error: 'Validation failed', issues: result.error.issues },
        400,
      );
    }

    c.set('validated', result.data);
    await next();
  });
