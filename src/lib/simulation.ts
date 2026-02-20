/**
 * Client-side simulation engine for game theory analysis.
 *
 * This module provides a pure-function simulation engine that runs entirely in
 * the browser. It supports multiple strategy-selection algorithms including
 * classic approaches (tit-for-tat, greedy, adaptive) and more advanced ones
 * (best-response, fictitious-play, replicator-dynamics).
 *
 * No external dependencies -- pure TypeScript functions only.
 */

import type {
  GameAnalysis,
  SimulationConfig,
  SimulationResult,
  SimulationRound,
  PayoffCell,
} from './types';

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/** Pick a uniformly random element from a non-empty array. */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Weighted random selection.
 * Given parallel arrays of items and non-negative weights, return one item
 * sampled proportionally to its weight.
 */
function weightedRandom<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return pickRandom(items);

  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// ---------------------------------------------------------------------------
// Payoff lookup
// ---------------------------------------------------------------------------

/**
 * Given a payoff matrix and the strategy choices for every player, find the
 * matrix cell that best matches those choices and return the payoffs.
 *
 * "Best match" = the cell whose strategy map has the most keys in common with
 * `chosen`. If no cell matches at all we synthesize a small random payoff so
 * the simulation never stalls.
 */
function lookupPayoffs(
  matrix: PayoffCell[],
  chosen: Record<string, string>,
  playerIds: string[],
): Record<string, number> {
  if (matrix.length === 0) {
    // No matrix -- give everyone a baseline payoff of 3-5.
    const out: Record<string, number> = {};
    for (const id of playerIds) out[id] = 3 + Math.random() * 2;
    return out;
  }

  let bestCell: PayoffCell | null = null;
  let bestScore = -1;

  for (const cell of matrix) {
    let score = 0;
    for (const pid of playerIds) {
      if (
        cell.strategies[pid] &&
        chosen[pid] &&
        cell.strategies[pid].toLowerCase() === chosen[pid].toLowerCase()
      ) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestCell = cell;
    }
  }

  if (bestCell && bestScore > 0) {
    const out: Record<string, number> = {};
    for (const id of playerIds) {
      out[id] = bestCell.payoffs[id] ?? 4 + Math.random() * 2;
    }
    return out;
  }

  // Fallback -- random payoffs.
  const out: Record<string, number> = {};
  for (const id of playerIds) out[id] = 2 + Math.random() * 4;
  return out;
}

// ---------------------------------------------------------------------------
// Strategy-selection algorithms
// ---------------------------------------------------------------------------

/** Random: uniformly random strategy choice. */
function pickRandomStrategy(strategies: string[]): string {
  return pickRandom(strategies);
}

/**
 * Greedy: choose the strategy that gave the highest payoff last round.
 * If there is no history, pick randomly.
 */
function pickGreedy(
  playerId: string,
  strategies: string[],
  lastRound: SimulationRound | null,
  matrix: PayoffCell[],
  playerIds: string[],
): string {
  if (!lastRound) return pickRandom(strategies);

  let best = strategies[0];
  let bestPayoff = -Infinity;

  for (const strat of strategies) {
    // Hypothetical: this player picks `strat`, everyone else keeps last choice.
    const hypothetical: Record<string, string> = {};
    for (const pid of playerIds) {
      hypothetical[pid] = pid === playerId ? strat : (lastRound.strategies[pid] ?? strat);
    }
    const payoffs = lookupPayoffs(matrix, hypothetical, playerIds);
    if (payoffs[playerId] > bestPayoff) {
      bestPayoff = payoffs[playerId];
      best = strat;
    }
  }
  return best;
}

/**
 * Tit-for-tat: cooperate on the first round, then mirror the most common
 * opponent strategy from the previous round. The first strategy in the list
 * is treated as the "cooperative" default.
 */
function pickTitForTat(
  playerId: string,
  strategies: string[],
  lastRound: SimulationRound | null,
  playerIds: string[],
): string {
  if (!lastRound) return strategies[0]; // cooperate first

  // Gather opponent strategies from last round and pick the most common one.
  const counts: Record<string, number> = {};
  for (const pid of playerIds) {
    if (pid === playerId) continue;
    const s = lastRound.strategies[pid];
    if (s) counts[s] = (counts[s] || 0) + 1;
  }

  let most = strategies[0];
  let max = 0;
  for (const [s, c] of Object.entries(counts)) {
    if (c > max) {
      max = c;
      most = s;
    }
  }

  // If the opponent's strategy exists in our strategy set, mirror it.
  const match = strategies.find((s) => s.toLowerCase() === most.toLowerCase());
  return match ?? strategies[0];
}

