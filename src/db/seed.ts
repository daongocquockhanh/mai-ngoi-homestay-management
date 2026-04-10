import 'dotenv/config';
import { db } from './index.js';
import { rooms } from './schema/index.js';

/**
 * Seed the 4 fixed rooms. Idempotent — safe to run multiple times.
 */
const ROOM_NAMES = ['Bạch Yến', 'Như Ý', 'Đông Ba', 'An Cựu'] as const;

async function seed(): Promise<void> {
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

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
