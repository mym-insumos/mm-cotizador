/**
 * Chess API Service — integración con Lichess para verificar partidas.
 * Documentación: https://lichess.org/api
 */
const axios = require('axios');
const logger = require('../utils/logger');

const lichess = axios.create({
  baseURL: process.env.LICHESS_API_URL || 'https://lichess.org/api',
  headers: {
    Authorization: `Bearer ${process.env.LICHESS_TOKEN}`,
    Accept: 'application/json',
  },
  timeout: 10000,
});

/**
 * Obtiene el resultado de una partida verificado por Lichess.
 * @returns {{ winner: 'white'|'black'|null, status: string, moves: string }}
 */
async function getGameResult(gameId) {
  try {
    const { data } = await lichess.get(`/game/export/${gameId}`, {
      params: { moves: true, clocks: false, opening: false },
      headers: { Accept: 'application/json' },
    });

    return {
      gameId:   data.id,
      status:   data.status,
      winner:   data.winner || null,
      players:  data.players,
      moves:    data.moves || '',
      pgn:      data.pgn || '',
    };
  } catch (err) {
    logger.error('Error obteniendo resultado de Lichess', { gameId, error: err.message });
    throw new Error(`No se pudo obtener la partida ${gameId} de Lichess`);
  }
}

/**
 * Verifica que los jugadores de la partida coincidan con los usuarios registrados.
 */
async function verifyGamePlayers(gameId, lichessUser1, lichessUser2) {
  const game = await getGameResult(gameId);
  const whiteName = game.players?.white?.user?.name?.toLowerCase();
  const blackName = game.players?.black?.user?.name?.toLowerCase();

  const user1Lower = lichessUser1?.toLowerCase();
  const user2Lower = lichessUser2?.toLowerCase();

  const valid = (
    (whiteName === user1Lower && blackName === user2Lower) ||
    (whiteName === user2Lower && blackName === user1Lower)
  );

  return { valid, game };
}

/**
 * Crea un desafío en Lichess entre dos usuarios.
 * Requiere que ambos usuarios tengan cuentas de Lichess vinculadas.
 */
async function createChallenge(challengerUsername, opponentUsername, timeControl, increment = 0) {
  try {
    const { data } = await lichess.post(`/challenge/${opponentUsername}`, null, {
      params: {
        clock: { limit: timeControl * 60, increment },
        rated: false,
        color: 'random',
        variant: 'standard',
      },
    });

    return {
      challengeId: data.id,
      url:         `https://lichess.org/${data.id}`,
      status:      data.status,
    };
  } catch (err) {
    logger.error('Error creando desafío en Lichess', { error: err.message });
    throw new Error('No se pudo crear el desafío en Lichess');
  }
}

/**
 * Obtiene la lista de movimientos de una partida para análisis anti-cheat.
 */
async function getGameMoves(gameId) {
  const game = await getGameResult(gameId);
  const moveList = game.moves ? game.moves.split(' ').filter(Boolean) : [];
  return { moves: moveList, pgn: game.pgn };
}

/**
 * Verifica si un usuario existe en Lichess.
 */
async function verifyLichessUser(username) {
  try {
    const { data } = await lichess.get(`/user/${username}`);
    return { exists: true, rating: data.perfs?.blitz?.rating || data.perfs?.rapid?.rating || 1500 };
  } catch {
    return { exists: false };
  }
}

module.exports = { getGameResult, verifyGamePlayers, createChallenge, getGameMoves, verifyLichessUser };