/**
 * Adaptive: explore-exploit based on cumulative payoff history.
 * Builds per-strategy weights from past payoffs and samples proportionally.
 */
function pickAdaptive(
  playerId: string,
  strategies: string[],
  history: SimulationRound[],
  learningRate: number,
): string {
  if (history.length === 0) return pickRandom(strategies);

  // Build weights: base of 1 plus accumulated payoff contribution.
  const weights: Record<string, number> = {};
  for (const s of strategies) weights[s] = 1;

  for (const round of history) {
    const played = round.strategies[playerId];
    if (played && weights[played] !== undefined) {
      weights[played] += (round.payoffs[playerId] ?? 0) * learningRate;
    }
  }

  const items = strategies;
  const w = strategies.map((s) => Math.max(weights[s], 0));
  return weightedRandom(items, w);
}

/**
 * Best Response: each player picks the strategy that maximizes their payoff
 * given opponents' last-round choices. On the first round, pick the strategy
 * with the highest average payoff across all matrix cells.
 */
function pickBestResponse(
  playerId: string,
  strategies: string[],
  lastRound: SimulationRound | null,
  matrix: PayoffCell[],
  playerIds: string[],
): string {
  if (!lastRound) {
    // First round: pick strategy with highest average payoff across all cells.
    if (matrix.length === 0) return pickRandom(strategies);

    let best = strategies[0];
    let bestAvg = -Infinity;

    for (const strat of strategies) {
      let sum = 0;
      let count = 0;
      for (const cell of matrix) {
        if (
          cell.strategies[playerId] &&
          cell.strategies[playerId].toLowerCase() === strat.toLowerCase()
        ) {
          sum += cell.payoffs[playerId] ?? 0;
          count += 1;
        }
      }
      const avg = count > 0 ? sum / count : 0;
      if (avg > bestAvg) {
        bestAvg = avg;
        best = strat;
      }
    }
    return best;
  }

  // Subsequent rounds: maximize payoff given opponents' last choices.
  let best = strategies[0];
  let bestPayoff = -Infinity;

  for (const strat of strategies) {
    const hypothetical: Record<string, string> = {};
    for (const pid of playerIds) {
      hypothetical[pid] = pid === playerId ? strat : (lastRound.strategies[pid] ?? strat);
    }
    const payoffs = lookupPayoffs(matrix, hypothetical, playerIds);
    if (payoffs[playerId] > bestPayoff) {
      bestPayoff = payoffs[playerId];
      best = strat;
    }
  }
  return best;
}

/**
 * Fictitious Play: each player maintains a frequency count of what opponents
 * have played. They best-respond to the empirical distribution (weighted
 * average) of opponent strategies.
 *
 * We evaluate each own strategy against the empirical mixture of opponent
 * strategies and pick the one with the highest expected payoff.
 */
function pickFictitiousPlay(
  playerId: string,
  strategies: string[],
  history: SimulationRound[],
  matrix: PayoffCell[],
  playerIds: string[],
): string {
  if (history.length === 0) {
    // No history -- fall back to best-response first-round logic.
    return pickBestResponse(playerId, strategies, null, matrix, playerIds);
  }

  // Build empirical frequency counts for each opponent's strategies.
  const opponentFreqs: Record<string, Record<string, number>> = {};
  for (const pid of playerIds) {
    if (pid === playerId) continue;
    opponentFreqs[pid] = {};
    for (const round of history) {
      const s = round.strategies[pid];
      if (s) {
        opponentFreqs[pid][s] = (opponentFreqs[pid][s] || 0) + 1;
      }
    }
  }

  // For each of our strategies, compute expected payoff against the empirical
  // distribution of opponent strategies by averaging over sampled opponent
  // strategy profiles weighted by their frequencies.
  let best = strategies[0];
  let bestExpected = -Infinity;

  for (const strat of strategies) {
    let expectedPayoff = 0;
    let totalWeight = 0;

    // Enumerate opponent strategy combinations from the matrix.
    for (const cell of matrix) {
      if (
        cell.strategies[playerId] &&
        cell.strategies[playerId].toLowerCase() === strat.toLowerCase()
      ) {
        // Weight this cell by the product of opponent frequencies.
        let weight = 1;
        for (const pid of playerIds) {
          if (pid === playerId) continue;
          const oppStrat = cell.strategies[pid];
          if (oppStrat && opponentFreqs[pid]) {
            const freq = opponentFreqs[pid][oppStrat] || 0;
            weight *= freq;
          }
        }
        expectedPayoff += (cell.payoffs[playerId] ?? 0) * weight;
        totalWeight += weight;
      }
    }

    const avg = totalWeight > 0 ? expectedPayoff / totalWeight : 0;
    if (avg > bestExpected) {
      bestExpected = avg;
      best = strat;
    }
  }

  // If the matrix didn't provide useful info, fall back to best-response.
  if (bestExpected === -Infinity || bestExpected === 0) {
    const lastRound = history[history.length - 1];
    return pickBestResponse(playerId, strategies, lastRound, matrix, playerIds);
  }

  return best;
}

