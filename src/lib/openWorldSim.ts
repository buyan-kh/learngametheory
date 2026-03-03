/**
 * Open World Simulation Engine
 *
 * Unlike the classic simulation which uses fixed algorithms (tit-for-tat, greedy, etc.),
 * this engine simulates a dynamic, multi-player world where players have personalities,
 * resources, alliances, and custom actions. Players make decisions based on their
 * personality traits, current resources, relationships, and game state — mimicking
 * real-world strategic complexity.
 *
 * Supports: geopolitics, financial markets, corporate competition, social dynamics,
 * and any scenario the user can dream up.
 *
 * Pure TypeScript, no external dependencies.
 */

import type {
  OpenWorldPlayer,
  OpenWorldRelationship,
  OpenWorldAction,
  OpenWorldEvent,
  OpenWorldShock,
  OpenWorldRule,
  OpenWorldTurnState,
  OpenWorldConfig,
  OpenWorldResult,
} from './types';

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

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

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Action Generation — dynamically create available actions per player
// ---------------------------------------------------------------------------

/**
 * Generate the set of possible actions for a player given the current world state.
 * Actions depend on the player's resources, relationships, and personality.
 */
function generateActions(
  player: OpenWorldPlayer,
  allPlayers: OpenWorldPlayer[],
  relationships: OpenWorldRelationship[],
  turnStates: OpenWorldTurnState[],
  config: OpenWorldConfig,
): OpenWorldAction[] {
  const actions: OpenWorldAction[] = [];
  const otherPlayers = allPlayers.filter((p) => p.id !== player.id);
  const lastTurn = turnStates.length > 0 ? turnStates[turnStates.length - 1] : null;
  const playerState = lastTurn?.playerStates[player.id];

  if (playerState?.status !== 'active' && playerState) return actions;

  // --- Universal actions (always available) ---

  // 1. Cooperate / Form Alliance
  for (const other of otherPlayers) {
    const rel = relationships.find(
      (r) => (r.fromId === player.id && r.toId === other.id) ||
             (r.toId === player.id && r.fromId === other.id),
    );
    const isAlly = player.alliances.includes(other.id);
    const isRival = player.rivals.includes(other.id);
    const otherState = lastTurn?.playerStates[other.id];
    if (otherState?.status !== 'active' && otherState) continue;

    if (!isAlly) {
      actions.push({
        id: `cooperate_${other.id}`,
        name: `Form Alliance with ${other.name}`,
        description: `Propose cooperation with ${other.name}. Strengthens mutual payoffs but creates dependency.`,
        category: 'cooperative',
        targetPlayerId: other.id,
        resourceCost: {},
        successProbability: clamp(
          0.3 + (rel?.strength ?? 0) * 0.3 + player.personalityTraits.cooperation * 0.2 + config.diplomacyWeight * 0.2,
          0.1, 0.95,
        ),
        payoffOnSuccess: { [player.id]: 2, [other.id]: 2 },
        payoffOnFailure: { [player.id]: -1 },
        prerequisites: [],
      });
    }

    // 2. Aggressive action
    if (!isAlly || isRival) {
      const resourceNames = player.resources.map((r) => r.name);
      const mainResource = resourceNames[0] || 'power';
      actions.push({
        id: `attack_${other.id}`,
        name: `Challenge ${other.name}`,
        description: `Take aggressive action against ${other.name}. High risk, high reward.`,
        category: 'aggressive',
        targetPlayerId: other.id,
        resourceCost: { [mainResource]: 2 },
        successProbability: clamp(
          0.2 + player.personalityTraits.aggression * 0.3 + player.personalityTraits.riskTolerance * 0.2 - (rel?.strength ?? 0) * 0.1,
          0.1, 0.8,
        ),
        payoffOnSuccess: { [player.id]: 5, [other.id]: -4 },
        payoffOnFailure: { [player.id]: -3, [other.id]: 1 },
        prerequisites: [],
      });
    }

    // 3. Trade / Economic action
    actions.push({
      id: `trade_${other.id}`,
      name: `Trade with ${other.name}`,
      description: `Engage in economic exchange. Both sides benefit if terms are fair.`,
      category: 'economic',
      targetPlayerId: other.id,
      resourceCost: {},
      successProbability: clamp(
        0.5 + (rel?.strength ?? 0) * 0.2 + config.diplomacyWeight * 0.1,
        0.2, 0.95,
      ),
      payoffOnSuccess: { [player.id]: 1.5, [other.id]: 1.5 },
      payoffOnFailure: { [player.id]: -0.5, [other.id]: -0.5 },
      prerequisites: [],
    });

    // 4. Diplomatic pressure
    if (isRival || (rel && rel.strength < 0)) {
      actions.push({
        id: `diplomacy_${other.id}`,
        name: `Pressure ${other.name}`,
        description: `Use diplomatic leverage to force concessions.`,
        category: 'diplomatic',
        targetPlayerId: other.id,
        resourceCost: {},
        successProbability: clamp(
          0.3 + player.personalityTraits.rationality * 0.2 + config.diplomacyWeight * 0.3,
          0.1, 0.7,
        ),
        payoffOnSuccess: { [player.id]: 3, [other.id]: -2 },
        payoffOnFailure: { [player.id]: -1, [other.id]: 0 },
        prerequisites: [],
      });
    }

    // 5. Deceptive action (betray alliance)
    if (isAlly && player.personalityTraits.aggression > 0.5) {
      actions.push({
        id: `betray_${other.id}`,
        name: `Betray ${other.name}`,
        description: `Break the alliance for personal gain. Devastating if discovered.`,
        category: 'deceptive',
        targetPlayerId: other.id,
        resourceCost: {},
        successProbability: clamp(
          0.2 + (1 - player.personalityTraits.cooperation) * 0.3 + config.informationAsymmetry * 0.3,
          0.05, 0.6,
        ),
        payoffOnSuccess: { [player.id]: 6, [other.id]: -5 },
        payoffOnFailure: { [player.id]: -4, [other.id]: 2 },
        prerequisites: [],
      });
    }
  }

  // 6. Defensive action (always available)
  actions.push({
    id: `defend_${player.id}`,
    name: 'Fortify Position',
    description: 'Focus on defense and resource accumulation. Safe but slow.',
    category: 'defensive',
    resourceCost: {},
    successProbability: 0.9,
    payoffOnSuccess: { [player.id]: 1 },
    payoffOnFailure: { [player.id]: 0.5 },
    prerequisites: [],
  });

  // 7. Economic investment
  if (player.resources.length > 0) {
    actions.push({
      id: `invest_${player.id}`,
      name: 'Invest Resources',
      description: 'Invest in growth. Returns compound over time.',
      category: 'economic',
      resourceCost: { [player.resources[0].name]: 1 },
      successProbability: clamp(
        0.4 + player.personalityTraits.patience * 0.3 + player.personalityTraits.rationality * 0.2,
        0.2, 0.85,
      ),
      payoffOnSuccess: { [player.id]: 3 },
      payoffOnFailure: { [player.id]: -1 },
      prerequisites: [],
    });
  }

  return actions;
}

