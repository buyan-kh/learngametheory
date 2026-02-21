/**
 * Evolutionary population dynamics simulation engine.
 *
 * This module simulates populations of agents using different strategies
 * competing over generations. Strategies that perform well grow in
 * proportion while underperformers shrink — modeling evolutionary game theory.
 *
 * Pure TypeScript, no external dependencies.
 */

import type { GameAnalysis, PayoffCell } from './types';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PopulationConfig {
  populationSize: number;     // e.g. 100
  generations: number;        // e.g. 50
  mutationRate: number;       // 0-0.1, chance of random strategy switch
  selectionPressure: number;  // 0-1, how strongly payoff affects reproduction
}

export interface PopulationGeneration {
  generation: number;
  strategyCounts: Record<string, number>;   // strategy name -> count
  strategyFitness: Record<string, number>;  // strategy name -> avg payoff
  totalFitness: number;
}

export interface PopulationResult {
  config: PopulationConfig;
  generations: PopulationGeneration[];
  allStrategies: string[];
  dominantStrategy: string;      // strategy with most agents at end
  extinctStrategies: string[];   // strategies that reached 0
  insights: string[];
}

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
// Payoff lookup for population agents
// ---------------------------------------------------------------------------

/**
 * Look up the payoff when an agent playing `stratA` meets an agent playing
 * `stratB`. We search the payoff matrix for cells where these two strategies
 * appear (regardless of which player is assigned which strategy). The payoff
 * returned is the average of all player payoffs in the best-matching cell.
 *
 * Returns a tuple [payoffA, payoffB] — the payoff for the agent playing
 * stratA and the agent playing stratB respectively.
 */
function lookupMatchPayoffs(
  matrix: PayoffCell[],
  stratA: string,
  stratB: string,
): [number, number] {
  if (matrix.length === 0) {
    // No matrix — give a baseline payoff.
    return [3 + Math.random() * 2, 3 + Math.random() * 2];
  }

  // Try to find a cell that matches both strategies.
  // Strategy assignments in the matrix are keyed by player ID, so we need to
  // check all cells for any assignment combination that matches.
  let bestCell: PayoffCell | null = null;
  let bestScore = -1;

  for (const cell of matrix) {
    const stratValues = Object.values(cell.strategies);
    const lowerA = stratA.toLowerCase();
    const lowerB = stratB.toLowerCase();

    let score = 0;

    // Check if this cell contains both strategies (in any player slots).
    const lowerVals = stratValues.map((s) => s.toLowerCase());

    if (lowerA === lowerB) {
      // Same strategy vs itself — need at least one match.
      const matchCount = lowerVals.filter((v) => v === lowerA).length;
      if (matchCount >= 1) score = matchCount;
    } else {
      // Different strategies — ideally both appear.
      const hasA = lowerVals.some((v) => v === lowerA);
      const hasB = lowerVals.some((v) => v === lowerB);
      if (hasA && hasB) score = 2;
      else if (hasA || hasB) score = 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestCell = cell;
    }
  }

  if (bestCell && bestScore > 0) {
    const payoffValues = Object.values(bestCell.payoffs);
    const stratEntries = Object.entries(bestCell.strategies);
    const lowerA = stratA.toLowerCase();
    const lowerB = stratB.toLowerCase();

    // Try to get directional payoffs: who plays stratA gets which payoff?
    let payoffA: number | null = null;
    let payoffB: number | null = null;

    for (const [pid, strat] of stratEntries) {
      if (strat.toLowerCase() === lowerA && payoffA === null) {
        payoffA = bestCell.payoffs[pid] ?? null;
      } else if (strat.toLowerCase() === lowerB && payoffB === null) {
        payoffB = bestCell.payoffs[pid] ?? null;
      }
    }

    // If strategies are the same, both get the average payoff.
    if (lowerA === lowerB) {
      const avg = payoffValues.reduce((s, v) => s + v, 0) / payoffValues.length;
      return [avg, avg];
    }

    // Fallback to average if we couldn't resolve directional payoffs.
    const avg = payoffValues.reduce((s, v) => s + v, 0) / payoffValues.length;
    return [payoffA ?? avg, payoffB ?? avg];
  }

  // Fallback — random payoffs.
  return [2 + Math.random() * 4, 2 + Math.random() * 4];
}

