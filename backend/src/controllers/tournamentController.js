const prisma = require('../utils/prisma');
const tournamentService = require('../services/tournamentService');
const { emitTournamentUpdate } = require('../services/socketService');

let io;
function setIO(ioInstance) { io = ioInstance; }

async function createTournament(req, res) {
  const {
    name, description, format = 'SWISS', timeControl, incrementSeconds = 0,
    entryFee, commissionRate = 0.10, maxPlayers, minPlayers = 4, rounds = 7,
    distributionConfig, minRating, maxRating, requiresKYC = true,
    requiresPremium = false, startDate,
  } = req.body;

  const tournament = await prisma.tournament.create({
    data: {
      name, description, format, timeControl, incrementSeconds,
      entryFee:          Number(entryFee),
      commissionRate:    Number(commissionRate),
      maxPlayers:        Number(maxPlayers),
      minPlayers:        Number(minPlayers),
      rounds:            Number(rounds),
      distributionConfig: distributionConfig || { percentages: [0.5, 0.3, 0.2] },
      minRating, maxRating, requiresKYC, requiresPremium,
      startDate: new Date(startDate),
    },
  });

  res.status(201).json(tournament);
}

async function listTournaments(req, res) {
  const { status, page = 1, limit = 20 } = req.query;
  const where = status ? { status } : {};

  const [tournaments, total] = await Promise.all([
    prisma.tournament.findMany({
      where,
      orderBy: { startDate: 'asc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.tournament.count({ where }),
  ]);

  res.json({ tournaments, total });
}

async function getTournament(req, res) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: req.params.id },
    include: {
      participants: {
        include: { user: { select: { username: true, rating: true } } },
        orderBy: { points: 'desc' },
      },
    },
  });

  if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });
  res.json(tournament);
}

async function registerForTournament(req, res) {
  const { id } = req.params;
  const tournament = await prisma.tournament.findUnique({ where: { id } });

  if (!tournament) return res.status(404).json({ error: 'Torneo no encontrado' });

  if (tournament.requiresKYC && req.user.kycStatus !== 'VERIFIED') {
    return res.status(403).json({ error: 'Este torneo requiere verificación KYC' });
  }

  if (tournament.requiresPremium && req.user.subscriptionTier === 'FREE') {
    return res.status(403).json({ error: 'Este torneo requiere membresía Premium' });
  }

  await tournamentService.registerPlayer(id, req.user.id);

  if (io) emitTournamentUpdate(io, id, { event: 'PLAYER_REGISTERED', playerId: req.user.id });

  res.json({ message: 'Inscripción exitosa' });
}

async function getStandings(req, res) {
  const standings = await prisma.tournamentParticipant.findMany({
    where: { tournamentId: req.params.id },
    include: { user: { select: { username: true, rating: true } } },
    orderBy: [{ points: 'desc' }, { wins: 'desc' }],
  });
  res.json(standings);
}

async function startTournament(req, res) {
  const matches = await tournamentService.startTournament(req.params.id);
  if (io) emitTournamentUpdate(io, req.params.id, { event: 'TOURNAMENT_STARTED', matches });
  res.json({ message: 'Torneo iniciado', matches });
}

async function nextRound(req, res) {
  const { id } = req.params;
  const tournament = await prisma.tournament.findUnique({ where: { id } });

  if (!tournament || tournament.status !== 'IN_PROGRESS') {
    return res.status(400).json({ error: 'El torneo no está en progreso' });
  }

  if (tournament.currentRound >= tournament.rounds) {
    const standings = await tournamentService.closeTournament(id);
    if (io) emitTournamentUpdate(io, id, { event: 'TOURNAMENT_FINISHED', standings });
    return res.json({ message: 'Torneo finalizado', standings });
  }

  const nextRoundNum = tournament.currentRound + 1;
  await prisma.tournament.update({ where: { id }, data: { currentRound: nextRoundNum } });
  const matches = await tournamentService.generateRoundMatches(id, nextRoundNum);

  if (io) emitTournamentUpdate(io, id, { event: 'ROUND_STARTED', round: nextRoundNum, matches });
  res.json({ round: nextRoundNum, matches });
}

module.exports = {
  setIO, createTournament, listTournaments, getTournament,
  registerForTournament, getStandings, startTournament, nextRound,
};
