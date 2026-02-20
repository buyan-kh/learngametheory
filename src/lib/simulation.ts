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

  // -- How the simulation works (plain English) --
  const algoExplain: Record<string, string> = {
    'random': `In this simulation, every player picked their move completely at random each round — like flipping a coin. This helps us see what happens when nobody is trying to be strategic at all.`,
    'greedy': `Each player always went with whatever move worked best for them last time. It's the simplest "smart" strategy: just repeat what paid off. The downside? If everyone does this, they can get stuck in a rut.`,
    'tit-for-tat': `Players started off cooperatively, then copied whatever the other side did last round. This is the classic "I'll be nice if you're nice" approach — it rewards cooperation but punishes betrayal immediately.`,
    'adaptive': `Players learned from experience. Early on they tried different things, and over time they leaned harder toward moves that had been paying off. Think of it like a player who starts cautious and gradually figures out what works.`,
    'mixed': `Each player used a completely different decision-making approach. This simulates a more realistic world where not everyone thinks the same way — some are cautious, some are aggressive, some are unpredictable.`,
    'best-response': `Every round, each player looked at what their opponents just did and picked the absolute best counter-move. It's a very reactive approach — like always trying to one-up the other side based on their last action.`,
    'fictitious-play': `Players kept a mental tally of everything their opponents had done across all rounds, then picked the best response to those overall patterns. It's a more thoughtful approach than just reacting to the last round.`,
    'replicator-dynamics': `Strategies that performed well "grew" in popularity while underperforming ones faded away — similar to natural selection. Over time, the strongest approaches naturally rose to the top.`,
  };

  insights.push(algoExplain[config.strategy] ?? 'Players used a strategic algorithm to make their choices each round.');

  // -- Convergence explanation --
  if (convergence.converged) {
    const eqRound = convergence.equilibriumRound!;
    const pctThrough = Math.round((eqRound / rounds.length) * 100);
    if (pctThrough <= 25) {
      insights.push(`The players figured things out quickly. By round ${eqRound} (early in the game), everyone settled into a stable pattern and stopped changing their approach. This suggests the game has a strong, obvious equilibrium.`);
    } else if (pctThrough <= 60) {
      insights.push(`After some initial back-and-forth, the players found a stable arrangement around round ${eqRound}. It took some experimentation, but eventually everyone settled into a consistent pattern.`);
    } else {
      insights.push(`It took most of the game for things to stabilize. Players kept adjusting their strategies until round ${eqRound} before finally settling down. This suggests the game's equilibrium isn't immediately obvious — it takes time to discover.`);
    }
  } else {
    insights.push(`The players never settled into a stable pattern — they kept switching strategies right up to the end. This can mean the game doesn't have a clear "best" outcome, or that the players are caught in a cycle where every move invites a counter-move.`);
  }

  // -- Who came out on top --
  if (rounds.length > 0) {
    const last = rounds[rounds.length - 1];
    const scores = playerIds.map((pid) => ({ pid, score: last.cumulativePayoffs[pid] }));
    scores.sort((a, b) => b.score - a.score);
    const best = scores[0];
    const worst = scores[scores.length - 1];

    if (scores.length === 2) {
      const gap = best.score - worst.score;
      const avgScore = (best.score + worst.score) / 2;
      const gapPct = avgScore > 0 ? (gap / avgScore) * 100 : 0;

      if (gapPct < 10) {
        insights.push(`This was a very close contest. ${nameOf(best.pid)} and ${nameOf(worst.pid)} ended up with nearly identical scores, suggesting neither side had a clear advantage. The game rewarded both players roughly equally.`);
      } else if (gapPct < 40) {
        insights.push(`${nameOf(best.pid)} came out ahead, but not by a huge margin. ${nameOf(worst.pid)} stayed competitive throughout. The difference suggests a slight strategic edge rather than total domination.`);
      } else {
        insights.push(`${nameOf(best.pid)} clearly dominated this simulation, pulling far ahead of ${nameOf(worst.pid)}. This large gap usually means one player's strategy was significantly better suited to this particular game setup.`);
      }
    } else {
      insights.push(`${nameOf(best.pid)} came out on top overall, while ${nameOf(worst.pid)} ended with the lowest score. In games with multiple players, the dynamics are more complex — alliances and rivalries can shift the balance.`);
    }
  }

  // -- Strategy switching patterns --
  let totalSwitches = 0;
  for (const pid of playerIds) {
    for (let i = 1; i < rounds.length; i++) {
      if (rounds[i].strategies[pid] !== rounds[i - 1].strategies[pid]) {
        totalSwitches++;
      }
    }
  }
  const switchRate = totalSwitches / ((rounds.length - 1) * playerIds.length);

  if (switchRate < 0.1) {
    insights.push(`Players were very consistent with their strategies, rarely changing their approach. This stability suggests they quickly found moves they were comfortable with and stuck with them.`);
  } else if (switchRate < 0.3) {
    insights.push(`Players occasionally switched strategies when they saw an opportunity or felt pressure, but mostly stuck to familiar approaches. This moderate level of experimentation is typical of games where players are learning.`);
  } else if (switchRate < 0.6) {
    insights.push(`There was a lot of strategic back-and-forth — players frequently changed their approach in response to what others were doing. This makes the game feel dynamic, with no single "obvious" best move.`);
  } else {
    insights.push(`Strategies were extremely volatile, with players constantly changing their moves. This level of chaos suggests the game is highly reactive — every move invites a counter-move, creating an unpredictable arms race.`);
  }

  // -- Noise explanation --
  if (config.noise > 0.2) {
    insights.push(`The high randomness setting means players sometimes made "mistakes" or unexpected moves. This simulates real-world unpredictability — people don't always act perfectly rationally. It makes outcomes less predictable but often more realistic.`);
  } else if (config.noise > 0) {
    insights.push(`A small amount of randomness was mixed in, so players occasionally deviated from their usual pattern. This makes the simulation more realistic — in real life, people sometimes make surprising choices.`);
  }

  // -- Nash equilibrium context --
  if (analysis.nashEquilibrium) {
    insights.push(`For context, game theory predicts this scenario has a Nash Equilibrium — a situation where no player can improve their outcome by changing strategy alone. Here's what theory says: "${analysis.nashEquilibrium}"`);
  }

  return insights;
}

