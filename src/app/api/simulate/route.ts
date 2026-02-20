import { NextRequest, NextResponse } from 'next/server';
import {
  GameAnalysis,
  SimulationConfig,
  SimulationResult,
  SimulationRound,
  PayoffCell,
} from '@/lib/types';

// ---- helpers ---------------------------------------------------------------

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Given a payoff matrix and the strategy choices for every player, find the
 * matrix cell that best matches those choices and return the payoffs.
 *
 * "Best match" = the cell whose strategy map has the most keys in common with
 * `chosen`. If no cell matches at all we synthesise a small random payoff so
 * the simulation never stalls.
 */
function lookupPayoffs(
  matrix: PayoffCell[],
  chosen: Record<string, string>,
  playerIds: string[],
): Record<string, number> {
  if (matrix.length === 0) {
    // No matrix at all -- give everyone a baseline payoff of 3-5
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
    // Return the payoffs from the best-matching cell, filling in missing
    // players with a neutral value.
    const out: Record<string, number> = {};
    for (const id of playerIds) {
      out[id] = bestCell.payoffs[id] ?? 4 + Math.random() * 2;
    }
    return out;
  }

  // Fallback -- random payoffs
  const out: Record<string, number> = {};
  for (const id of playerIds) out[id] = 2 + Math.random() * 4;
  return out;
}

// ---- strategy pickers per algorithm ----------------------------------------

/** Completely random choice */
function pickRandom_strategy(strategies: string[]): string {
  return pickRandom(strategies);
}

/** Greedy: choose the strategy that gave the best payoff last round.
 *  If no history, pick randomly. */
function pickGreedy(
  playerId: string,
  strategies: string[],
  lastRound: SimulationRound | null,
  _matrix: PayoffCell[],
  playerIds: string[],
): string {
  if (!lastRound) return pickRandom(strategies);

  // Find which strategy from the matrix gave us the highest payoff when
  // combined with what opponents did last round.
  let best = strategies[0];
  let bestPayoff = -Infinity;

  for (const strat of strategies) {
    // Build hypothetical choices: this player picks `strat`, everyone else
    // keeps their last-round choice.
    const hypothetical: Record<string, string> = {};
    for (const pid of playerIds) {
      hypothetical[pid] = pid === playerId ? strat : (lastRound.strategies[pid] ?? strat);
    }
    const payoffs = lookupPayoffs(_matrix, hypothetical, playerIds);
    if (payoffs[playerId] > bestPayoff) {
      bestPayoff = payoffs[playerId];
      best = strat;
    }
  }
  return best;
}

/** Tit-for-tat: cooperate first, then mirror the opponent's last move.
 *  We treat the first strategy as "cooperate" and try to mirror the most
 *  common opponent strategy from last round. */
function pickTitForTat(
  playerId: string,
  strategies: string[],
  lastRound: SimulationRound | null,
  playerIds: string[],
): string {
  if (!lastRound) return strategies[0]; // cooperate first

  // Gather opponent strategies from last round and pick the most common one
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
  if (strategies.some((s) => s.toLowerCase() === most.toLowerCase())) {
    return strategies.find((s) => s.toLowerCase() === most.toLowerCase())!;
  }
  // Otherwise just return first strategy (cooperative)
  return strategies[0];
}

/** Adaptive: explore-exploit based on cumulative payoff history. */
function pickAdaptive(
  playerId: string,
  strategies: string[],
  history: SimulationRound[],
  learningRate: number,
): string {
  if (history.length === 0) return pickRandom(strategies);

  // Build weights: sum of payoffs every time we played each strategy
  const weights: Record<string, number> = {};
  for (const s of strategies) weights[s] = 1; // base weight

  for (const round of history) {
    const played = round.strategies[playerId];
    if (played && weights[played] !== undefined) {
      weights[played] += (round.payoffs[playerId] ?? 0) * learningRate;
    }
  }

  // Weighted random selection
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const s of strategies) {
    r -= weights[s];
    if (r <= 0) return s;
  }
  return strategies[strategies.length - 1];
}

// Mapping of algorithm name to an index so "mixed" can assign different
// algorithms to different players.
const STRATEGY_ALGORITHMS = ['tit-for-tat', 'greedy', 'adaptive', 'random'] as const;

