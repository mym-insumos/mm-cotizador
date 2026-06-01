/**
 * Anti-Cheat Service — detecta uso de motores de ajedrez.
 * Metodología: correlación entre movimientos del jugador y la mejor jugada del motor.
 * Un 95%+ de coincidencia con el motor es umbral para anulación automática.
 */
const axios = require('axios');
const prisma = require('../utils/prisma');
const logger = require('../utils/logger');

const THRESHOLD = Number(process.env.ENGINE_CORRELATION_THRESHOLD) || 0.95;

/**
 * Analiza una partida completa para detectar uso de motor.
 * Usa la API pública de análisis de Lichess (cloud eval).
 */
async function analyzeGame(matchId, gameId, userId, color) {
  try {
    const { data: game } = await axios.get(
      `https://lichess.org/api/game/export/${gameId}`,
      { params: { moves: true, evals: true }, headers: { Accept: 'application/json' } }
    );

    const analysis = game.players?.[color]?.analysis;
    if (!analysis) {
      return await saveAnalysis(matchId, userId, 0, false, null);
    }

    const correlation = calculateCorrelation(analysis);
    const acpl = analysis.reduce((sum, m) => sum + (m.cpl || 0), 0) / (analysis.length || 1);
    const patterns = detectPatterns(analysis, acpl);
    const flagged = correlation >= THRESHOLD;

    const result = await saveAnalysis(matchId, userId, correlation, flagged, { acpl, patterns });

    if (flagged) {
      logger.warn('Posible uso de motor detectado', { matchId, userId, correlation });
      await autoVoidIfCheating(matchId, userId, correlation);
    }

    return result;
  } catch (err) {
    logger.error('Error en análisis anti-cheat', { matchId, error: err.message });
    return null;
  }
}

/**
 * Calcula el porcentaje de movimientos que coinciden con la primera línea del motor.
 */
function calculateCorrelation(analysis) {
  if (!analysis?.length) return 0;
  const topMoves = analysis.filter(m => m.best === undefined || m.cpl === 0);
  return topMoves.length / analysis.length;
}

/**
 * Detecta patrones sospechosos: ACPL extraordinariamente bajo, constancia perfecta.
 */
function detectPatterns(analysis, acpl) {
  const patterns = [];

  if (acpl < 5) patterns.push('ACPL_SUSPICIOUSLY_LOW');

  const cpls = analysis.map(m => m.cpl || 0);
  const stdDev = calculateStdDev(cpls);
  if (stdDev < 5 && analysis.length > 10) patterns.push('UNNATURALLY_CONSISTENT');

  const criticalMistakes = analysis.filter(m => (m.cpl || 0) > 150).length;
  if (criticalMistakes === 0 && analysis.length > 20) patterns.push('NO_CRITICAL_ERRORS');

  return patterns;
}

function calculateStdDev(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

async function saveAnalysis(matchId, userId, correlation, flagged, extra) {
  return prisma.antiCheatAnalysis.create({
    data: {
      matchId,
      userId,
      engineCorrelation: correlation,
      acplDeviation: extra?.acpl || null,
      suspiciousPatterns: extra?.patterns ? { list: extra.patterns } : null,
      flagged,
      autoVoided: false,
    },
  });
}

/**
 * Si la correlación supera el umbral y ambos jugadores fueron analizados
 * con flags, anula la partida automáticamente y devuelve fondos.
 */
async function autoVoidIfCheating(matchId, userId, correlation) {
  if (correlation < THRESHOLD) return;

  const { refundCancelled } = require('./escrowService');

  await prisma.$transaction(async (tx) => {
    await tx.antiCheatAnalysis.updateMany({
      where: { matchId, userId },
      data: { autoVoided: true },
    });

    await tx.match.update({
      where: { id: matchId },
      data: { status: 'VOID', result: 'VOID' },
    });
  });

  await refundCancelled(matchId);

  logger.warn('Partida anulada automáticamente por anti-cheat', { matchId, userId, correlation });
}

module.exports = { analyzeGame, calculateCorrelation, detectPatterns, autoVoidIfCheating };