// ---------------------------------------------------------------------------
// Insight generation
// ---------------------------------------------------------------------------

function generateInsights(
  generations: PopulationGeneration[],
  allStrategies: string[],
  dominantStrategy: string,
  extinctStrategies: string[],
  config: PopulationConfig,
): string[] {
  const insights: string[] = [];

  if (generations.length === 0) return insights;

  const first = generations[0];
  const last = generations[generations.length - 1];

  // 1. Dominant strategy insight
  const dominantPct = Math.round(
    ((last.strategyCounts[dominantStrategy] ?? 0) / config.populationSize) * 100,
  );
  if (dominantPct >= 90) {
    insights.push(
      `"${dominantStrategy}" achieved near-total dominance, controlling ${dominantPct}% of the population by the final generation. This strategy is evolutionarily stable — once it takes hold, it's almost impossible to displace.`,
    );
  } else if (dominantPct >= 60) {
    insights.push(
      `"${dominantStrategy}" emerged as the leading strategy with ${dominantPct}% of the population, but it didn't completely take over. Other strategies survived by finding niches or exploiting occasional matchups where they outperform the dominant approach.`,
    );
  } else {
    insights.push(
      `No single strategy dominated the population. "${dominantStrategy}" led with only ${dominantPct}% — the population maintained strategic diversity, suggesting multiple strategies can coexist in this game's ecosystem.`,
    );
  }

  // 2. Extinction insight
  if (extinctStrategies.length > 0) {
    if (extinctStrategies.length === 1) {
      insights.push(
        `"${extinctStrategies[0]}" went extinct during the simulation. In evolutionary terms, it simply couldn't compete — agents using this strategy consistently earned lower payoffs and were gradually replaced.`,
      );
    } else {
      insights.push(
        `${extinctStrategies.length} strategies went extinct: ${extinctStrategies.map((s) => `"${s}"`).join(', ')}. These approaches were outcompeted over time — a harsh reminder that in evolution, good enough isn't enough.`,
      );
    }
  } else {
    insights.push(
      `No strategies went completely extinct — every approach found a way to survive. This suggests the game rewards diversity, with each strategy performing well against certain opponents.`,
    );
  }

  // 3. Speed of change insight — how quickly did the population shift?
  if (generations.length >= 10) {
    const earlyGen = generations[Math.min(9, generations.length - 1)];
    let earlyShift = 0;
    for (const strat of allStrategies) {
      earlyShift += Math.abs(
        (earlyGen.strategyCounts[strat] ?? 0) - (first.strategyCounts[strat] ?? 0),
      );
    }
    // earlyShift counts total agent movements in first 10 generations
    const shiftRate = earlyShift / config.populationSize;

    if (shiftRate > 0.8) {
      insights.push(
        `The population restructured rapidly in the early generations — strategies that performed poorly were quickly weeded out. This game has strong evolutionary pressures that don't tolerate suboptimal play.`,
      );
    } else if (shiftRate > 0.3) {
      insights.push(
        `The population shifted gradually in the early generations, with strategies slowly gaining or losing ground. The evolutionary pressure was moderate — giving weaker strategies some time before they faded.`,
      );
    } else {
      insights.push(
        `The population barely changed in the early generations, suggesting strategies are closely matched in fitness. Small differences in payoff take many generations to produce visible shifts.`,
      );
    }
  }

  // 4. Fitness landscape insight
  const lastFitnesses = Object.entries(last.strategyFitness)
    .filter(([s]) => (last.strategyCounts[s] ?? 0) > 0)
    .map(([, f]) => f);

  if (lastFitnesses.length >= 2) {
    const maxF = Math.max(...lastFitnesses);
    const minF = Math.min(...lastFitnesses);
    const spread = maxF - minF;
    const avgF = lastFitnesses.reduce((s, v) => s + v, 0) / lastFitnesses.length;

    if (avgF > 0 && spread / avgF < 0.1) {
      insights.push(
        `By the end, surviving strategies had nearly identical fitness levels — they reached an evolutionary equilibrium where no single approach has a clear advantage. This is a classic sign of a mixed-strategy Nash equilibrium.`,
      );
    } else if (avgF > 0 && spread / avgF > 0.5) {
      insights.push(
        `There's a large fitness gap between the best and worst surviving strategies. The dominant strategy significantly outearns others, yet some weaker strategies persist — likely sustained by mutation introducing fresh agents.`,
      );
    }
  }

  // 5. Mutation impact insight
  if (config.mutationRate > 0.05) {
    insights.push(
      `The high mutation rate (${(config.mutationRate * 100).toFixed(1)}%) kept the population diverse by constantly introducing agents with random strategies. Without this, the dominant strategy would likely have taken over even faster.`,
    );
  } else if (config.mutationRate > 0) {
    insights.push(
      `A low mutation rate (${(config.mutationRate * 100).toFixed(1)}%) provided a small but steady source of strategic diversity, preventing any strategy from going permanently extinct purely by chance.`,
    );
  }

  return insights.slice(0, 5);
}

