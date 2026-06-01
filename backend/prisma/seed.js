const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash('Admin1234!', 12);
  const playerHash = await bcrypt.hash('Player1234!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@chessstake.com' },
    update: {},
    create: {
      email:        'admin@chessstake.com',
      username:     'admin',
      passwordHash: adminHash,
      role:         'ADMIN',
      kycStatus:    'VERIFIED',
      subscriptionTier: 'HIGH_STAKES',
      balance:      0,
    },
  });

  const player1 = await prisma.user.upsert({
    where: { email: 'magnus@chessstake.com' },
    update: {},
    create: {
      email:            'magnus@chessstake.com',
      username:         'Magnus_Test',
      passwordHash:     playerHash,
      kycStatus:        'VERIFIED',
      subscriptionTier: 'PREMIUM',
      balance:          100,
      rating:           2800,
      lichessUsername:  'DrNykterstein',
    },
  });

  const player2 = await prisma.user.upsert({
    where: { email: 'hikaru@chessstake.com' },
    update: {},
    create: {
      email:            'hikaru@chessstake.com',
      username:         'Hikaru_Test',
      passwordHash:     playerHash,
      kycStatus:        'VERIFIED',
      subscriptionTier: 'PREMIUM',
      balance:          100,
      rating:           2750,
      lichessUsername:  'nihalsarin',
    },
  });

  await prisma.tournament.upsert({
    where: { id: 'seed-tournament-001' },
    update: {},
    create: {
      id:          'seed-tournament-001',
      name:        'Copa ChessStake Abril 2025',
      description: 'Torneo inaugural de la plataforma. Sistema Suizo, 7 rondas.',
      format:      'SWISS',
      timeControl: '5',
      incrementSeconds: 3,
      entryFee:    10,
      commissionRate: 0.10,
      maxPlayers:  32,
      minPlayers:  4,
      rounds:      7,
      requiresKYC: true,
      distributionConfig: { percentages: [0.50, 0.30, 0.20] },
      startDate:   new Date('2025-04-15T18:00:00Z'),
    },
  });

  console.log('Seed completado:');
  console.log('  Admin:   admin@chessstake.com / Admin1234!');
  console.log('  Player1: magnus@chessstake.com / Player1234!');
  console.log('  Player2: hikaru@chessstake.com / Player1234!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