// ---------------------------------------------------------------------------
// Decision Engine — personality-driven action selection
// ---------------------------------------------------------------------------

/**
 * Score each available action for a player based on their personality,
 * relationships, and current game state. Returns the chosen action.
 */
function chooseAction(
  player: OpenWorldPlayer,
  actions: OpenWorldAction[],
  relationships: OpenWorldRelationship[],
  turnStates: OpenWorldTurnState[],
  config: OpenWorldConfig,
): OpenWorldAction {
  if (actions.length === 0) {
    // Fallback: do nothing / defend
    return {
      id: `noop_${player.id}`,
      name: 'Wait',
      description: 'No viable actions — waiting.',
      category: 'defensive',
      resourceCost: {},
      successProbability: 1,
      payoffOnSuccess: { [player.id]: 0.5 },
      payoffOnFailure: { [player.id]: 0 },
      prerequisites: [],
    };
  }

  const traits = player.personalityTraits;
  const scores: number[] = [];
  const lastTurn = turnStates.length > 0 ? turnStates[turnStates.length - 1] : null;
  const worldTension = lastTurn?.worldState.tension ?? 0.3;

  for (const action of actions) {
    let score = 0;

    // Base: expected value
    const mySuccessPayoff = action.payoffOnSuccess[player.id] ?? 0;
    const myFailPayoff = action.payoffOnFailure[player.id] ?? 0;
    const ev = mySuccessPayoff * action.successProbability +
               myFailPayoff * (1 - action.successProbability);
    score += ev * 2;

    // Personality modifiers
    switch (action.category) {
      case 'aggressive':
        score += traits.aggression * 4;
        score += traits.riskTolerance * 2;
        score -= traits.cooperation * 2;
        score += worldTension * 1.5; // tension breeds aggression
        break;
      case 'cooperative':
        score += traits.cooperation * 4;
        score -= traits.aggression * 1;
        score += traits.patience * 1.5;
        score -= worldTension * 1;
        break;
      case 'defensive':
        score += (1 - traits.riskTolerance) * 3;
        score += traits.patience * 2;
        score += worldTension * 0.5; // slight boost when tense
        break;
      case 'economic':
        score += traits.rationality * 3;
        score += traits.patience * 2;
        score -= worldTension * 0.5;
        break;
      case 'diplomatic':
        score += traits.rationality * 2;
        score += traits.cooperation * 1.5;
        score += config.diplomacyWeight * 3;
        break;
      case 'deceptive':
        score += traits.aggression * 3;
        score += (1 - traits.cooperation) * 3;
        score += traits.riskTolerance * 2;
        score -= traits.rationality * 1; // rational players avoid risky betrayals
        break;
    }

    // Relationship modifiers
    if (action.targetPlayerId) {
      const rel = relationships.find(
        (r) => (r.fromId === player.id && r.toId === action.targetPlayerId) ||
               (r.toId === player.id && r.fromId === action.targetPlayerId),
      );
      if (rel) {
        if (action.category === 'aggressive' || action.category === 'deceptive') {
          score -= rel.strength * 3; // less likely to attack friends
        } else if (action.category === 'cooperative' || action.category === 'economic') {
          score += rel.strength * 2; // more likely to cooperate with friends
        }
      }
    }

    // Momentum: players tend to repeat successful strategies
    if (turnStates.length > 0) {
      const recentEvents = turnStates.slice(-3).flatMap((t) => t.events);
      const playerEvents = recentEvents.filter((e) => e.playerId === player.id);
      const recentSuccesses = playerEvents.filter(
        (e) => e.succeeded && e.action.category === action.category,
      ).length;
      score += recentSuccesses * 1.5;
    }

    // Resource constraints: penalize actions that cost more than player has
    if (Object.keys(action.resourceCost).length > 0) {
      for (const [resName, cost] of Object.entries(action.resourceCost)) {
        const playerRes = player.resources.find((r) => r.name === resName);
        if (!playerRes || playerRes.amount < cost) {
          score -= 10; // heavy penalty for unaffordable actions
        }
      }
    }

    // Slight randomness for unpredictability (bounded by rationality)
    const noise = (Math.random() - 0.5) * (2 - traits.rationality * 1.5);
    score += noise;

    scores.push(Math.max(score, 0.01));
  }

  return weightedRandom(actions, scores);
}