// ---- main simulation -------------------------------------------------------

function runSimulation(
  analysis: GameAnalysis,
  config: SimulationConfig,
): SimulationResult {
  const players = analysis.players;
  const playerIds = players.map((p) => p.id);
  const matrix = analysis.payoffMatrix ?? [];

  // Build a map of each player's available strategies
  const playerStrategies: Record<string, string[]> = {};
  for (const p of players) {
    playerStrategies[p.id] = p.strategies && p.strategies.length > 0
      ? [...p.strategies]
      : ['Cooperate', 'Defect']; // safe fallback
  }

  const rounds: SimulationRound[] = [];
  const cumulative: Record<string, number> = {};
  for (const id of playerIds) cumulative[id] = 0;

  // For "mixed" mode: assign a different algorithm to each player
  const playerAlgorithm: Record<string, string> = {};
  if (config.strategy === 'mixed') {
    players.forEach((p, i) => {
      playerAlgorithm[p.id] = STRATEGY_ALGORITHMS[i % STRATEGY_ALGORITHMS.length];
    });
  }

  for (let r = 0; r < config.rounds; r++) {
    const chosen: Record<string, string> = {};

    for (const pid of playerIds) {
      const strats = playerStrategies[pid];
      const algo = config.strategy === 'mixed' ? playerAlgorithm[pid] : config.strategy;
      const lastRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;

      let pick: string;
      switch (algo) {
        case 'random':
          pick = pickRandom_strategy(strats);
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
        default:
          pick = pickRandom_strategy(strats);
      }

      // Noise: override with random strategy with probability config.noise
      if (Math.random() < config.noise) {
        pick = pickRandom(strats);
      }

      chosen[pid] = pick;
    }

    const payoffs = lookupPayoffs(matrix, chosen, playerIds);
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

  // ---- convergence detection ------------------------------------------------
  const convergence = detectConvergence(rounds, playerIds);

  // ---- insights -------------------------------------------------------------
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

function detectConvergence(
  rounds: SimulationRound[],
  playerIds: string[],
): SimulationResult['convergence'] {
  const WINDOW = 5;
  if (rounds.length < WINDOW) {
    return {
      converged: false,
      equilibriumRound: null,
      finalStrategies: rounds.length > 0 ? { ...rounds[rounds.length - 1].strategies } : {},
    };
  }

  // Walk forward and find the first round where the next WINDOW rounds all
  // have the same strategies for every player.
  for (let start = 0; start <= rounds.length - WINDOW; start++) {
    const ref = rounds[start].strategies;
    let stable = true;
    for (let j = start + 1; j < start + WINDOW; j++) {
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

  // 3. Strategy frequency
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
    insights.push(
      `Nash Equilibrium reference: ${analysis.nashEquilibrium}`,
    );
  }

  // 5. Noise note
  if (config.noise > 0) {
    insights.push(
      `With ${(config.noise * 100).toFixed(0)}% noise, random deviations occasionally disrupted strategy patterns.`,
    );
  }

  // 6. Algorithm note
  if (config.strategy === 'mixed') {
    insights.push(
      'In mixed mode each player used a different algorithm, simulating a heterogeneous population.',
    );
  }

  return insights;
}

// ---- route handler ----------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { analysis, config } = body as {
      analysis: GameAnalysis;
      config: SimulationConfig;
    };

    if (!analysis || !config) {
      return NextResponse.json(
        { error: 'Both analysis and config are required.' },
        { status: 400 },
      );
    }

    if (!analysis.players || analysis.players.length === 0) {
      return NextResponse.json(
        { error: 'Analysis must include at least one player.' },
        { status: 400 },
      );
    }

    // Clamp config values to valid ranges
    const safeConfig: SimulationConfig = {
      rounds: Math.min(Math.max(Math.round(config.rounds), 1), 200),
      noise: Math.min(Math.max(config.noise, 0), 1),
      learningRate: Math.min(Math.max(config.learningRate, 0), 1),
      strategy: config.strategy ?? 'adaptive',
    };

    const result = runSimulation(analysis, safeConfig);

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Simulation error:', error);
    return NextResponse.json(
      { error: 'Simulation failed. Please try again.' },
      { status: 500 },
    );
  }
}
