/**
 * Escrow Service — gestiona el ciclo de fondos retenidos para partidas y torneos.
 * Los fondos se bloquean en lockedBalance hasta que la partida se resuelve.
 */
const prisma = require('../utils/prisma');
const logger = require('../utils/logger');
const { calculateMatchPayout } = require('../utils/distributions');

async function lockFundsForMatch(userId, matchId, stakeAmount) {
  const amount = Number(stakeAmount);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });

    if (Number(user.balance) < amount) {
      throw new Error('Saldo insuficiente para realizar la apuesta');
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        balance:       { decrement: amount },
        lockedBalance: { increment: amount },
      },
    });

    await tx.transaction.create({
      data: {
        userId,
        matchId,
        type:        'MATCH_STAKE',
        amount,
        status:      'COMPLETED',
        description: `Depósito de apuesta para partida ${matchId}`,
      },
    });

    logger.info('Fondos bloqueados en escrow', { userId, matchId, amount });
  });
}

async function releaseToWinner(matchId, winnerId, commissionRate) {
  return prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({
      where: { id: matchId },
      include: { player1: true, player2: true },
    });

    if (!match || match.status === 'COMPLETED') {
      throw new Error('Partida no válida para liquidación');
    }

    const stakeAmount = Number(match.stakeAmount);
    const rate = commissionRate ?? Number(match.commissionRate);
    const payout = calculateMatchPayout(stakeAmount, rate, 'WIN');

    const loserId = match.player1Id === winnerId ? match.player2Id : match.player1Id;

    await tx.user.update({
      where: { id: winnerId },
      data: {
        lockedBalance: { decrement: stakeAmount },
        balance:       { increment: payout.winner },
        totalWins:     { increment: 1 },
        totalEarnings: { increment: payout.winner - stakeAmount },
      },
    });

    await tx.user.update({
      where: { id: loserId },
      data: {
        lockedBalance: { decrement: stakeAmount },
        totalLosses:   { increment: 1 },
      },
    });

    await tx.match.update({
      where: { id: matchId },
      data: {
        status:          'COMPLETED',
        winnerId,
        totalPool:       stakeAmount * 2,
        commissionAmount: payout.commission,
        payoutAmount:     payout.winner,
        completedAt:      new Date(),
      },
    });

    await tx.transaction.create({
      data: {
        userId:      winnerId,
        matchId,
        type:        'MATCH_WIN',
        amount:      payout.winner,
        status:      'COMPLETED',
        description: `Premio partida ${matchId} (comisión ${(rate * 100).toFixed(1)}%)`,
      },
    });

    await tx.transaction.create({
      data: {
        userId:      winnerId,
        matchId,
        type:        'COMMISSION',
        amount:      -payout.commission,
        status:      'COMPLETED',
        description: `Comisión plataforma partida ${matchId}`,
      },
    });

    logger.info('Fondos liberados al ganador', { matchId, winnerId, payout });
    return payout;
  });
}

async function refundDraw(matchId) {
  return prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({ where: { id: matchId } });
    if (!match) throw new Error('Partida no encontrada');

    const stake = Number(match.stakeAmount);
    const drawFee = stake * 0.02;
    const refund = stake - drawFee;

    for (const userId of [match.player1Id, match.player2Id]) {
      if (!userId) continue;
      await tx.user.update({
        where: { id: userId },
        data: {
          lockedBalance: { decrement: stake },
          balance:       { increment: refund },
          totalDraws:    { increment: 1 },
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          matchId,
          type:        'MATCH_REFUND',
          amount:      refund,
          status:      'COMPLETED',
          description: `Devolución por tablas (tarifa administrativa 2%)`,
        },
      });
    }

    await tx.match.update({
      where: { id: matchId },
      data: {
        status:          'COMPLETED',
        result:          'DRAW',
        commissionAmount: drawFee * 2,
        completedAt:      new Date(),
      },
    });

    logger.info('Fondos devueltos por tablas', { matchId });
  });
}

async function refundCancelled(matchId) {
  return prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({ where: { id: matchId } });
    if (!match) throw new Error('Partida no encontrada');

    const stake = Number(match.stakeAmount);
    const depositors = [];
    if (match.player1Deposited) depositors.push(match.player1Id);
    if (match.player2Deposited && match.player2Id) depositors.push(match.player2Id);

    for (const userId of depositors) {
      await tx.user.update({
        where: { id: userId },
        data: {
          lockedBalance: { decrement: stake },
          balance:       { increment: stake },
        },
      });

      await tx.transaction.create({
        data: {
          userId,
          matchId,
          type:        'MATCH_REFUND',
          amount:      stake,
          status:      'COMPLETED',
          description: `Devolución por cancelación de partida`,
        },
      });
    }

    await tx.match.update({
      where: { id: matchId },
      data: { status: 'CANCELLED', completedAt: new Date() },
    });

    logger.info('Fondos devueltos por cancelación', { matchId });
  });
}

module.exports = { lockFundsForMatch, releaseToWinner, refundDraw, refundCancelled };