// ---------------------------------------------------------------------------
// Narrative generation — plain-English story of the simulation
// ---------------------------------------------------------------------------

function generateNarrative(
  rounds: SimulationRound[],
  playerIds: string[],
  players: GameAnalysis['players'],
  convergence: SimulationResult['convergence'],
  config: SimulationConfig,
): string {
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id;
  const parts: string[] = [];

  // Opening
  const names = playerIds.map(nameOf);
  if (names.length === 2) {
    parts.push(`${names[0]} and ${names[1]} faced off over ${rounds.length} rounds.`);
  } else {
    parts.push(`${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} competed over ${rounds.length} rounds.`);
  }

  // Early game (first 25%)
  const earlyEnd = Math.min(Math.ceil(rounds.length * 0.25), rounds.length);
  const earlySwitches: Record<string, number> = {};
  for (const pid of playerIds) {
    earlySwitches[pid] = 0;
    for (let i = 1; i < earlyEnd; i++) {
      if (rounds[i].strategies[pid] !== rounds[i - 1].strategies[pid]) {
        earlySwitches[pid]++;
      }
    }
  }
  const mostExperimental = playerIds.reduce((a, b) => (earlySwitches[a] > earlySwitches[b] ? a : b));
  const leastExperimental = playerIds.reduce((a, b) => (earlySwitches[a] < earlySwitches[b] ? a : b));

  if (earlySwitches[mostExperimental] > 2) {
    parts.push(`In the opening rounds, ${nameOf(mostExperimental)} experimented with different approaches, trying to find what works.`);
  } else {
    parts.push(`Both sides started with a clear plan from the beginning, committing to their chosen strategies early on.`);
  }
  if (mostExperimental !== leastExperimental && earlySwitches[leastExperimental] === 0) {
    parts.push(`Meanwhile, ${nameOf(leastExperimental)} stayed consistent from the start.`);
  }

  // Mid game — who was winning?
  const midPoint = Math.floor(rounds.length / 2);
  if (midPoint > 0 && midPoint < rounds.length) {
    const midRound = rounds[midPoint];
    const midScores = playerIds.map((pid) => ({ pid, score: midRound.cumulativePayoffs[pid] }));
    midScores.sort((a, b) => b.score - a.score);
    const leader = midScores[0];
    const trailer = midScores[midScores.length - 1];
    const gap = leader.score - trailer.score;
    const avg = (leader.score + trailer.score) / 2;

    if (avg > 0 && (gap / avg) > 0.3) {
      parts.push(`By the halfway point, ${nameOf(leader.pid)} had pulled ahead with a clear lead.`);
    } else {
      parts.push(`At the halfway mark, the scores were still close — neither side had a decisive advantage.`);
    }
  }

  // Late game / convergence
  if (convergence.converged) {
    const eqRound = convergence.equilibriumRound!;
    const strategies = Object.entries(convergence.finalStrategies)
      .map(([pid, s]) => `${nameOf(pid)} locked in "${s}"`)
      .join(' and ');
    parts.push(`By round ${eqRound}, the dust settled: ${strategies}. From that point on, nobody had any reason to change — they'd found their equilibrium.`);
  } else {
    parts.push(`Even by the final round, the players were still jockeying for position. No stable pattern emerged — this game kept everyone on their toes until the very end.`);
  }

  // Final outcome
  if (rounds.length > 0) {
    const last = rounds[rounds.length - 1];
    const scores = playerIds.map((pid) => ({ pid, score: last.cumulativePayoffs[pid] }));
    scores.sort((a, b) => b.score - a.score);

    if (playerIds.length === 2) {
      const gap = scores[0].score - scores[1].score;
      const avg = (scores[0].score + scores[1].score) / 2;
      if (avg > 0 && (gap / avg) < 0.05) {
        parts.push(`In the end, it was essentially a draw — both sides came away with similar results.`);
      } else {
        parts.push(`When the final scores were tallied, ${nameOf(scores[0].pid)} came out ahead.`);
      }
    } else {
      parts.push(`In the final standings, ${nameOf(scores[0].pid)} finished first.`);
    }
  }

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Per-player strategy narrative
// ---------------------------------------------------------------------------

function generateStrategyNarrative(
  rounds: SimulationRound[],
  playerIds: string[],
  players: GameAnalysis['players'],
  convergence: SimulationResult['convergence'],
): Record<string, string> {
  const result: Record<string, string> = {};
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id;

  for (const pid of playerIds) {
    const parts: string[] = [];
    const name = nameOf(pid);

    // Strategy frequency
    const freq: Record<string, number> = {};
    for (const round of rounds) {
      const s = round.strategies[pid];
      freq[s] = (freq[s] || 0) + 1;
    }
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);

    if (sorted.length === 1) {
      parts.push(`${name} used "${sorted[0][0]}" every single round — completely committed to one approach from start to finish.`);
    } else if (sorted.length === 2) {
      const mainPct = Math.round((sorted[0][1] / rounds.length) * 100);
      if (mainPct >= 80) {
        parts.push(`${name} mostly relied on "${sorted[0][0]}", only occasionally switching to "${sorted[1][0]}" when the situation called for it.`);
      } else {
        parts.push(`${name} alternated between "${sorted[0][0]}" and "${sorted[1][0]}", using both approaches throughout the game.`);
      }
    } else {
      parts.push(`${name} tried ${sorted.length} different strategies, with "${sorted[0][0]}" being the go-to choice.`);
    }

    // When did they switch?
    let switches = 0;
    let firstSwitch: number | null = null;
    let lastSwitch: number | null = null;
    for (let i = 1; i < rounds.length; i++) {
      if (rounds[i].strategies[pid] !== rounds[i - 1].strategies[pid]) {
        switches++;
        if (firstSwitch === null) firstSwitch = i + 1;
        lastSwitch = i + 1;
      }
    }

    if (switches === 0) {
      parts.push(`They never wavered or changed course.`);
    } else if (switches <= 3) {
      parts.push(`They only changed strategy a few times, suggesting they found a comfortable approach early.`);
    } else {
      const earlyHalf = rounds.slice(0, Math.floor(rounds.length / 2));
      const lateHalf = rounds.slice(Math.floor(rounds.length / 2));
      let earlySwitches = 0;
      let lateSwitches = 0;
      for (let i = 1; i < earlyHalf.length; i++) {
        if (earlyHalf[i].strategies[pid] !== earlyHalf[i - 1].strategies[pid]) earlySwitches++;
      }
      for (let i = 1; i < lateHalf.length; i++) {
        if (lateHalf[i].strategies[pid] !== lateHalf[i - 1].strategies[pid]) lateSwitches++;
      }

      if (earlySwitches > lateSwitches * 2) {
        parts.push(`They experimented a lot early on, then settled down as they figured out what works.`);
      } else if (lateSwitches > earlySwitches * 2) {
        parts.push(`They started steady but became more reactive later, perhaps responding to changes from other players.`);
      } else {
        parts.push(`They kept adjusting throughout the game, never fully committing to a single approach.`);
      }
    }

    // Final strategy and convergence
    if (convergence.converged && convergence.finalStrategies[pid]) {
      parts.push(`Ultimately, they settled on "${convergence.finalStrategies[pid]}" as their final answer.`);
    }

    // Performance trajectory
    if (rounds.length >= 4) {
      const q1 = rounds[Math.floor(rounds.length * 0.25)].cumulativePayoffs[pid];
      const q3 = rounds[Math.floor(rounds.length * 0.75)].cumulativePayoffs[pid];
      const final = rounds[rounds.length - 1].cumulativePayoffs[pid];
      const earlyAvg = q1 / Math.floor(rounds.length * 0.25);
      const lateAvg = (final - q3) / (rounds.length - Math.floor(rounds.length * 0.75));

      if (lateAvg > earlyAvg * 1.3) {
        parts.push(`Their results improved over time — they got better as the game went on.`);
      } else if (earlyAvg > lateAvg * 1.3) {
        parts.push(`They started strong but their performance declined as opponents adapted.`);
      } else {
        parts.push(`Their performance stayed fairly consistent throughout the game.`);
      }
    }

    result[pid] = parts.join(' ');
  }

  return result;
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
  const narrative = generateNarrative(rounds, playerIds, players, convergence, config);
  const strategyNarrative = generateStrategyNarrative(rounds, playerIds, players, convergence);

  return {
    id: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    scenarioInput: analysis.title,
    analysis,
    config,
    rounds,
    convergence,
    insights,
    narrative,
    strategyNarrative,
  };
}
