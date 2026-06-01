/**
 * Prize distribution algorithms for tournaments.
 * All percentages are expressed as decimals (0.5 = 50%).
 */

const STANDARD_DISTRIBUTIONS = {
  2:  [0.70, 0.30],
  4:  [0.50, 0.30, 0.20],
  8:  [0.40, 0.25, 0.15, 0.10, 0.05, 0.05],
  16: [0.35, 0.20, 0.12, 0.08, 0.05, 0.05, 0.05, 0.05, 0.025, 0.025, 0.025, 0.025],
  32: [0.30, 0.18, 0.10, 0.07, 0.05, 0.04, 0.03, 0.03],
};

/**
 * Returns prize amounts for each standing given a prize pool.
 * Uses nearest standard distribution or custom config.
 * @param {number} prizePool - Total prize pool in USD
 * @param {object} config - { places: number, percentages: number[] } or preset
 * @param {number} playerCount - Actual number of players (for paid places)
 * @returns {number[]} Array of prize amounts indexed by standing (0 = 1st place)
 */
function distributePrizes(prizePool, config, playerCount) {
  let percentages;

  if (config && Array.isArray(config.percentages)) {
    percentages = config.percentages;
  } else {
    const key = findNearestKey(Object.keys(STANDARD_DISTRIBUTIONS).map(Number), playerCount);
    percentages = STANDARD_DISTRIBUTIONS[key] || [1.0];
  }

  const paidPlaces = Math.min(percentages.length, playerCount);
  return percentages.slice(0, paidPlaces).map(pct =>
    Math.floor(prizePool * pct * 100) / 100
  );
}

function findNearestKey(keys, target) {
  return keys.reduce((prev, curr) =>
    Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev
  );
}

/**
 * Swiss system: generate round-robin style pairings avoiding rematches.
 * @param {Array} participants - Array of { userId, points, opponents: string[] }
 * @returns {Array} Array of [playerA, playerB] pairs
 */
function generateSwissPairings(participants) {
  const sorted = [...participants]
    .filter(p => !p.disqualified)
    .sort((a, b) => Number(b.points) - Number(a.points) || Math.random() - 0.5);

  const pairs = [];
  const paired = new Set();

  for (let i = 0; i < sorted.length; i++) {
    if (paired.has(sorted[i].userId)) continue;

    for (let j = i + 1; j < sorted.length; j++) {
      if (paired.has(sorted[j].userId)) continue;

      const alreadyPlayed = sorted[i].opponents?.includes(sorted[j].userId);
      if (!alreadyPlayed) {
        pairs.push([sorted[i], sorted[j]]);
        paired.add(sorted[i].userId);
        paired.add(sorted[j].userId);
        break;
      }
    }
  }

  return pairs;
}

/**
 * Calculate final standings by points, then wins as tiebreaker.
 */
function rankParticipants(participants) {
  return [...participants]
    .sort((a, b) => {
      const pointsDiff = Number(b.points) - Number(a.points);
      if (pointsDiff !== 0) return pointsDiff;
      return b.wins - a.wins;
    })
    .map((p, idx) => ({ ...p, standing: idx + 1 }));
}

/**
 * Calculate commission based on user's subscription tier.
 */
function getCommissionRate(tier) {
  const rates = {
    FREE: Number(process.env.COMMISSION_RATE_FREE) || 0.08,
    PREMIUM: Number(process.env.COMMISSION_RATE_PREMIUM) || 0.05,
    HIGH_STAKES: Number(process.env.COMMISSION_RATE_HIGH_STAKES) || 0.03,
  };
  return rates[tier] ?? rates.FREE;
}

/**
 * Calculate payout after commission.
 * For a win: winner gets totalPool * (1 - commissionRate)
 * For a draw: each player gets stakeAmount * (1 - drawFeeRate)
 */
function calculateMatchPayout(stakeAmount, commissionRate, result) {
  const pool = stakeAmount * 2;
  const commission = pool * commissionRate;
  const netPool = pool - commission;

  if (result === 'DRAW') {
    const drawFee = stakeAmount * 0.02;
    return {
      player1: stakeAmount - drawFee,
      player2: stakeAmount - drawFee,
      commission: drawFee * 2,
    };
  }

  return {
    winner: Math.floor(netPool * 100) / 100,
    commission: Math.floor(commission * 100) / 100,
  };
}

module.exports = {
  distributePrizes,
  generateSwissPairings,
  rankParticipants,
  getCommissionRate,
  calculateMatchPayout,
  STANDARD_DISTRIBUTIONS,
};
