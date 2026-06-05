import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.room.findFirst({
    where: { inviteCode: 'GLOBAL' },
  });
  if (existing) {
    console.log('Global room already exists');
    return;
  }

  await prisma.room.create({
    data: {
      name: '🌍 Global League',
      inviteCode: 'GLOBAL',
      createdById: await getOrCreateSystemUser(prisma),
    },
  });

  console.log('Global room created');
}

async function getOrCreateSystemUser(prisma: PrismaClient) {
  const existing = await prisma.user.findFirst({
    where: { email: 'system@fifawc26.app' },
  });
  if (existing) return existing.id;

  const user = await prisma.user.create({
    data: {
      googleId: 'system',
      email: 'system@fifawc26.app',
      displayName: 'System',
    },
  });
  return user.id;
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