// ---------------------------------------------------------------------------
// Main simulation
// ---------------------------------------------------------------------------

export function runPopulationSimulation(
  analysis: GameAnalysis,
  config: PopulationConfig,
): PopulationResult {
  const matrix = analysis.payoffMatrix ?? [];

  // 1. Collect all unique strategies across all players.
  const strategySet = new Set<string>();
  for (const player of analysis.players) {
    if (player.strategies) {
      for (const s of player.strategies) {
        strategySet.add(s);
      }
    }
  }
  const allStrategies = Array.from(strategySet);

  // Fallback if no strategies found.
  if (allStrategies.length === 0) {
    allStrategies.push('Cooperate', 'Defect');
  }

  // 2. Initialize population — evenly distributed across strategies.
  const population: string[] = [];
  const baseCount = Math.floor(config.populationSize / allStrategies.length);
  let remainder = config.populationSize - baseCount * allStrategies.length;

  for (const strat of allStrategies) {
    const count = baseCount + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
    for (let i = 0; i < count; i++) {
      population.push(strat);
    }
  }

  // Shuffle the initial population.
  for (let i = population.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [population[i], population[j]] = [population[j], population[i]];
  }

  const generations: PopulationGeneration[] = [];

  // 3. Run each generation.
  for (let gen = 0; gen < config.generations; gen++) {
    // a. Count strategies in current population.
    const counts: Record<string, number> = {};
    for (const s of allStrategies) counts[s] = 0;
    for (const agent of population) {
      counts[agent] = (counts[agent] ?? 0) + 1;
    }

    // b. Randomly pair agents and play the game.
    //    Each agent accumulates payoff from their matchups.
    const totalPayoff: Record<string, number> = {};
    const matchCount: Record<string, number> = {};
    for (const s of allStrategies) {
      totalPayoff[s] = 0;
      matchCount[s] = 0;
    }

    // Shuffle population for random pairing.
    const shuffled = [...population];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Pair up agents. If odd number, last agent plays against a random opponent.
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      const stratA = shuffled[i];
      const stratB = shuffled[i + 1];

      const [payA, payB] = lookupMatchPayoffs(matrix, stratA, stratB);

      totalPayoff[stratA] += payA;
      matchCount[stratA] += 1;
      totalPayoff[stratB] += payB;
      matchCount[stratB] += 1;
    }

    // If odd, last agent plays against a random opponent.
    if (shuffled.length % 2 === 1) {
      const lastAgent = shuffled[shuffled.length - 1];
      const randomOpponent = pickRandom(shuffled.slice(0, -1));
      const [payA] = lookupMatchPayoffs(matrix, lastAgent, randomOpponent);
      totalPayoff[lastAgent] += payA;
      matchCount[lastAgent] += 1;
    }

    // c. Calculate average fitness for each strategy.
    const strategyFitness: Record<string, number> = {};
    let totalFit = 0;
    for (const s of allStrategies) {
      if (matchCount[s] > 0) {
        strategyFitness[s] = totalPayoff[s] / matchCount[s];
      } else {
        strategyFitness[s] = 0;
      }
      totalFit += strategyFitness[s] * (counts[s] ?? 0);
    }
    const avgFitness = config.populationSize > 0 ? totalFit / config.populationSize : 0;

    // Record generation data.
    generations.push({
      generation: gen,
      strategyCounts: { ...counts },
      strategyFitness: { ...strategyFitness },
      totalFitness: avgFitness,
    });

    // d. Selection: compute next generation proportions.
    //    fitness ^ selectionPressure determines reproductive success.
    //    selectionPressure = 0 means all strategies reproduce equally (drift).
    //    selectionPressure = 1 means full fitness-proportional selection.
    const weights: Record<string, number> = {};
    for (const s of allStrategies) {
      if (counts[s] === 0) {
        weights[s] = 0;
        continue;
      }
      // Shift fitness to be positive (at least 0.01) before exponentiation.
      const fitness = Math.max(strategyFitness[s], 0.01);
      weights[s] = counts[s] * Math.pow(fitness, config.selectionPressure);
    }

    // Normalize weights and determine next generation counts.
    const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0);
    const newCounts: Record<string, number> = {};
    let assigned = 0;

    if (totalWeight > 0) {
      // Assign proportional counts, rounding down.
      for (const s of allStrategies) {
        newCounts[s] = Math.floor((weights[s] / totalWeight) * config.populationSize);
        assigned += newCounts[s];
      }
      // Distribute remaining slots to strategies with highest fractional parts.
      const remaining = config.populationSize - assigned;
      const fractionals = allStrategies
        .map((s) => ({
          strategy: s,
          frac: ((weights[s] / totalWeight) * config.populationSize) - newCounts[s],
        }))
        .sort((a, b) => b.frac - a.frac);

      for (let i = 0; i < remaining; i++) {
        newCounts[fractionals[i].strategy]++;
      }
    } else {
      // All weights zero — distribute evenly.
      const base = Math.floor(config.populationSize / allStrategies.length);
      let rem = config.populationSize - base * allStrategies.length;
      for (const s of allStrategies) {
        newCounts[s] = base + (rem > 0 ? 1 : 0);
        if (rem > 0) rem--;
      }
    }

    // e. Mutation: each agent has mutationRate chance of switching strategy.
    //    Apply mutation to the counts (probabilistically).
    if (config.mutationRate > 0) {
      for (const s of allStrategies) {
        const agentsToMutate = Math.round(newCounts[s] * config.mutationRate);
        if (agentsToMutate > 0) {
          newCounts[s] -= agentsToMutate;
          // Distribute mutated agents randomly across all strategies.
          for (let m = 0; m < agentsToMutate; m++) {
            const target = pickRandom(allStrategies);
            newCounts[target] = (newCounts[target] ?? 0) + 1;
          }
        }
      }
    }

    // Rebuild the population array from counts.
    population.length = 0;
    for (const s of allStrategies) {
      const count = Math.max(newCounts[s] ?? 0, 0);
      for (let i = 0; i < count; i++) {
        population.push(s);
      }
    }

    // Ensure population size is exactly right (handle rounding).
    while (population.length < config.populationSize) {
      population.push(pickRandom(allStrategies));
    }
    while (population.length > config.populationSize) {
      population.pop();
    }

    // Shuffle for next generation's pairing.
    for (let i = population.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [population[i], population[j]] = [population[j], population[i]];
    }
  }

  // 4. Determine dominant strategy and extinct strategies.
  const lastGen = generations[generations.length - 1];
  let dominantStrategy = allStrategies[0];
  let maxCount = 0;

  for (const s of allStrategies) {
    const count = lastGen?.strategyCounts[s] ?? 0;
    if (count > maxCount) {
      maxCount = count;
      dominantStrategy = s;
    }
  }

  const extinctStrategies = allStrategies.filter(
    (s) => (lastGen?.strategyCounts[s] ?? 0) === 0,
  );

  // 5. Generate insights.
  const insights = generateInsights(
    generations,
    allStrategies,
    dominantStrategy,
    extinctStrategies,
    config,
  );

  return {
    config,
    generations,
    allStrategies,
    dominantStrategy,
    extinctStrategies,
    insights,
  };
}
