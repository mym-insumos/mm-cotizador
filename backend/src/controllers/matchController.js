const prisma = require('../utils/prisma');
const escrowService = require('../services/escrowService');
const chessApiService = require('../services/chessApiService');
const antiCheatService = require('../services/antiCheatService');
const { getCommissionRate } = require('../utils/distributions');
const { emitMatchUpdate } = require('../services/socketService');

let io;
function setIO(ioInstance) { io = ioInstance; }

async function createMatch(req, res) {
  const { stakeAmount, timeControl, incrementSeconds = 0 } = req.body;
  const stake = Number(stakeAmount);

  const maxStake = getMaxStake(req.user.subscriptionTier);
  if (stake > maxStake) {
    return res.status(400).json({
      error: `Apuesta máxima para tu plan: $${maxStake}. Actualiza tu membresía para más.`,
    });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (Number(user.balance) < stake) {
    return res.status(400).json({ error: 'Saldo insuficiente. Recarga tu billetera.' });
  }

  const commissionRate = getCommissionRate(req.user.subscriptionTier);
  const match = await prisma.match.create({
    data: {
      player1Id:    req.user.id,
      stakeAmount:  stake,
      timeControl:  String(timeControl),
      incrementSeconds: Number(incrementSeconds),
      commissionRate,
      status: 'WAITING_DEPOSIT',
    },
    include: { player1: { select: { username: true, rating: true } } },
  });

  await escrowService.lockFundsForMatch(req.user.id, match.id, stake);

  const updated = await prisma.match.update({
    where: { id: match.id },
    data: { player1Deposited: true, status: 'READY' },
    include: {
      player1: { select: { username: true, rating: true } },
      player2: { select: { username: true, rating: true } },
    },
  });

  res.status(201).json(updated);
}

async function joinMatch(req, res) {
  const { id } = req.params;
  const match = await prisma.match.findUnique({ where: { id } });

  if (!match || match.status !== 'READY') {
    return res.status(404).json({ error: 'Partida no disponible' });
  }

  if (match.player1Id === req.user.id) {
    return res.status(400).json({ error: 'No puedes jugar contra ti mismo' });
  }

  if (match.player2Id) {
    return res.status(409).json({ error: 'La partida ya tiene dos jugadores' });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (Number(user.balance) < Number(match.stakeAmount)) {
    return res.status(400).json({ error: 'Saldo insuficiente' });
  }

  await escrowService.lockFundsForMatch(req.user.id, match.id, Number(match.stakeAmount));

  const updated = await prisma.match.update({
    where: { id },
    data: {
      player2Id:       req.user.id,
      player2Deposited: true,
      totalPool:       Number(match.stakeAmount) * 2,
      status:          'ACTIVE',
      startedAt:       new Date(),
    },
    include: {
      player1: { select: { username: true, rating: true, lichessUsername: true } },
      player2: { select: { username: true, rating: true, lichessUsername: true } },
    },
  });

  if (io) emitMatchUpdate(io, id, { event: 'MATCH_STARTED', match: updated });

  res.json(updated);
}

async function settleMatch(req, res) {
  const { id } = req.params;
  const { chessGameId, provider = 'lichess' } = req.body;

  const match = await prisma.match.findUnique({
    where: { id },
    include: { player1: true, player2: true },
  });

  if (!match || match.status !== 'ACTIVE') {
    return res.status(400).json({ error: 'Partida no activa' });
  }

  if (match.player1Id !== req.user.id && match.player2Id !== req.user.id) {
    return res.status(403).json({ error: 'No eres parte de esta partida' });
  }

  const gameResult = await chessApiService.getGameResult(chessGameId);

  const valid = await chessApiService.verifyGamePlayers(
    chessGameId,
    match.player1.lichessUsername,
    match.player2?.lichessUsername
  );

  if (!valid.valid) {
    return res.status(400).json({ error: 'Los jugadores de la partida no coinciden con los registrados' });
  }

  await prisma.match.update({
    where: { id },
    data: { chessGameId, chessGameUrl: `https://lichess.org/${chessGameId}`, chessProvider: provider },
  });

  const p1Color = valid.game.players.white?.user?.name?.toLowerCase() === match.player1.lichessUsername?.toLowerCase()
    ? 'white' : 'black';
  const p2Color = p1Color === 'white' ? 'black' : 'white';

  antiCheatService.analyzeGame(id, chessGameId, match.player1Id, p1Color).catch(() => {});
  antiCheatService.analyzeGame(id, chessGameId, match.player2Id, p2Color).catch(() => {});

  let settledMatch;
  if (gameResult.status === 'draw') {
    await escrowService.refundDraw(id);
    settledMatch = await prisma.match.findUnique({ where: { id } });
  } else if (gameResult.winner) {
    const winnerColor = gameResult.winner;
    const winnerId = winnerColor === p1Color ? match.player1Id : match.player2Id;
    await escrowService.releaseToWinner(id, winnerId, Number(match.commissionRate));
    settledMatch = await prisma.match.findUnique({ where: { id } });
  } else {
    return res.status(400).json({ error: 'Resultado de partida no determinado' });
  }

  if (io) emitMatchUpdate(io, id, { event: 'MATCH_SETTLED', match: settledMatch });
  res.json(settledMatch);
}

async function cancelMatch(req, res) {
  const { id } = req.params;
  const match = await prisma.match.findUnique({ where: { id } });

  if (!match) return res.status(404).json({ error: 'Partida no encontrada' });
  if (match.player1Id !== req.user.id && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Sin permiso para cancelar esta partida' });
  }
  if (!['WAITING_DEPOSIT', 'READY'].includes(match.status)) {
    return res.status(400).json({ error: 'Solo se pueden cancelar partidas no iniciadas' });
  }

  await escrowService.refundCancelled(id);
  res.json({ message: 'Partida cancelada y fondos devueltos' });
}

async function getMatch(req, res) {
  const match = await prisma.match.findUnique({
    where: { id: req.params.id },
    include: {
      player1:        { select: { username: true, rating: true } },
      player2:        { select: { username: true, rating: true } },
      winner:         { select: { username: true } },
      antiCheatResult: { select: { flagged: true, engineCorrelation: true, userId: true } },
    },
  });

  if (!match) return res.status(404).json({ error: 'Partida no encontrada' });
  res.json(match);
}

async function listOpenMatches(req, res) {
  const { page = 1, limit = 20 } = req.query;
  const matches = await prisma.match.findMany({
    where: { status: 'READY', player2Id: null, isPublic: true },
    include: { player1: { select: { username: true, rating: true } } },
    orderBy: { createdAt: 'desc' },
    skip: (Number(page) - 1) * Number(limit),
    take: Number(limit),
  });
  res.json(matches);
}

async function getMyMatches(req, res) {
  const { page = 1, limit = 20, status } = req.query;
  const where = {
    OR: [{ player1Id: req.user.id }, { player2Id: req.user.id }],
    ...(status && { status }),
  };

  const [matches, total] = await Promise.all([
    prisma.match.findMany({
      where,
      include: {
        player1: { select: { username: true, rating: true } },
        player2: { select: { username: true, rating: true } },
        winner:  { select: { username: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.match.count({ where }),
  ]);

  res.json({ matches, total, page: Number(page), limit: Number(limit) });
}

async function disputeMatch(req, res) {
  const { id } = req.params;
  const { reason } = req.body;
  const match = await prisma.match.findUnique({ where: { id } });

  if (!match || match.status !== 'ACTIVE') {
    return res.status(400).json({ error: 'La partida no está activa' });
  }

  if (match.player1Id !== req.user.id && match.player2Id !== req.user.id) {
    return res.status(403).json({ error: 'No eres parte de esta partida' });
  }

  const updated = await prisma.match.update({
    where: { id },
    data: { status: 'DISPUTED', disputeReason: reason },
  });

  res.json(updated);
}

function getMaxStake(tier) {
  const limits = {
    FREE:        Number(process.env.FREE_TIER_MAX_STAKE) || 10,
    PREMIUM:     Number(process.env.PREMIUM_MAX_STAKE) || 500,
    HIGH_STAKES: Number(process.env.HIGH_STAKES_MAX_STAKE) || 5000,
  };
  return limits[tier] ?? limits.FREE;
}

module.exports = {
  setIO, createMatch, joinMatch, settleMatch, cancelMatch,
  getMatch, listOpenMatches, getMyMatches, disputeMatch,
};