/**
 * Replicator Dynamics state for a single player.
 * Tracks a probability distribution over strategies.
 */
interface ReplicatorState {
  /** Strategy probabilities. Always sums to 1. */
  distribution: Record<string, number>;
}

/**
 * Replicator Dynamics: maintain a probability distribution over strategies
 * for each player. After each round, strategies with above-average payoffs
 * grow in probability and those below average shrink.
 *
 * Formula: p_i(t+1) = p_i(t) * payoff_i(t) / average_payoff(t)
 *
 * Then we sample a strategy from the updated distribution.
 *
 * This function both updates the state (mutating the provided object) and
 * returns the sampled strategy.
 */
function pickReplicatorDynamics(
  playerId: string,
  strategies: string[],
  state: ReplicatorState,
  lastRound: SimulationRound | null,
  matrix: PayoffCell[],
  playerIds: string[],
): string {
  if (!lastRound) {
    // First round -- sample from the (initially uniform) distribution.
    const items = strategies;
    const weights = strategies.map((s) => state.distribution[s] ?? 1 / strategies.length);
    return weightedRandom(items, weights);
  }

  // Compute per-strategy payoffs for this player given opponents' last choices.
  const stratPayoffs: Record<string, number> = {};
  for (const strat of strategies) {
    const hypothetical: Record<string, string> = {};
    for (const pid of playerIds) {
      hypothetical[pid] = pid === playerId ? strat : (lastRound.strategies[pid] ?? strat);
    }
    const payoffs = lookupPayoffs(matrix, hypothetical, playerIds);
    stratPayoffs[strat] = payoffs[playerId];
  }

  // Compute average payoff under current distribution.
  let avgPayoff = 0;
  for (const strat of strategies) {
    avgPayoff += (state.distribution[strat] ?? 0) * stratPayoffs[strat];
  }

  // Guard against zero average (avoid division by zero).
  if (avgPayoff <= 0) avgPayoff = 1;

  // Update distribution: p_i(t+1) = p_i(t) * payoff_i(t) / average_payoff(t)
  let totalProb = 0;
  for (const strat of strategies) {
    const payoff = Math.max(stratPayoffs[strat], 0.01); // floor to avoid zeroing out
    state.distribution[strat] = (state.distribution[strat] ?? 0) * payoff / avgPayoff;
    totalProb += state.distribution[strat];
  }

  // Re-normalize to ensure probabilities sum to 1.
  if (totalProb > 0) {
    for (const strat of strategies) {
      state.distribution[strat] /= totalProb;
    }
  } else {
    // Reset to uniform if something went wrong.
    for (const strat of strategies) {
      state.distribution[strat] = 1 / strategies.length;
    }
  }

  // Sample from the updated distribution.
  const items = strategies;
  const weights = strategies.map((s) => state.distribution[s]);
  return weightedRandom(items, weights);
}

// ---------------------------------------------------------------------------
// Convergence detection
// ---------------------------------------------------------------------------

/** Number of consecutive identical rounds required to declare convergence. */
const CONVERGENCE_WINDOW = 10;

/**
 * Walk through the round history and detect whether strategies have stabilized.
 * Convergence = same strategy profile for CONVERGENCE_WINDOW consecutive rounds.
 */