// ---------------------------------------------------------------------------
// Shock generation
// ---------------------------------------------------------------------------

function generateDefaultShocks(
  players: OpenWorldPlayer[],
  config: OpenWorldConfig,
): OpenWorldShock[] {
  if (!config.enableShocks) return [];

  const shocks: OpenWorldShock[] = [];
  const shockTemplates = [
    {
      name: 'Market Crash',
      description: 'A sudden economic downturn affects all players with economic interests.',
      probability: 0.08 * config.shockFrequency,
    },
    {
      name: 'Technological Breakthrough',
      description: 'A game-changing innovation shifts the balance of power.',
      probability: 0.05 * config.shockFrequency,
    },
    {
      name: 'Natural Disaster',
      description: 'An unforeseen catastrophe disrupts normal operations.',
      probability: 0.06 * config.shockFrequency,
    },
    {
      name: 'Political Upheaval',
      description: 'Internal political changes force players to reconsider strategies.',
      probability: 0.07 * config.shockFrequency,
    },
    {
      name: 'Resource Discovery',
      description: 'New resources are discovered, creating opportunities and conflicts.',
      probability: 0.04 * config.shockFrequency,
    },
    {
      name: 'Alliance Collapse',
      description: 'A major alliance breaks apart, reshuffling relationships.',
      probability: 0.05 * config.shockFrequency,
    },
    {
      name: 'Public Opinion Shift',
      description: 'A shift in public sentiment changes the rules of engagement.',
      probability: 0.06 * config.shockFrequency,
    },
    {
      name: 'Sanctions / Embargo',
      description: 'Economic restrictions imposed on a major player.',
      probability: 0.05 * config.shockFrequency,
    },
  ];

  for (const template of shockTemplates) {
    const effects = players.map((p) => {
      const impact = (Math.random() - 0.3) * 6; // can be positive or negative
      const resChanges: Record<string, number> = {};
      if (p.resources.length > 0) {
        resChanges[p.resources[0].name] = Math.round(impact);
      }
      return {
        playerId: p.id,
        resourceChanges: resChanges,
        payoffDelta: Math.round(impact * 10) / 10,
      };
    });

    shocks.push({
      id: `shock_${generateId()}`,
      name: template.name,
      description: template.description,
      turn: 0, // will be set when triggered
      probability: template.probability,
      effects,
      triggered: false,
    });
  }

  return shocks;
}

// ---------------------------------------------------------------------------
// Relationship evolution
// ---------------------------------------------------------------------------

function evolveRelationships(
  relationships: OpenWorldRelationship[],
  events: OpenWorldEvent[],
  players: OpenWorldPlayer[],
  config: OpenWorldConfig,
): OpenWorldRelationship[] {
  return relationships.map((rel) => {
    let strengthDelta = 0;

    // Events between these two players affect the relationship
    for (const event of events) {
      const isAboutThisRel =
        (event.playerId === rel.fromId && event.targetPlayerId === rel.toId) ||
        (event.playerId === rel.toId && event.targetPlayerId === rel.fromId);

      if (!isAboutThisRel) continue;

      switch (event.action.category) {
        case 'cooperative':
          strengthDelta += event.succeeded ? 0.15 : 0.05;
          break;
        case 'aggressive':
          strengthDelta -= event.succeeded ? 0.25 : 0.1;
          break;
        case 'economic':
          strengthDelta += event.succeeded ? 0.1 : -0.05;
          break;
        case 'diplomatic':
          strengthDelta += event.succeeded ? 0.05 : -0.1;
          break;
        case 'deceptive':
          strengthDelta -= event.succeeded ? 0.4 : 0.15;
          break;
        case 'defensive':
          break; // no effect
      }
    }

    // Alliance flexibility: relationships drift toward neutral over time
    const drift = rel.strength * -0.02 * config.allianceFlexibility;
    strengthDelta += drift;

    const newStrength = clamp(rel.strength + strengthDelta, -1, 1);

    // Update relationship type based on strength
    let newType = rel.type;
    if (newStrength > 0.5) newType = 'alliance';
    else if (newStrength > 0.2) newType = 'trade';
    else if (newStrength > -0.2) newType = 'neutral';
    else if (newStrength > -0.5) newType = 'rivalry';
    else newType = 'threat';

    const historyEntry = strengthDelta !== 0
      ? `Turn: strength ${strengthDelta > 0 ? '+' : ''}${strengthDelta.toFixed(2)}`
      : undefined;

    return {
      ...rel,
      strength: newStrength,
      type: newType,
      history: historyEntry
        ? [...rel.history.slice(-9), historyEntry]
        : rel.history,
    };
  });
}

