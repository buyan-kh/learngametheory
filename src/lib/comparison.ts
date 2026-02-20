import { GameAnalysis, ComparisonData, ComparisonDifference } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCENARIO_LABELS = ['A', 'B', 'C', 'D'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Return the label for a scenario at the given index (e.g. "Scenario A").
 */
function label(index: number): string {
  return `Scenario ${SCENARIO_LABELS[index] ?? index + 1}`;
}

/**
 * Compute the average of an array of numbers.  Returns 0 for empty arrays.
 */
function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Round a number to one decimal place for human-readable output.
 */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Collect every payoff value from all outcomes of a single analysis.
 */
function allPayoffs(analysis: GameAnalysis): number[] {
  return analysis.outcomes.flatMap((o) => Object.values(o.payoffs));
}

// ---------------------------------------------------------------------------
// computeStrategyOverlap
// ---------------------------------------------------------------------------

/**
 * Compute the overlap of strategies between scenarios using Jaccard
 * similarity: |intersection| / |union|.
 *
 * Strategy names are compared in lower-case so that casing differences are
 * ignored.  Returns 0 when there are fewer than two scenarios or no
 * strategies exist at all.
 */
export function computeStrategyOverlap(scenarios: GameAnalysis[]): number {
  if (scenarios.length < 2) return 0;

  const sets = scenarios.map(
    (s) => new Set(s.strategies.map((st) => st.name.toLowerCase())),
  );

  // Build the union and intersection across all scenario sets.
  const union = new Set<string>();
  sets.forEach((set) => set.forEach((name) => union.add(name)));

  if (union.size === 0) return 0;

  // The intersection contains only names present in *every* set.
  const intersection = new Set<string>(
    Array.from(union).filter((name) => sets.every((set) => set.has(name))),
  );

  return intersection.size / union.size;
}

// ---------------------------------------------------------------------------
// computePayoffDeltas
// ---------------------------------------------------------------------------

/**
 * Compute average payoff per player role for each scenario.
 *
 * For every scenario the function groups strategies by the player's role
 * (lower-cased) and averages the expectedPayoff values within each group.
 *
 * @returns An array (one entry per scenario) of objects mapping role names to
 *          their average payoff.
 */
export function computePayoffDeltas(
  scenarios: GameAnalysis[],
): Record<string, number>[] {
  return scenarios.map((scenario) => {
    // Build a lookup from player id to their role (lower-cased).
    const roleById: Record<string, string> = {};
    for (const player of scenario.players) {
      roleById[player.id] = player.role.toLowerCase();
    }

    // Accumulate payoffs per role.
    const totals: Record<string, { sum: number; count: number }> = {};

    for (const strategy of scenario.strategies) {
      const role = roleById[strategy.playerId] ?? strategy.playerId;
      if (!totals[role]) {
        totals[role] = { sum: 0, count: 0 };
      }
      totals[role].sum += strategy.expectedPayoff;
      totals[role].count += 1;
    }

    // Compute averages.
    const result: Record<string, number> = {};
    for (const [role, { sum, count }] of Object.entries(totals)) {
      result[role] = count > 0 ? sum / count : 0;
    }

    return result;
  });
}

// ---------------------------------------------------------------------------
// generateDifferences
// ---------------------------------------------------------------------------

/**
 * Generate human-readable difference descriptions across several categories.
 *
 * The function inspects game type, player count, payoff values, Nash
 * equilibria, outcomes, strategy risk profiles, risk orientation, and
 * cooperation/competition balance.
 */
export function generateDifferences(
  scenarios: GameAnalysis[],
): ComparisonDifference[] {
  if (scenarios.length < 2) return [];

  const differences: ComparisonDifference[] = [];
  const labels = scenarios.map((_, i) => SCENARIO_LABELS[i] ?? `${i + 1}`);

  // --- gameType --------------------------------------------------------- //
  const gameTypes = scenarios.map((s) => s.gameType);
  const uniqueTypes = new Set(gameTypes);

  if (uniqueTypes.size > 1) {
    const parts = scenarios.map((s, i) => `${label(i)} is a ${s.gameType}`);
    differences.push({
      category: 'gameType',
      description: `${parts.join(' while ')}.`,
      scenarioLabels: labels,
    });
  } else {
    differences.push({
      category: 'gameType',
      description: `All scenarios are ${gameTypes[0]} games.`,
      scenarioLabels: labels,
    });
  }

  // --- players ---------------------------------------------------------- //
  const playerCounts = scenarios.map((s) => s.players.length);
  const uniqueCounts = new Set(playerCounts);

  if (uniqueCounts.size > 1) {
    const parts = scenarios.map(
      (s, i) => `${label(i)} has ${s.players.length} player${s.players.length !== 1 ? 's' : ''}`,
    );
    differences.push({
      category: 'players',
      description: `${parts.join(', ')}.`,
      scenarioLabels: labels,
    });
  } else {
    differences.push({
      category: 'players',
      description: `All scenarios have ${playerCounts[0]} player${playerCounts[0] !== 1 ? 's' : ''}.`,
      scenarioLabels: labels,
    });
  }

  // --- payoffs ---------------------------------------------------------- //
  const averages = scenarios.map((s) => round1(avg(allPayoffs(s))));
  const maxAvg = Math.max(...averages);
  const minAvg = Math.min(...averages);

  if (maxAvg !== minAvg) {
    const highIdx = averages.indexOf(maxAvg);
    const lowIdx = averages.indexOf(minAvg);
    differences.push({
      category: 'payoffs',
      description:
        `${label(highIdx)} has the highest average payoffs (${maxAvg}) ` +
        `while ${label(lowIdx)} has the lowest (${minAvg}).`,
      scenarioLabels: labels,
    });
  } else {
    differences.push({
      category: 'payoffs',
      description: `All scenarios have similar average payoffs (${maxAvg}).`,
      scenarioLabels: labels,
    });
  }

  // --- nash ------------------------------------------------------------- //
  const nashDescriptions = scenarios.map((s) => s.nashEquilibrium.trim().toLowerCase());
  const uniqueNash = new Set(nashDescriptions);

  if (uniqueNash.size > 1) {
    differences.push({
      category: 'nash',
      description: 'The scenarios have different Nash equilibria.',
      scenarioLabels: labels,
    });
  } else {
    differences.push({
      category: 'nash',
      description: 'All scenarios share the same Nash equilibrium structure.',
      scenarioLabels: labels,
    });
  }

  // --- outcomes --------------------------------------------------------- //
  const outcomeCounts = scenarios.map((s) => s.outcomes.length);
  const maxOutcomes = Math.max(...outcomeCounts);
  const uniqueOutcomeCounts = new Set(outcomeCounts);

  if (uniqueOutcomeCounts.size > 1) {
    const bestIdx = outcomeCounts.indexOf(maxOutcomes);
    differences.push({
      category: 'outcomes',
      description: `${label(bestIdx)} has the most possible outcomes (${maxOutcomes}).`,
      scenarioLabels: labels,
    });
  } else {
    differences.push({
      category: 'outcomes',
      description: `All scenarios have ${outcomeCounts[0]} possible outcome${outcomeCounts[0] !== 1 ? 's' : ''}.`,
      scenarioLabels: labels,
    });
  }

  // --- strategies (risk profiles) --------------------------------------- //
  const riskProfiles = scenarios.map((s) => {
    const counts: Record<string, number> = { low: 0, medium: 0, high: 0 };
    for (const st of s.strategies) {
      counts[st.risk] = (counts[st.risk] ?? 0) + 1;
    }
    // Determine the dominant risk level.
    const dominant = (Object.entries(counts) as [string, number][]).reduce(
      (a, b) => (b[1] > a[1] ? b : a),
      ['medium', 0],
    )[0];
    return dominant;
  });

  const uniqueRiskProfiles = new Set(riskProfiles);

  if (uniqueRiskProfiles.size > 1) {
    const parts = scenarios.map(
      (_, i) => `${label(i)} has predominantly ${riskProfiles[i]}-risk strategies`,
    );
    differences.push({
      category: 'strategies',
      description: `${parts.join(', ')}.`,
      scenarioLabels: labels,
    });
  } else {
    differences.push({
      category: 'strategies',
      description: `All scenarios have predominantly ${riskProfiles[0]}-risk strategies.`,
      scenarioLabels: labels,
    });
  }

  // --- risk (cooperative vs competitive orientation) -------------------- //
  const cooperativeRatios = scenarios.map((s) => {
    const total = s.connections.length;
    if (total === 0) return 0;
    const cooperative = s.connections.filter((c) => c.type === 'cooperation').length;
    return cooperative / total;
  });

  const competitiveRatios = scenarios.map((s) => {
    const total = s.connections.length;
    if (total === 0) return 0;
    const competitive = s.connections.filter((c) => c.type === 'competition').length;
    return competitive / total;
  });

  const mostCoopIdx = cooperativeRatios.indexOf(Math.max(...cooperativeRatios));
  const mostCompIdx = competitiveRatios.indexOf(Math.max(...competitiveRatios));

  if (mostCoopIdx !== mostCompIdx) {
    differences.push({
      category: 'risk',
      description:
        `${label(mostCoopIdx)} leans more cooperative while ` +
        `${label(mostCompIdx)} leans more competitive.`,
      scenarioLabels: labels,
    });
  } else {
    differences.push({
      category: 'risk',
      description: 'All scenarios have a similar cooperative-competitive balance.',
      scenarioLabels: labels,
    });
  }

  // --- cooperation ------------------------------------------------------ //
  const cooperationCounts = scenarios.map(
    (s) => s.connections.filter((c) => c.type === 'cooperation').length,
  );
  const competitionCounts = scenarios.map(
    (s) => s.connections.filter((c) => c.type === 'competition').length,
  );

  const mostCooperative = cooperationCounts.indexOf(Math.max(...cooperationCounts));
  const mostCompetitive = competitionCounts.indexOf(Math.max(...competitionCounts));

  if (cooperationCounts[mostCooperative] !== competitionCounts[mostCompetitive]) {
    if (cooperationCounts[mostCooperative] > competitionCounts[mostCompetitive]) {
      differences.push({
        category: 'cooperation',
        description: `${label(mostCooperative)} is more cooperative in nature.`,
        scenarioLabels: labels,
      });
    } else {
      differences.push({
        category: 'cooperation',
        description: `${label(mostCompetitive)} is more competitive in nature.`,
        scenarioLabels: labels,
      });
    }
  } else {
    differences.push({
      category: 'cooperation',
      description: 'The scenarios are evenly balanced between cooperation and competition.',
      scenarioLabels: labels,
    });
  }

  return differences;
}

// ---------------------------------------------------------------------------
// compareScenarios
// ---------------------------------------------------------------------------

/**
 * Compare multiple game theory analyses and compute a comprehensive
 * comparison result containing differences, payoff deltas, and strategy
 * overlap.
 */
export function compareScenarios(scenarios: GameAnalysis[]): ComparisonData {
  return {
    scenarios,
    differences: generateDifferences(scenarios),
    payoffDeltas: computePayoffDeltas(scenarios),
    strategyOverlap: computeStrategyOverlap(scenarios),
  };
}