function detectConvergence(
  rounds: SimulationRound[],
  playerIds: string[],
): SimulationResult['convergence'] {
  if (rounds.length < CONVERGENCE_WINDOW) {
    return {
      converged: false,
      equilibriumRound: null,
      finalStrategies: rounds.length > 0
        ? { ...rounds[rounds.length - 1].strategies }
        : {},
    };
  }

  for (let start = 0; start <= rounds.length - CONVERGENCE_WINDOW; start++) {
    const ref = rounds[start].strategies;
    let stable = true;

    for (let j = start + 1; j < start + CONVERGENCE_WINDOW; j++) {
      for (const pid of playerIds) {
        if (rounds[j].strategies[pid] !== ref[pid]) {
          stable = false;
          break;
        }
      }
      if (!stable) break;
    }

    if (stable) {
      return {
        converged: true,
        equilibriumRound: rounds[start].round,
        finalStrategies: { ...ref },
      };
    }
  }

  return {
    converged: false,
    equilibriumRound: null,
    finalStrategies: { ...rounds[rounds.length - 1].strategies },
  };
}

// ---------------------------------------------------------------------------
// Insight generation
// ---------------------------------------------------------------------------

/**
 * Produce human-readable insights about the simulation results.
 * Covers convergence, dominant player, strategy frequency, Nash equilibrium
 * comparison, noise impact, and algorithm description.
 */
function generateInsights(
  rounds: SimulationRound[],
  playerIds: string[],
  players: GameAnalysis['players'],
  convergence: SimulationResult['convergence'],
  config: SimulationConfig,
  analysis: GameAnalysis,
): string[] {
  const insights: string[] = [];
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id;

  // 1. Convergence
  if (convergence.converged) {
    insights.push(
      `The game converged to a stable state at round ${convergence.equilibriumRound}.`,
    );
    for (const pid of playerIds) {
      insights.push(
        `${nameOf(pid)} settled on "${convergence.finalStrategies[pid]}".`,
      );
    }
  } else {
    insights.push(
      'The game did not converge to a stable equilibrium within the simulation window.',
    );
  }

  // 2. Dominant player (highest cumulative payoff)
  if (rounds.length > 0) {
    const last = rounds[rounds.length - 1];
    let bestId = playerIds[0];
    let bestPay = -Infinity;
    for (const pid of playerIds) {
      if (last.cumulativePayoffs[pid] > bestPay) {
        bestPay = last.cumulativePayoffs[pid];
        bestId = pid;
      }
    }
    insights.push(
      `${nameOf(bestId)} achieved the highest total payoff of ${bestPay.toFixed(1)}.`,
    );
  }

  // 3. Strategy frequency per player
  for (const pid of playerIds) {
    const freq: Record<string, number> = {};
    for (const round of rounds) {
      const s = round.strategies[pid];
      freq[s] = (freq[s] || 0) + 1;
    }
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const pct = ((sorted[0][1] / rounds.length) * 100).toFixed(0);
      insights.push(
        `${nameOf(pid)} used "${sorted[0][0]}" most often (${pct}% of rounds).`,
      );
    }
  }

  // 4. Nash equilibrium comparison
  if (analysis.nashEquilibrium) {
    insights.push(`Nash Equilibrium reference: ${analysis.nashEquilibrium}`);
  }

  // 5. Noise note
  if (config.noise > 0) {
    insights.push(
      `With ${(config.noise * 100).toFixed(0)}% noise, random deviations occasionally disrupted strategy patterns.`,
    );
  }

  // 6. Algorithm note
  const algoDescriptions: Record<string, string> = {
    'random': 'Players chose strategies uniformly at random each round.',
    'greedy': 'Players greedily picked the best-performing strategy from the previous round.',
    'tit-for-tat': 'Players mirrored their opponents\' previous moves (tit-for-tat).',
    'adaptive': 'Players adapted over time, weighting strategies by historical payoff performance.',
    'mixed': 'In mixed mode each player used a different algorithm, simulating a heterogeneous population.',
    'best-response': 'Players used best-response dynamics, always picking the payoff-maximizing strategy against opponents\' last choices.',
    'fictitious-play': 'Players used fictitious play, best-responding to the empirical frequency of opponent strategies.',
    'replicator-dynamics': 'Players used replicator dynamics, evolving a probability distribution over strategies based on relative payoff fitness.',
  };

  const desc = algoDescriptions[config.strategy];
  if (desc) {
    insights.push(desc);
  }

  return insights;
}

// ---------------------------------------------------------------------------
// All algorithm identifiers used by the "mixed" mode cycling
// ---------------------------------------------------------------------------