// ---------------------------------------------------------------------------
// Alliance / Rival updates on players
// ---------------------------------------------------------------------------

function updatePlayerAlliances(
  players: OpenWorldPlayer[],
  relationships: OpenWorldRelationship[],
): OpenWorldPlayer[] {
  return players.map((p) => {
    const alliances: string[] = [];
    const rivals: string[] = [];
    for (const rel of relationships) {
      const otherId = rel.fromId === p.id ? rel.toId : (rel.toId === p.id ? rel.fromId : null);
      if (!otherId) continue;
      if (rel.strength > 0.3) alliances.push(otherId);
      else if (rel.strength < -0.3) rivals.push(otherId);
    }
    return { ...p, alliances, rivals };
  });
}

// ---------------------------------------------------------------------------
// Resource regeneration
// ---------------------------------------------------------------------------

function regenerateResources(player: OpenWorldPlayer, config: OpenWorldConfig): OpenWorldPlayer {
  const newResources = player.resources.map((r) => {
    const regen = r.regenerationRate * (1 - config.resourceScarcity * 0.5);
    return {
      ...r,
      amount: Math.min(r.amount + regen, r.maxAmount),
    };
  });
  return { ...player, resources: newResources };
}

// ---------------------------------------------------------------------------
// Narrative generation
// ---------------------------------------------------------------------------

