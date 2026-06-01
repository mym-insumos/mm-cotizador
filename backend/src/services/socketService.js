const prisma = require('../utils/prisma');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');

const DISCONNECT_TIMEOUT = Number(process.env.DISCONNECT_TIMEOUT_SECONDS || 60) * 1000;
const disconnectTimers = new Map();

function initSocketHandlers(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Autenticación requerida'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = payload.sub;
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    logger.debug('Socket conectado', { userId: socket.userId, socketId: socket.id });

    socket.on('join_match', async ({ matchId }) => {
      const match = await prisma.match.findUnique({ where: { id: matchId } });
      if (!match) return;

      const isPlayer = match.player1Id === socket.userId || match.player2Id === socket.userId;
      if (!isPlayer) return;

      socket.join(`match:${matchId}`);

      if (disconnectTimers.has(`${matchId}:${socket.userId}`)) {
        clearTimeout(disconnectTimers.get(`${matchId}:${socket.userId}`));
        disconnectTimers.delete(`${matchId}:${socket.userId}`);
        io.to(`match:${matchId}`).emit('player_reconnected', { userId: socket.userId });
        logger.info('Jugador reconectado', { matchId, userId: socket.userId });
      }

      await prisma.match.update({
        where: { id: matchId },
        data: { lastPingAt: new Date() },
      });
    });

    socket.on('leave_match', ({ matchId }) => {
      socket.leave(`match:${matchId}`);
    });

    socket.on('ping_match', async ({ matchId }) => {
      await prisma.match.update({
        where: { id: matchId },
        data: { lastPingAt: new Date() },
      }).catch(() => {});
    });

    socket.on('join_tournament', ({ tournamentId }) => {
      socket.join(`tournament:${tournamentId}`);
    });

    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (!room.startsWith('match:')) continue;
        const matchId = room.replace('match:', '');
        handlePlayerDisconnect(io, socket.userId, matchId);
      }
    });

    socket.on('disconnect', () => {
      logger.debug('Socket desconectado', { userId: socket.userId });
    });
  });
}

async function handlePlayerDisconnect(io, userId, matchId) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.status !== 'ACTIVE') return;

  io.to(`match:${matchId}`).emit('player_disconnected', {
    userId,
    timeoutSeconds: DISCONNECT_TIMEOUT / 1000,
  });

  logger.info('Iniciando timer de desconexión', { matchId, userId });

  const timerId = setTimeout(async () => {
    const current = await prisma.match.findUnique({ where: { id: matchId } });
    if (current?.status !== 'ACTIVE') return;

    const winnerId = match.player1Id === userId ? match.player2Id : match.player1Id;
    if (!winnerId) return;

    const { releaseToWinner } = require('./escrowService');
    await releaseToWinner(matchId, winnerId, Number(match.commissionRate));

    io.to(`match:${matchId}`).emit('match_ended', {
      reason:   'DISCONNECT_FORFEIT',
      winnerId,
      matchId,
    });

    logger.info('Partida terminada por desconexión', { matchId, winnerId });
  }, DISCONNECT_TIMEOUT);

  disconnectTimers.set(`${matchId}:${userId}`, timerId);
}

function emitMatchUpdate(io, matchId, data) {
  io.to(`match:${matchId}`).emit('match_update', data);
}

function emitTournamentUpdate(io, tournamentId, data) {
  io.to(`tournament:${tournamentId}`).emit('tournament_update', data);
}

module.exports = { initSocketHandlers, emitMatchUpdate, emitTournamentUpdate };