const ALL_ALGORITHMS: SimulationConfig['strategy'][] = [
  'tit-for-tat',
  'greedy',
  'adaptive',
  'random',
  'best-response',
  'fictitious-play',
  'replicator-dynamics',
];

// ---------------------------------------------------------------------------
// Main simulation engine
// ---------------------------------------------------------------------------

/**
 * Run a complete game theory simulation on the client side.
 *
 * This is a pure synchronous function -- no network calls, no async needed.
 * It takes a GameAnalysis (the parsed game scenario) and a SimulationConfig
 * and returns a full SimulationResult including round-by-round data,
 * convergence information, and generated insights.
 */
export function runClientSimulation(
  analysis: GameAnalysis,
  config: SimulationConfig,
): SimulationResult {
  const players = analysis.players;
  const playerIds = players.map((p) => p.id);
  const matrix = analysis.payoffMatrix ?? [];

  // Build a map of each player's available strategies.
  const playerStrategies: Record<string, string[]> = {};
  for (const p of players) {
    playerStrategies[p.id] =
      p.strategies && p.strategies.length > 0
        ? [...p.strategies]
        : ['Cooperate', 'Defect']; // safe fallback
  }

  // Round history and cumulative payoff tracking.
  const rounds: SimulationRound[] = [];
  const cumulative: Record<string, number> = {};
  for (const id of playerIds) cumulative[id] = 0;

  // For "mixed" mode: assign a different algorithm to each player, cycling
  // through all available algorithms.
  const playerAlgorithm: Record<string, SimulationConfig['strategy']> = {};
  if (config.strategy === 'mixed') {
    players.forEach((p, i) => {
      playerAlgorithm[p.id] = ALL_ALGORITHMS[i % ALL_ALGORITHMS.length];
    });
  }

  // Replicator dynamics state: per-player probability distributions.
  // Initialized to uniform distribution over each player's strategies.
  const replicatorStates: Record<string, ReplicatorState> = {};
  for (const pid of playerIds) {
    const strats = playerStrategies[pid];
    const dist: Record<string, number> = {};
    for (const s of strats) dist[s] = 1 / strats.length;
    replicatorStates[pid] = { distribution: dist };
  }

  // ---- Run each round -------------------------------------------------------

  for (let r = 0; r < config.rounds; r++) {
    const chosen: Record<string, string> = {};

    for (const pid of playerIds) {
      const strats = playerStrategies[pid];
      const algo = config.strategy === 'mixed' ? playerAlgorithm[pid] : config.strategy;
      const lastRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;

      let pick: string;

      switch (algo) {
        case 'random':
          pick = pickRandomStrategy(strats);
          break;

        case 'greedy':
          pick = pickGreedy(pid, strats, lastRound, matrix, playerIds);
          break;

        case 'tit-for-tat':
          pick = pickTitForTat(pid, strats, lastRound, playerIds);
          break;

        case 'adaptive':
          pick = pickAdaptive(pid, strats, rounds, config.learningRate);
          break;

        case 'best-response':
          pick = pickBestResponse(pid, strats, lastRound, matrix, playerIds);
          break;

        case 'fictitious-play':
          pick = pickFictitiousPlay(pid, strats, rounds, matrix, playerIds);
          break;

        case 'replicator-dynamics':
          pick = pickReplicatorDynamics(
            pid, strats, replicatorStates[pid], lastRound, matrix, playerIds,
          );
          break;

        default:
          pick = pickRandomStrategy(strats);
      }

      // Noise injection: with probability config.noise, override with a
      // uniformly random strategy.
      if (Math.random() < config.noise) {
        pick = pickRandom(strats);
      }

      chosen[pid] = pick;
    }

    // Look up payoffs for the chosen strategy profile.
    const payoffs = lookupPayoffs(matrix, chosen, playerIds);

    // Accumulate payoffs.
    for (const pid of playerIds) {
      cumulative[pid] += payoffs[pid];
    }

    rounds.push({
      round: r + 1,
      strategies: { ...chosen },
      payoffs: { ...payoffs },
      cumulativePayoffs: { ...cumulative },
    });
  }

  // ---- Post-simulation analysis ---------------------------------------------

  const convergence = detectConvergence(rounds, playerIds);
  const insights = generateInsights(rounds, playerIds, players, convergence, config, analysis);

  return {
    id: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    scenarioInput: analysis.title,
    analysis,
    config,
    rounds,
    convergence,
    insights,
  };
}