function generateTurnNarrative(
  turn: number,
  events: OpenWorldEvent[],
  shocksTriggered: OpenWorldShock[],
  players: OpenWorldPlayer[],
  worldState: OpenWorldTurnState['worldState'],
): string {
  const parts: string[] = [];
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id;

  // Turn header
  parts.push(`Turn ${turn}:`);

  // World state description
  if (worldState.tension > 0.7) {
    parts.push('Tensions are at a breaking point.');
  } else if (worldState.tension > 0.4) {
    parts.push('The atmosphere is tense but manageable.');
  } else {
    parts.push('Relative calm prevails.');
  }

  // Shocks
  for (const shock of shocksTriggered) {
    parts.push(`A major event rocks the world: ${shock.name} — ${shock.description}`);
  }

  // Key events (most impactful first)
  const sortedEvents = [...events].sort((a, b) => {
    const impactA = Object.values(a.impact).reduce((s, v) => s + Math.abs(v), 0);
    const impactB = Object.values(b.impact).reduce((s, v) => s + Math.abs(v), 0);
    return impactB - impactA;
  });

  const topEvents = sortedEvents.slice(0, Math.min(5, sortedEvents.length));
  for (const event of topEvents) {
    const target = event.targetPlayerId ? ` targeting ${nameOf(event.targetPlayerId)}` : '';
    const result = event.succeeded ? 'succeeded' : 'failed';
    parts.push(
      `${nameOf(event.playerId)} attempted "${event.action.name}"${target} and ${result}. ${event.narrativeDetail}`,
    );
  }

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Event narrative detail generation
// ---------------------------------------------------------------------------

function generateEventNarrative(
  event: Omit<OpenWorldEvent, 'narrativeDetail'>,
  players: OpenWorldPlayer[],
): string {
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id;
  const playerName = nameOf(event.playerId);
  const targetName = event.targetPlayerId ? nameOf(event.targetPlayerId) : '';

  if (event.succeeded) {
    switch (event.action.category) {
      case 'aggressive':
        return `${playerName} gains the upper hand against ${targetName}, shifting the balance of power.`;
      case 'cooperative':
        return `A new partnership forms between ${playerName} and ${targetName}, strengthening both positions.`;
      case 'defensive':
        return `${playerName} consolidates their position, building a stronger foundation.`;
      case 'economic':
        return targetName
          ? `The deal between ${playerName} and ${targetName} pays off for both parties.`
          : `${playerName}'s investment begins to yield returns.`;
      case 'diplomatic':
        return `${playerName}'s diplomatic maneuvering forces ${targetName} to make concessions.`;
      case 'deceptive':
        return `${playerName}'s betrayal catches ${targetName} completely off guard — a devastating blow.`;
    }
  } else {
    switch (event.action.category) {
      case 'aggressive':
        return `${playerName}'s gambit against ${targetName} backfires, weakening their own position.`;
      case 'cooperative':
        return `${playerName}'s overture to ${targetName} is rejected — trust remains low.`;
      case 'defensive':
        return `${playerName}'s defensive preparations were insufficient.`;
      case 'economic':
        return `${playerName}'s economic venture didn't pan out as hoped.`;
      case 'diplomatic':
        return `${playerName}'s diplomatic pressure on ${targetName} falls flat.`;
      case 'deceptive':
        return `${playerName}'s deception is exposed! ${targetName} retaliates with fury.`;
    }
  }
  return '';
}

// ---------------------------------------------------------------------------
// Final narrative generation
// ---------------------------------------------------------------------------

function generateFinalNarrative(
  turns: OpenWorldTurnState[],
  players: OpenWorldPlayer[],
  winner: string | null,
  eliminatedPlayers: string[],
): string {
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id;
  const parts: string[] = [];

  if (turns.length === 0) return 'The simulation produced no turns.';

  const lastTurn = turns[turns.length - 1];

  // Opening
  parts.push(
    `Over ${turns.length} turns, ${players.length} players competed in a complex strategic landscape.`,
  );

  // Winner
  if (winner) {
    parts.push(`${nameOf(winner)} emerged as the dominant force, outmaneuvering all opponents.`);
  } else {
    // Find the highest cumulative payoff
    const scores = Object.entries(lastTurn.playerStates)
      .filter(([, s]) => s.status === 'active')
      .sort((a, b) => b[1].cumulativePayoff - a[1].cumulativePayoff);
    if (scores.length > 0) {
      parts.push(
        `${nameOf(scores[0][0])} led the final standings, though no outright victory was achieved.`,
      );
    }
  }

  // Eliminated players
  if (eliminatedPlayers.length > 0) {
    const names = eliminatedPlayers.map(nameOf);
    parts.push(
      `${names.join(', ')} ${names.length === 1 ? 'was' : 'were'} eliminated during the course of events.`,
    );
  }

  // Tension arc
  const tensions = turns.map((t) => t.worldState.tension);
  const avgTension = tensions.reduce((s, t) => s + t, 0) / tensions.length;
  const maxTension = Math.max(...tensions);
  const maxTensionTurn = tensions.indexOf(maxTension) + 1;

  if (avgTension > 0.6) {
    parts.push(
      `The world remained in a constant state of high tension throughout, with peak crisis at turn ${maxTensionTurn}.`,
    );
  } else if (avgTension > 0.35) {
    parts.push(
      `Tensions ebbed and flowed, reaching a critical point at turn ${maxTensionTurn}.`,
    );
  } else {
    parts.push(
      `Despite occasional flare-ups (peaking at turn ${maxTensionTurn}), the overall atmosphere remained relatively stable.`,
    );
  }

  // Key turning points
  const bigEvents = turns.flatMap((t) => t.events)
    .filter((e) => {
      const totalImpact = Object.values(e.impact).reduce((s, v) => s + Math.abs(v), 0);
      return totalImpact > 6;
    })
    .slice(0, 3);

  if (bigEvents.length > 0) {
    parts.push('Key moments that shaped the outcome:');
    for (const event of bigEvents) {
      parts.push(`Turn ${event.turn}: ${event.description}`);
    }
  }

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Insight generation
// ---------------------------------------------------------------------------

function generateInsights(
  turns: OpenWorldTurnState[],
  players: OpenWorldPlayer[],
  relationships: OpenWorldRelationship[],
  eliminatedPlayers: string[],
): string[] {
  const insights: string[] = [];
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id;

  if (turns.length === 0) return insights;

  const lastTurn = turns[turns.length - 1];

  // 1. Most aggressive player
  const aggressionCounts: Record<string, number> = {};
  for (const turn of turns) {
    for (const event of turn.events) {
      if (event.action.category === 'aggressive' || event.action.category === 'deceptive') {
        aggressionCounts[event.playerId] = (aggressionCounts[event.playerId] ?? 0) + 1;
      }
    }
  }
  const mostAggressive = Object.entries(aggressionCounts).sort((a, b) => b[1] - a[1])[0];
  if (mostAggressive) {
    insights.push(
      `${nameOf(mostAggressive[0])} was the most aggressive player, taking ${mostAggressive[1]} hostile actions throughout the simulation.`,
    );
  }

  // 2. Most cooperative player
  const coopCounts: Record<string, number> = {};
  for (const turn of turns) {
    for (const event of turn.events) {
      if (event.action.category === 'cooperative' || event.action.category === 'economic') {
        coopCounts[event.playerId] = (coopCounts[event.playerId] ?? 0) + 1;
      }
    }
  }
  const mostCooperative = Object.entries(coopCounts).sort((a, b) => b[1] - a[1])[0];
  if (mostCooperative) {
    insights.push(
      `${nameOf(mostCooperative[0])} favored cooperation and trade, making ${mostCooperative[1]} constructive moves.`,
    );
  }

  // 3. Relationship dynamics
  const strongAlliances = relationships.filter((r) => r.strength > 0.5);
  const bitterRivalries = relationships.filter((r) => r.strength < -0.5);
  if (strongAlliances.length > 0) {
    const allianceDesc = strongAlliances
      .map((r) => `${nameOf(r.fromId)}-${nameOf(r.toId)}`)
      .join(', ');
    insights.push(`Strong alliances formed: ${allianceDesc}. These partnerships significantly influenced outcomes.`);
  }
  if (bitterRivalries.length > 0) {
    const rivalryDesc = bitterRivalries
      .map((r) => `${nameOf(r.fromId)} vs ${nameOf(r.toId)}`)
      .join(', ');
    insights.push(`Bitter rivalries defined the conflict: ${rivalryDesc}.`);
  }

  // 4. Success rates by strategy type
  const categorySuccess: Record<string, { total: number; succeeded: number }> = {};
  for (const turn of turns) {
    for (const event of turn.events) {
      const cat = event.action.category;
      if (!categorySuccess[cat]) categorySuccess[cat] = { total: 0, succeeded: 0 };
      categorySuccess[cat].total++;
      if (event.succeeded) categorySuccess[cat].succeeded++;
    }
  }
  const bestCategory = Object.entries(categorySuccess)
    .map(([cat, stats]) => ({ cat, rate: stats.succeeded / stats.total }))
    .sort((a, b) => b.rate - a.rate)[0];
  if (bestCategory) {
    insights.push(
      `${bestCategory.cat.charAt(0).toUpperCase() + bestCategory.cat.slice(1)} actions had the highest success rate at ${Math.round(bestCategory.rate * 100)}%.`,
    );
  }

  // 5. Final standings
  const activeScores = Object.entries(lastTurn.playerStates)
    .filter(([, s]) => s.status === 'active')
    .sort((a, b) => b[1].cumulativePayoff - a[1].cumulativePayoff);
  if (activeScores.length >= 2) {
    const leader = activeScores[0];
    const trailer = activeScores[activeScores.length - 1];
    const gap = leader[1].cumulativePayoff - trailer[1].cumulativePayoff;
    if (gap > 20) {
      insights.push(
        `${nameOf(leader[0])} dominated the final standings with a massive ${gap.toFixed(1)}-point lead over ${nameOf(trailer[0])}.`,
      );
    } else if (gap > 5) {
      insights.push(
        `The final standings show ${nameOf(leader[0])} ahead of ${nameOf(trailer[0])} by ${gap.toFixed(1)} points — a meaningful but not insurmountable lead.`,
      );
    } else {
      insights.push(
        `The final scores are remarkably close — ${nameOf(leader[0])} barely edges out ${nameOf(trailer[0])} by just ${gap.toFixed(1)} points.`,
      );
    }
  }

  // 6. Volatility
  const volatilities = turns.map((t) => t.worldState.volatility);
  const avgVolatility = volatilities.reduce((s, v) => s + v, 0) / volatilities.length;
  if (avgVolatility > 0.6) {
    insights.push(
      'This was an extremely volatile simulation — strategies and fortunes shifted dramatically from turn to turn.',
    );
  } else if (avgVolatility < 0.25) {
    insights.push(
      'The simulation was relatively stable, with gradual shifts rather than dramatic swings.',
    );
  }

  // 7. Elimination insight
  if (eliminatedPlayers.length > 0) {
    insights.push(
      `${eliminatedPlayers.length} player(s) were eliminated, proving this scenario has real consequences for poor strategy.`,
    );
  }

  return insights.slice(0, 8);
}

// ---------------------------------------------------------------------------
// Main simulation engine
// ---------------------------------------------------------------------------

export function runOpenWorldSimulation(
  players: OpenWorldPlayer[],
  relationships: OpenWorldRelationship[],
  rules: OpenWorldRule[],
  config: OpenWorldConfig,
  customShocks?: OpenWorldShock[],
): OpenWorldResult {
  let currentPlayers = [...players];
  let currentRelationships = [...relationships];
  const shocks = customShocks ?? generateDefaultShocks(players, config);
  const turns: OpenWorldTurnState[] = [];
  const eliminatedPlayers: string[] = [];
  let winner: string | null = null;

  // Initialize cumulative payoffs
  const cumulativePayoffs: Record<string, number> = {};
  for (const p of players) cumulativePayoffs[p.id] = 0;

  // --- Run each turn ---
  for (let t = 0; t < config.totalTurns; t++) {
    if (winner) break;

    const turnEvents: OpenWorldEvent[] = [];
    const shocksTriggeredThisTurn: OpenWorldShock[] = [];

    // 1. Check for shocks
    for (const shock of shocks) {
      if (shock.triggered) continue;
      if (Math.random() < shock.probability) {
        shock.triggered = true;
        shock.turn = t + 1;
        shocksTriggeredThisTurn.push(shock);

        // Apply shock effects
        for (const effect of shock.effects) {
          cumulativePayoffs[effect.playerId] =
            (cumulativePayoffs[effect.playerId] ?? 0) + effect.payoffDelta;

          // Apply resource changes
          const player = currentPlayers.find((p) => p.id === effect.playerId);
          if (player) {
            for (const [resName, change] of Object.entries(effect.resourceChanges)) {
              const res = player.resources.find((r) => r.name === resName);
              if (res) {
                res.amount = clamp(res.amount + change, 0, res.maxAmount);
              }
            }
          }
        }
      }
    }

    // 2. Each active player chooses and executes an action
    const activePlayers = currentPlayers.filter((p) => {
      const prevState = turns.length > 0 ? turns[turns.length - 1].playerStates[p.id] : null;
      return !prevState || prevState.status === 'active';
    });

    for (const player of activePlayers) {
      // Generate available actions
      const actions = generateActions(
        player, currentPlayers, currentRelationships, turns, config,
      );

      // Choose an action
      const chosenAction = chooseAction(
        player, actions, currentRelationships, turns, config,
      );

      // Execute the action
      const succeeded = Math.random() < chosenAction.successProbability;
      const impact: Record<string, number> = succeeded
        ? { ...chosenAction.payoffOnSuccess }
        : { ...chosenAction.payoffOnFailure };

      // Apply resource costs (even on failure)
      for (const [resName, cost] of Object.entries(chosenAction.resourceCost)) {
        const res = player.resources.find((r) => r.name === resName);
        if (res) {
          res.amount = Math.max(0, res.amount - cost);
        }
      }

      // Apply payoff impacts
      for (const [pid, delta] of Object.entries(impact)) {
        cumulativePayoffs[pid] = (cumulativePayoffs[pid] ?? 0) + delta;
      }

      const eventBase = {
        turn: t + 1,
        playerId: player.id,
        action: chosenAction,
        targetPlayerId: chosenAction.targetPlayerId,
        succeeded,
        description: `${player.name} ${succeeded ? 'successfully' : 'unsuccessfully'} attempted "${chosenAction.name}"`,
        impact,
      };

      const narrativeDetail = generateEventNarrative(eventBase, currentPlayers);

      turnEvents.push({ ...eventBase, narrativeDetail });
    }

    // 3. Evolve relationships based on events
    currentRelationships = evolveRelationships(
      currentRelationships, turnEvents, currentPlayers, config,
    );

    // 4. Update player alliances/rivals based on relationships
    currentPlayers = updatePlayerAlliances(currentPlayers, currentRelationships);

    // 5. Regenerate resources
    currentPlayers = currentPlayers.map((p) => regenerateResources(p, config));

    // 6. Calculate world state
    const aggressiveActions = turnEvents.filter(
      (e) => e.action.category === 'aggressive' || e.action.category === 'deceptive',
    ).length;
    const cooperativeActions = turnEvents.filter(
      (e) => e.action.category === 'cooperative' || e.action.category === 'economic',
    ).length;
    const totalActions = turnEvents.length || 1;

    const prevWorldState = turns.length > 0
      ? turns[turns.length - 1].worldState
      : { tension: 0.3, cooperation: 0.5, volatility: 0.3 };

    const tension = clamp(
      prevWorldState.tension * 0.7 +
      (aggressiveActions / totalActions) * 0.3 +
      (shocksTriggeredThisTurn.length > 0 ? 0.15 : 0),
      0, 1,
    );
    const cooperation = clamp(
      prevWorldState.cooperation * 0.7 +
      (cooperativeActions / totalActions) * 0.3 -
      (shocksTriggeredThisTurn.length > 0 ? 0.1 : 0),
      0, 1,
    );

    // Volatility: how much payoffs changed this turn
    const payoffChanges = Object.values(turnEvents.reduce((acc, e) => {
      for (const [pid, impact] of Object.entries(e.impact)) {
        acc[pid] = (acc[pid] ?? 0) + Math.abs(impact);
      }
      return acc;
    }, {} as Record<string, number>));
    const avgChange = payoffChanges.length > 0
      ? payoffChanges.reduce((s, v) => s + v, 0) / payoffChanges.length
      : 0;
    const volatility = clamp(
      prevWorldState.volatility * 0.6 + (avgChange / 10) * 0.4,
      0, 1,
    );

    const worldState = { tension, cooperation, volatility };

    // 7. Build player states for this turn
    const playerStates: OpenWorldTurnState['playerStates'] = {};
    for (const player of currentPlayers) {
      const prevPlayerState = turns.length > 0
        ? turns[turns.length - 1].playerStates[player.id]
        : null;
      const wasEliminated = prevPlayerState?.status === 'eliminated';

      const turnPayoff = Object.values(
        turnEvents
          .filter((e) => e.playerId === player.id || e.impact[player.id] !== undefined)
          .reduce((acc, e) => {
            acc[player.id] = (acc[player.id] ?? 0) + (e.impact[player.id] ?? 0);
            return acc;
          }, {} as Record<string, number>),
      )[0] ?? 0;

      const cumPayoff = cumulativePayoffs[player.id] ?? 0;

      // Check elimination
      let status: 'active' | 'eliminated' | 'won' = wasEliminated ? 'eliminated' : 'active';
      if (
        !wasEliminated &&
        config.eliminationEnabled &&
        cumPayoff < config.eliminationThreshold &&
        t > 2 // grace period
      ) {
        status = 'eliminated';
        eliminatedPlayers.push(player.id);
      }

      const playerEvent = turnEvents.find((e) => e.playerId === player.id);

      playerStates[player.id] = {
        payoff: turnPayoff,
        cumulativePayoff: cumPayoff,
        resources: Object.fromEntries(
          player.resources.map((r) => [r.name, r.amount]),
        ),
        actionTaken: playerEvent?.action.name ?? 'None',
        targetPlayer: playerEvent?.targetPlayerId,
        alliances: [...player.alliances],
        rivals: [...player.rivals],
        status,
      };
    }

    // 8. Check for victory conditions
    const activePlayers2 = Object.entries(playerStates).filter(([, s]) => s.status === 'active');
    if (config.eliminationEnabled && activePlayers2.length === 1) {
      const winnerId = activePlayers2[0][0];
      playerStates[winnerId].status = 'won';
      winner = winnerId;
    }

    // Check victory rules
    for (const rule of rules) {
      if (!rule.active || rule.type !== 'victory') continue;
      // Simple threshold check: if any player has cumulative payoff > 50
      for (const [pid, state] of Object.entries(playerStates)) {
        if (state.status === 'active' && state.cumulativePayoff > 50) {
          state.status = 'won';
          winner = pid;
          break;
        }
      }
      if (winner) break;
    }

    // Generate narrative
    const narrative = generateTurnNarrative(
      t + 1, turnEvents, shocksTriggeredThisTurn, currentPlayers, worldState,
    );

    turns.push({
      turn: t + 1,
      playerStates,
      events: turnEvents,
      shocksTriggered: shocksTriggeredThisTurn.map((s) => s.id),
      narrative,
      worldState,
    });
  }

  // --- Post-simulation ---

  const insights = generateInsights(turns, currentPlayers, currentRelationships, eliminatedPlayers);
  const finalNarrative = generateFinalNarrative(turns, currentPlayers, winner, eliminatedPlayers);

  return {
    id: `ow_${generateId()}`,
    scenarioDescription: '',
    config,
    players: currentPlayers,
    relationships: currentRelationships,
    rules,
    shocks,
    turns,
    predictions: null, // Will be filled by AI prediction endpoint
    finalNarrative,
    insights,
    winner,
    eliminatedPlayers,
  };
}

// ---------------------------------------------------------------------------
// Defaults / helpers for UI
// ---------------------------------------------------------------------------

export const DEFAULT_OPEN_WORLD_CONFIG: OpenWorldConfig = {
  totalTurns: 30,
  turnSpeed: 500,
  enableShocks: true,
  shockFrequency: 0.5,
  allianceFlexibility: 0.5,
  eliminationEnabled: true,
  eliminationThreshold: -20,
  resourceScarcity: 0.3,
  informationAsymmetry: 0.3,
  diplomacyWeight: 0.5,
};

const PLAYER_COLORS = [
  '#6c5ce7', '#00b894', '#e17055', '#0984e3',
  '#fdcb6e', '#e84393', '#00cec9', '#ff7675',
  '#a29bfe', '#55efc4', '#fab1a0', '#74b9ff',
];

export function createDefaultPlayer(index: number, name?: string): OpenWorldPlayer {
  return {
    id: `player_${index + 1}`,
    name: name ?? `Player ${index + 1}`,
    emoji: ['🏛️', '🏢', '🎯', '⚡', '🌍', '💰', '🔬', '🛡️'][index % 8],
    color: PLAYER_COLORS[index % PLAYER_COLORS.length],
    type: 'custom',
    description: '',
    goals: [],
    resources: [
      { name: 'Power', amount: 10, maxAmount: 20, regenerationRate: 0.5 },
      { name: 'Wealth', amount: 10, maxAmount: 20, regenerationRate: 0.5 },
    ],
    constraints: [],
    personalityTraits: {
      aggression: 0.5,
      cooperation: 0.5,
      riskTolerance: 0.5,
      rationality: 0.5,
      patience: 0.5,
    },
    alliances: [],
    rivals: [],
    position: {
      x: 300 + 200 * Math.cos((2 * Math.PI * index) / 8),
      y: 250 + 150 * Math.sin((2 * Math.PI * index) / 8),
    },
  };
}

export function createDefaultRelationship(
  fromId: string,
  toId: string,
): OpenWorldRelationship {
  return {
    fromId,
    toId,
    type: 'neutral',
    strength: 0,
    history: [],
  };
}

export function createDefaultRule(): OpenWorldRule {
  return {
    id: `rule_${generateId()}`,
    name: 'New Rule',
    description: '',
    type: 'modifier',
    condition: '',
    effect: '',
    active: true,
  };
}
