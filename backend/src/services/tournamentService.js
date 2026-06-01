const prisma = require('../utils/prisma');
const logger = require('../utils/logger');
const { generateSwissPairings, rankParticipants, distributePrizes } = require('../utils/distributions');
const escrowService = require('./escrowService');

async function registerPlayer(tournamentId, userId) {
  return prisma.$transaction(async (tx) => {
    const tournament = await tx.tournament.findUnique({ where: { id: tournamentId } });

    if (!tournament || tournament.status !== 'REGISTRATION') {
      throw new Error('El torneo no está en fase de inscripción');
    }

    if (tournament.currentPlayers >= tournament.maxPlayers) {
      throw new Error('El torneo está completo');
    }

    const existing = await tx.tournamentParticipant.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    if (existing) throw new Error('Ya estás inscripto en este torneo');

    const user = await tx.user.findUnique({ where: { id: userId } });
    const fee = Number(tournament.entryFee);

    if (Number(user.balance) < fee) {
      throw new Error('Saldo insuficiente para la cuota de inscripción');
    }

    await tx.user.update({
      where: { id: userId },
      data: { balance: { decrement: fee } },
    });

    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        currentPlayers: { increment: 1 },
        prizePool: { increment: fee * (1 - Number(tournament.commissionRate)) },
      },
    });

    await tx.tournamentParticipant.create({
      data: { tournamentId, userId },
    });

    await tx.transaction.create({
      data: {
        userId,
        tournamentId,
        type:        'TOURNAMENT_FEE',
        amount:      fee,
        status:      'COMPLETED',
        description: `Inscripción torneo: ${tournament.name}`,
      },
    });

    logger.info('Jugador inscripto en torneo', { tournamentId, userId, fee });
  });
}

async function startTournament(tournamentId) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { participants: true },
  });

  if (tournament.currentPlayers < tournament.minPlayers) {
    throw new Error(`Se necesitan al menos ${tournament.minPlayers} jugadores`);
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: 'IN_PROGRESS', currentRound: 1 },
  });

  return generateRoundMatches(tournamentId, 1);
}

async function generateRoundMatches(tournamentId, round) {
  const participants = await prisma.tournamentParticipant.findMany({
    where: { tournamentId, disqualified: false },
    include: { user: true },
  });

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });

  const enriched = await Promise.all(participants.map(async (p) => {
    const played = await prisma.match.findMany({
      where: { tournamentId, OR: [{ player1Id: p.userId }, { player2Id: p.userId }] },
      select: { player1Id: true, player2Id: true },
    });
    const opponents = played.map(m => m.player1Id === p.userId ? m.player2Id : m.player1Id);
    return { ...p, opponents };
  }));

  const pairs = generateSwissPairings(enriched);

  const matches = await Promise.all(
    pairs.map(([p1, p2]) =>
      prisma.match.create({
        data: {
          player1Id:    p1.userId,
          player2Id:    p2.userId,
          tournamentId,
          stakeAmount:  0,
          timeControl:  tournament.timeControl,
          status:       'READY',
          commissionRate: 0,
        },
      })
    )
  );

  logger.info('Ronda generada', { tournamentId, round, pairCount: pairs.length });
  return matches;
}

async function recordMatchResult(matchId, winnerId) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match?.tournamentId) return;

  if (winnerId) {
    const loserId = match.player1Id === winnerId ? match.player2Id : match.player1Id;
    await prisma.tournamentParticipant.update({
      where: { tournamentId_userId: { tournamentId: match.tournamentId, userId: winnerId } },
      data: { points: { increment: 1 }, wins: { increment: 1 } },
    });
    await prisma.tournamentParticipant.update({
      where: { tournamentId_userId: { tournamentId: match.tournamentId, userId: loserId } },
      data: { losses: { increment: 1 } },
    });
  } else {
    for (const userId of [match.player1Id, match.player2Id]) {
      if (!userId) continue;
      await prisma.tournamentParticipant.update({
        where: { tournamentId_userId: { tournamentId: match.tournamentId, userId } },
        data: { points: { increment: 0.5 }, draws: { increment: 1 } },
      });
    }
  }
}

async function closeTournament(tournamentId) {
  return prisma.$transaction(async (tx) => {
    const tournament = await tx.tournament.findUnique({
      where: { id: tournamentId },
      include: { participants: { include: { user: true } } },
    });

    const ranked = rankParticipants(tournament.participants);
    const prizes = distributePrizes(
      Number(tournament.prizePool),
      tournament.distributionConfig,
      ranked.length
    );

    for (const [idx, participant] of ranked.entries()) {
      const prize = prizes[idx] || 0;
      await tx.tournamentParticipant.update({
        where: { id: participant.id },
        data: { standing: idx + 1, prizeWon: prize },
      });

      if (prize > 0) {
        await tx.user.update({
          where: { id: participant.userId },
          data: {
            balance:       { increment: prize },
            totalEarnings: { increment: prize },
          },
        });

        await tx.transaction.create({
          data: {
            userId:      participant.userId,
            tournamentId,
            type:        'TOURNAMENT_PRIZE',
            amount:      prize,
            status:      'COMPLETED',
            description: `Premio ${idx + 1}° lugar — ${tournament.name}`,
          },
        });
      }
    }

    await tx.tournament.update({
      where: { id: tournamentId },
      data: { status: 'COMPLETED', endDate: new Date() },
    });

    logger.info('Torneo cerrado y premios distribuidos', { tournamentId });
    return ranked;
  });
}

module.exports = { registerPlayer, startTournament, generateRoundMatches, recordMatchResult, closeTournament };
