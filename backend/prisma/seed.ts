import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial database data...');

  // Create demo user for local test & verification without live Google OAuth if needed
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@reachinbox.ai' },
    update: {},
    create: {
      id: '11111111-1111-4111-a111-111111111111',
      googleId: 'google-demo-12345',
      name: 'ReachInbox Demo User',
      email: 'demo@reachinbox.ai',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
  });

  // Create default sender for the demo user
  const demoSender = await prisma.sender.upsert({
    where: { id: '22222222-2222-4222-a222-222222222222' },
    update: {},
    create: {
      id: '22222222-2222-4222-a222-222222222222',
      userId: demoUser.id,
      email: 'alex.sales@reachinbox.ai',
      smtpUser: process.env.ETHEREAL_USER || '',
      smtpPassword: process.env.ETHEREAL_PASSWORD || '',
    },
  });

  console.log(`Seeded User: ${demoUser.email} (${demoUser.id})`);
  console.log(`Seeded Sender: ${demoSender.email} (${demoSender.id})`);

}

main()
  .catch((e) => {
    console.error('Prisma seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
