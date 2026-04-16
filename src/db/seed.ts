import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db } from './index.js';
import { rooms, users } from './schema/index.js';

/**
 * Seed rooms + owner account. Idempotent — safe to run multiple times.
 */
const ROOM_NAMES = ['Bạch Yến', 'Như Ý', 'Đông Ba', 'An Cựu'] as const;

async function seed(): Promise<void> {
  // Seed rooms
  console.log('Seeding rooms...');
  await db
    .insert(rooms)
    .values(ROOM_NAMES.map((name) => ({ name })))
    .onConflictDoNothing({ target: rooms.name });

  const allRooms = await db.select().from(rooms);
  console.log(`Rooms in database (${allRooms.length}):`);
  for (const room of allRooms) {
    console.log(`  - ${room.name} [${room.status}] (${room.id})`);
  }

  // Seed owner account
  const username = process.env.OWNER_USERNAME || 'owner';
  const password = process.env.OWNER_PASSWORD || 'maingoi2024';
  const hash = await bcrypt.hash(password, 10);

  await db
    .insert(users)
    .values({ username, passwordHash: hash })
    .onConflictDoUpdate({
      target: users.username,
      set: { passwordHash: hash, updatedAt: new Date() },
    });

  console.log(`Owner account seeded: username="${username}"`);

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
