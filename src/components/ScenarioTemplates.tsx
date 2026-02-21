'use client';

import { motion } from 'framer-motion';
import { GameAnalysis } from '@/lib/types';

// ---------------------------------------------------------------------------
// Category color mapping
// ---------------------------------------------------------------------------

type Category = 'Classic' | 'Zero-Sum' | 'Cooperation' | 'Social' | 'Geopolitical';

const CATEGORY_COLORS: Record<Category, { bg: string; text: string; border: string }> = {
  Classic:      { bg: '#6c5ce720', text: '#a29bfe', border: '#6c5ce740' },
  'Zero-Sum':   { bg: '#ff6b6b20', text: '#ff6b6b', border: '#ff6b6b40' },
  Cooperation:  { bg: '#00b89420', text: '#00b894', border: '#00b89440' },
  Social:       { bg: '#ffd43b20', text: '#ffd43b', border: '#ffd43b40' },
  Geopolitical: { bg: '#0984e320', text: '#74b9ff', border: '#0984e340' },
};

// ---------------------------------------------------------------------------
// Template metadata (extends GameAnalysis with display-only fields)
// ---------------------------------------------------------------------------

interface ScenarioTemplate {
  analysis: GameAnalysis;
  icon: string;
  shortDescription: string;
  category: Category;
  difficulty: 1 | 2 | 3;
}

// ---------------------------------------------------------------------------
// 1. Prisoner's Dilemma
// ---------------------------------------------------------------------------

const prisonersDilemma: ScenarioTemplate = {
  icon: '🔒',
  shortDescription: 'Cooperate or betray — the original social dilemma.',
  category: 'Classic',
  difficulty: 1,
  analysis: {
    title: "Prisoner's Dilemma",
    summary:
      'Two suspects are interrogated separately. Each can cooperate (stay silent) or defect (betray the other). Mutual cooperation yields a good outcome, but the temptation to defect creates a dilemma.',
    gameType: "Prisoner's Dilemma",
    gameTypeDescription:
      'A symmetric two-player game where individual rationality leads to a collectively worse outcome. The dominant strategy is to defect, yet mutual cooperation is Pareto-optimal.',
    players: [
      {
        id: 'p1',
        name: 'Alice',
        emoji: '👮',
        color: '#6c5ce7',
        role: 'Suspect A',
        goals: ['Minimize prison time', 'Avoid being exploited by the other suspect'],
        strategies: ['Cooperate', 'Defect'],
        position: { x: 120, y: 220 },
      },
      {
        id: 'p2',
        name: 'Bob',
        emoji: '🕵️',
        color: '#00b894',
        role: 'Suspect B',
        goals: ['Minimize prison time', 'Avoid being exploited by the other suspect'],
        strategies: ['Cooperate', 'Defect'],
        position: { x: 380, y: 220 },
      },
    ],
    connections: [
      { from: 'p1', to: 'p2', type: 'competition', label: 'Interrogation Tension', strength: 0.8 },
    ],
    rules: [
      'Each player independently chooses to Cooperate or Defect.',
      'If both cooperate, both get a moderate reward (3 each).',
      'If one defects while the other cooperates, the defector gets the highest payoff (5) and the cooperator gets the lowest (0).',
      'If both defect, both get a small payoff (1 each).',
    ],
    incentives: [
      { playerId: 'p1', incentive: 'Defecting guarantees a higher payoff regardless of the other player', strength: 0.9 },
      { playerId: 'p2', incentive: 'Defecting guarantees a higher payoff regardless of the other player', strength: 0.9 },
      { playerId: 'p1', incentive: 'Mutual cooperation is better than mutual defection', strength: 0.7 },
      { playerId: 'p2', incentive: 'Mutual cooperation is better than mutual defection', strength: 0.7 },
    ],
    outcomes: [
      {
        id: 'o1',
        label: 'Mutual Cooperation',
        description: 'Both stay silent. Moderate sentence for each.',
        payoffs: { p1: 3, p2: 3 },
        likelihood: 0.25,
        type: 'pareto',
      },
      {
        id: 'o2',
        label: 'Alice Defects, Bob Cooperates',
        description: 'Alice betrays Bob. Alice goes free, Bob gets heavy sentence.',
        payoffs: { p1: 5, p2: 0 },
        likelihood: 0.25,
        type: 'best',
      },
      {
        id: 'o3',
        label: 'Bob Defects, Alice Cooperates',
        description: 'Bob betrays Alice. Bob goes free, Alice gets heavy sentence.',
        payoffs: { p1: 0, p2: 5 },
        likelihood: 0.25,
        type: 'worst',
      },
      {
        id: 'o4',
        label: 'Mutual Defection',
        description: 'Both betray each other. Moderate-to-heavy sentence for each.',
        payoffs: { p1: 1, p2: 1 },
        likelihood: 0.25,
        type: 'nash',
      },
    ],
    strategies: [
      { playerId: 'p1', name: 'Cooperate', description: 'Stay silent and trust the other player.', risk: 'high', expectedPayoff: 1.5 },
      { playerId: 'p1', name: 'Defect', description: 'Betray the other player for personal gain.', risk: 'low', expectedPayoff: 3 },
      { playerId: 'p2', name: 'Cooperate', description: 'Stay silent and trust the other player.', risk: 'high', expectedPayoff: 1.5 },
      { playerId: 'p2', name: 'Defect', description: 'Betray the other player for personal gain.', risk: 'low', expectedPayoff: 3 },
    ],
    payoffMatrix: [
      { strategies: { p1: 'Cooperate', p2: 'Cooperate' }, payoffs: { p1: 3, p2: 3 } },
      { strategies: { p1: 'Cooperate', p2: 'Defect' }, payoffs: { p1: 0, p2: 5 } },
      { strategies: { p1: 'Defect', p2: 'Cooperate' }, payoffs: { p1: 5, p2: 0 } },
      { strategies: { p1: 'Defect', p2: 'Defect' }, payoffs: { p1: 1, p2: 1 } },
    ],
    recommendation:
      'In a one-shot game, defection is the rational choice. In repeated interactions, cooperative strategies like tit-for-tat can sustain mutual cooperation.',
    nashEquilibrium: 'Both players Defect (1, 1)',
    dominantStrategy: 'Defect is dominant for both players',
    realWorldParallel:
      'Arms races, climate agreements, price wars between competitors — any situation where short-term self-interest conflicts with long-term collective benefit.',
  },
};

// ---------------------------------------------------------------------------
// 2. Chicken (Hawk-Dove)
// ---------------------------------------------------------------------------

const chicken: ScenarioTemplate = {
  icon: '🚗',
  shortDescription: 'Swerve or go straight — who blinks first?',
  category: 'Classic',
  difficulty: 2,
  analysis: {
    title: 'Chicken (Hawk-Dove)',
    summary:
      'Two drivers speed toward each other. Each can swerve (dove) or go straight (hawk). Swerving avoids disaster but concedes. Both going straight is catastrophic.',
    gameType: 'Anti-Coordination Game',
    gameTypeDescription:
      'A game where players want to choose different actions. The worst outcome occurs when both choose the aggressive strategy. Has two pure Nash equilibria and one mixed.',
    players: [
      {
        id: 'p1',
        name: 'Driver A',
        emoji: '🏎️',
        color: '#e17055',
        role: 'Driver',
        goals: ['Appear tough', 'Avoid a crash'],
        strategies: ['Swerve', 'Straight'],
        position: { x: 100, y: 250 },
      },
      {
        id: 'p2',
        name: 'Driver B',
        emoji: '🚗',
        color: '#0984e3',
        role: 'Driver',
        goals: ['Appear tough', 'Avoid a crash'],
        strategies: ['Swerve', 'Straight'],
        position: { x: 400, y: 250 },
      },
    ],
    connections: [
      { from: 'p1', to: 'p2', type: 'competition', label: 'Head-on collision course', strength: 0.9 },
    ],
    rules: [
      'Each player simultaneously chooses to Swerve or go Straight.',
      'If both swerve, they share a moderate payoff (3 each) — neither gains prestige.',
      'If one swerves and the other goes straight, the straight driver "wins" (5) and the swerver "loses face" (1).',
      'If both go straight, they crash — the worst outcome for both (0 each).',
    ],
    incentives: [
      { playerId: 'p1', incentive: 'Going straight wins big if the other swerves', strength: 0.8 },
      { playerId: 'p2', incentive: 'Going straight wins big if the other swerves', strength: 0.8 },
      { playerId: 'p1', incentive: 'Crash is catastrophic — strong incentive to swerve', strength: 0.9 },
      { playerId: 'p2', incentive: 'Crash is catastrophic — strong incentive to swerve', strength: 0.9 },
    ],
    outcomes: [
      {
        id: 'o1',
        label: 'Both Swerve',
        description: 'Both avoid danger. Shared moderate outcome.',
        payoffs: { p1: 3, p2: 3 },
        likelihood: 0.3,
        type: 'pareto',
      },
      {
        id: 'o2',
        label: 'A Straight, B Swerves',
        description: 'Driver A wins the standoff.',
        payoffs: { p1: 5, p2: 1 },
        likelihood: 0.25,
        type: 'nash',
      },
      {
        id: 'o3',
        label: 'B Straight, A Swerves',
        description: 'Driver B wins the standoff.',
        payoffs: { p1: 1, p2: 5 },
        likelihood: 0.25,
        type: 'nash',
      },
      {
        id: 'o4',
        label: 'Both Straight (Crash)',
        description: 'Head-on collision. Catastrophic for both.',
        payoffs: { p1: 0, p2: 0 },
        likelihood: 0.2,
        type: 'worst',
      },
    ],
    strategies: [
      { playerId: 'p1', name: 'Swerve', description: 'Play it safe and avoid the crash.', risk: 'low', expectedPayoff: 2 },
      { playerId: 'p1', name: 'Straight', description: 'Go aggressive, risking a crash for a big win.', risk: 'high', expectedPayoff: 2.5 },
      { playerId: 'p2', name: 'Swerve', description: 'Play it safe and avoid the crash.', risk: 'low', expectedPayoff: 2 },
      { playerId: 'p2', name: 'Straight', description: 'Go aggressive, risking a crash for a big win.', risk: 'high', expectedPayoff: 2.5 },
    ],
    payoffMatrix: [
      { strategies: { p1: 'Swerve', p2: 'Swerve' }, payoffs: { p1: 3, p2: 3 } },
      { strategies: { p1: 'Swerve', p2: 'Straight' }, payoffs: { p1: 1, p2: 5 } },
      { strategies: { p1: 'Straight', p2: 'Swerve' }, payoffs: { p1: 5, p2: 1 } },
      { strategies: { p1: 'Straight', p2: 'Straight' }, payoffs: { p1: 0, p2: 0 } },
    ],
    recommendation:
      'The key is credible commitment — if you can convincingly signal you will not swerve, the other player is forced to. In practice, a mixed strategy (randomizing) is often the realistic equilibrium.',
    nashEquilibrium: 'Two pure NE: (Straight, Swerve) and (Swerve, Straight). Mixed NE also exists.',
    dominantStrategy: 'No dominant strategy — best choice depends on what the other player does.',
    realWorldParallel:
      'Nuclear brinkmanship (Cuban Missile Crisis), labor-management disputes, highway merging. Any confrontation where backing down is costly but collision is worse.',
  },
};

// ---------------------------------------------------------------------------
// 3. Stag Hunt
// ---------------------------------------------------------------------------

const stagHunt: ScenarioTemplate = {
  icon: '🦌',
  shortDescription: 'Hunt together for a stag, or play it safe alone?',
  category: 'Cooperation',
  difficulty: 1,
  analysis: {
    title: 'Stag Hunt',
    summary:
      'Two hunters can cooperate to hunt a stag (high reward) or independently hunt a hare (safe but lower reward). Stag hunting requires both to commit.',
    gameType: 'Coordination Game',
    gameTypeDescription:
      'A game with two Nash equilibria — one risk-dominant (Hare, Hare) and one payoff-dominant (Stag, Stag). The central tension is trust vs. safety.',
    players: [
      {
        id: 'p1',
        name: 'Hunter 1',
        emoji: '🏹',
        color: '#00b894',
        role: 'Hunter',
        goals: ['Maximize food gathered', 'Avoid going hungry'],
        strategies: ['Hunt Stag', 'Hunt Hare'],
        position: { x: 150, y: 150 },
      },
      {
        id: 'p2',
        name: 'Hunter 2',
        emoji: '🎯',
        color: '#e17055',
        role: 'Hunter',
        goals: ['Maximize food gathered', 'Avoid going hungry'],
        strategies: ['Hunt Stag', 'Hunt Hare'],
        position: { x: 350, y: 350 },
      },
    ],
    connections: [
      { from: 'p1', to: 'p2', type: 'cooperation', label: 'Hunting partnership', strength: 0.7 },
    ],
    rules: [
      'Each hunter independently chooses to Hunt Stag or Hunt Hare.',
      'Hunting a stag requires both hunters cooperating — if only one hunts stag, they get nothing (0).',
      'Hunting a hare can be done alone and guarantees a small payoff.',
      'If both hunt stag, they share a large reward (5 each).',
    ],
    incentives: [
      { playerId: 'p1', incentive: 'The stag yields the highest payoff if both cooperate', strength: 0.8 },
      { playerId: 'p2', incentive: 'The stag yields the highest payoff if both cooperate', strength: 0.8 },
      { playerId: 'p1', incentive: 'Hunting hare is safe — guaranteed food regardless of partner', strength: 0.6 },
      { playerId: 'p2', incentive: 'Hunting hare is safe — guaranteed food regardless of partner', strength: 0.6 },
    ],
    outcomes: [
      {
        id: 'o1',
        label: 'Both Hunt Stag',
        description: 'Both cooperate and share the large stag reward.',
        payoffs: { p1: 5, p2: 5 },
        likelihood: 0.35,
        type: 'pareto',
      },
      {
        id: 'o2',
        label: 'Stag + Hare (H1 Stag)',
        description: 'Hunter 1 waits for stag alone and gets nothing. Hunter 2 catches a hare.',
        payoffs: { p1: 0, p2: 3 },
        likelihood: 0.15,
        type: 'worst',
      },
      {
        id: 'o3',
        label: 'Hare + Stag (H2 Stag)',
        description: 'Hunter 2 waits for stag alone and gets nothing. Hunter 1 catches a hare.',
        payoffs: { p1: 3, p2: 0 },
        likelihood: 0.15,
        type: 'worst',
      },
      {
        id: 'o4',
        label: 'Both Hunt Hare',
        description: 'Both play it safe with guaranteed small rewards.',
        payoffs: { p1: 2, p2: 2 },
        likelihood: 0.35,
        type: 'nash',
      },
    ],
    strategies: [
      { playerId: 'p1', name: 'Hunt Stag', description: 'Cooperate for the big prize — risky if partner defects.', risk: 'high', expectedPayoff: 2.5 },
      { playerId: 'p1', name: 'Hunt Hare', description: 'Guaranteed small payoff regardless of partner.', risk: 'low', expectedPayoff: 2.5 },
      { playerId: 'p2', name: 'Hunt Stag', description: 'Cooperate for the big prize — risky if partner defects.', risk: 'high', expectedPayoff: 2.5 },
      { playerId: 'p2', name: 'Hunt Hare', description: 'Guaranteed small payoff regardless of partner.', risk: 'low', expectedPayoff: 2.5 },
    ],
    payoffMatrix: [
      { strategies: { p1: 'Hunt Stag', p2: 'Hunt Stag' }, payoffs: { p1: 5, p2: 5 } },
      { strategies: { p1: 'Hunt Stag', p2: 'Hunt Hare' }, payoffs: { p1: 0, p2: 3 } },
      { strategies: { p1: 'Hunt Hare', p2: 'Hunt Stag' }, payoffs: { p1: 3, p2: 0 } },
      { strategies: { p1: 'Hunt Hare', p2: 'Hunt Hare' }, payoffs: { p1: 2, p2: 2 } },
    ],
    recommendation:
      'If you trust your partner, hunt stag. The payoff-dominant equilibrium (Stag, Stag) is better for everyone, but it requires mutual trust. Communication and reputation help.',
    nashEquilibrium: 'Two pure NE: (Stag, Stag) and (Hare, Hare). Stag-Stag is payoff-dominant, Hare-Hare is risk-dominant.',
    dominantStrategy: 'No dominant strategy — the best choice depends on trust in your partner.',
    realWorldParallel:
      'Team projects, joint ventures, international cooperation (climate action), technology standard adoption — any situation where coordination produces the best outcome but requires trust.',
  },
};

// ---------------------------------------------------------------------------
// 4. Battle of the Sexes
// ---------------------------------------------------------------------------

const battleOfSexes: ScenarioTemplate = {
  icon: '💃',
  shortDescription: 'Opera or football — can you agree on a night out?',
  category: 'Social',
  difficulty: 2,
  analysis: {
    title: 'Battle of the Sexes',
    summary:
      'A couple wants to spend the evening together but has different preferences. Partner A prefers the opera; Partner B prefers football. Being together matters more than the activity.',
    gameType: 'Coordination Game',
    gameTypeDescription:
      'A game with two pure Nash equilibria where players prefer to coordinate but disagree on which outcome is better. The conflict is over which equilibrium to select.',
    players: [
      {
        id: 'p1',
        name: 'Partner A',
        emoji: '💃',
        color: '#e84393',
        role: 'Partner (prefers Opera)',
        goals: ['Spend the evening together', 'Go to the Opera'],
        strategies: ['Opera', 'Football'],
        position: { x: 130, y: 200 },
      },
      {
        id: 'p2',
        name: 'Partner B',
        emoji: '🕺',
        color: '#0984e3',
        role: 'Partner (prefers Football)',
        goals: ['Spend the evening together', 'Go to Football'],
        strategies: ['Opera', 'Football'],
        position: { x: 370, y: 200 },
      },
    ],
    connections: [
      { from: 'p1', to: 'p2', type: 'negotiation', label: 'Relationship', strength: 0.9 },
    ],
    rules: [
      'Each partner independently chooses Opera or Football.',
      'If both choose Opera, Partner A is happier (3) and Partner B is okay (2).',
      'If both choose Football, Partner B is happier (3) and Partner A is okay (2).',
      'If they choose different activities, both are unhappy (0 each) — they end up alone.',
    ],
    incentives: [
      { playerId: 'p1', incentive: 'Prefers Opera but being together is more important', strength: 0.7 },
      { playerId: 'p2', incentive: 'Prefers Football but being together is more important', strength: 0.7 },
      { playerId: 'p1', incentive: 'Going alone to either event is the worst outcome', strength: 0.9 },
      { playerId: 'p2', incentive: 'Going alone to either event is the worst outcome', strength: 0.9 },
    ],
    outcomes: [
      {
        id: 'o1',
        label: 'Both at Opera',
        description: 'They go to the opera together. Partner A is delighted, Partner B is content.',
        payoffs: { p1: 3, p2: 2 },
        likelihood: 0.3,
        type: 'nash',
      },
      {
        id: 'o2',
        label: 'A Opera, B Football',
        description: 'They end up at different venues. Both are alone and unhappy.',
        payoffs: { p1: 0, p2: 0 },
        likelihood: 0.2,
        type: 'worst',
      },
      {
        id: 'o3',
        label: 'A Football, B Opera',
        description: 'They end up at different venues. Both are alone and unhappy.',
        payoffs: { p1: 0, p2: 0 },
        likelihood: 0.2,
        type: 'worst',
      },
      {
        id: 'o4',
        label: 'Both at Football',
        description: 'They go to football together. Partner B is delighted, Partner A is content.',
        payoffs: { p1: 2, p2: 3 },
        likelihood: 0.3,
        type: 'nash',
      },
    ],
    strategies: [
      { playerId: 'p1', name: 'Opera', description: 'Go to Partner A\'s preferred event.', risk: 'medium', expectedPayoff: 1.5 },
      { playerId: 'p1', name: 'Football', description: 'Compromise and go to Partner B\'s event.', risk: 'medium', expectedPayoff: 1 },
      { playerId: 'p2', name: 'Opera', description: 'Compromise and go to Partner A\'s event.', risk: 'medium', expectedPayoff: 1 },
      { playerId: 'p2', name: 'Football', description: 'Go to Partner B\'s preferred event.', risk: 'medium', expectedPayoff: 1.5 },
    ],
    payoffMatrix: [
      { strategies: { p1: 'Opera', p2: 'Opera' }, payoffs: { p1: 3, p2: 2 } },
      { strategies: { p1: 'Opera', p2: 'Football' }, payoffs: { p1: 0, p2: 0 } },
      { strategies: { p1: 'Football', p2: 'Opera' }, payoffs: { p1: 0, p2: 0 } },
      { strategies: { p1: 'Football', p2: 'Football' }, payoffs: { p1: 2, p2: 3 } },
    ],
    recommendation:
      'Communication is key. Without it, a mixed strategy equilibrium emerges with risk of miscoordination. Taking turns or agreeing in advance eliminates the dilemma.',
    nashEquilibrium: 'Two pure NE: (Opera, Opera) with payoffs (3,2) and (Football, Football) with payoffs (2,3). Also a mixed NE.',
    dominantStrategy: 'No dominant strategy — coordination is more important than individual preference.',
    realWorldParallel:
      'Any coordination problem with conflicting preferences: choosing a restaurant, setting technology standards, international policy alignment where both parties benefit from agreement.',
  },
};

// ---------------------------------------------------------------------------
// 5. Matching Pennies
// ---------------------------------------------------------------------------

const matchingPennies: ScenarioTemplate = {
  icon: '🪙',
  shortDescription: 'A pure zero-sum game of wits.',
  category: 'Zero-Sum',
  difficulty: 2,
  analysis: {
    title: 'Matching Pennies',
    summary:
      'Two players simultaneously show a coin. Player 1 wins if both match (both heads or both tails). Player 2 wins if they differ. A strictly competitive zero-sum game.',
    gameType: 'Zero-Sum Game',
    gameTypeDescription:
      'A game where one player\'s gain is exactly the other\'s loss. There is no pure Nash equilibrium — only a mixed strategy equilibrium where both randomize 50/50.',
    players: [
      {
        id: 'p1',
        name: 'Player 1',
        emoji: '🪙',
        color: '#ffd43b',
        role: 'Matcher (wins on match)',
        goals: ['Make coins match'],
        strategies: ['Heads', 'Tails'],
        position: { x: 150, y: 250 },
      },
      {
        id: 'p2',
        name: 'Player 2',
        emoji: '🎲',
        color: '#a29bfe',
        role: 'Mismatcher (wins on mismatch)',
        goals: ['Make coins differ'],
        strategies: ['Heads', 'Tails'],
        position: { x: 350, y: 250 },
      },
    ],
    connections: [
      { from: 'p1', to: 'p2', type: 'competition', label: 'Zero-sum rivalry', strength: 1.0 },
    ],
    rules: [
      'Each player simultaneously reveals Heads or Tails.',
      'If both show the same side, Player 1 wins (+1) and Player 2 loses (-1).',
      'If they show different sides, Player 2 wins (+1) and Player 1 loses (-1).',
      'The game is strictly zero-sum: payoffs always sum to zero.',
    ],
    incentives: [
      { playerId: 'p1', incentive: 'Wants to match whatever Player 2 chooses', strength: 1.0 },
      { playerId: 'p2', incentive: 'Wants to mismatch whatever Player 1 chooses', strength: 1.0 },
    ],
    outcomes: [
      {
        id: 'o1',
        label: 'Both Heads',
        description: 'Coins match. Player 1 wins.',
        payoffs: { p1: 1, p2: -1 },
        likelihood: 0.25,
        type: 'best',
      },
      {
        id: 'o2',
        label: 'Heads vs Tails',
        description: 'Coins differ. Player 2 wins.',
        payoffs: { p1: -1, p2: 1 },
        likelihood: 0.25,
        type: 'worst',
      },
      {
        id: 'o3',
        label: 'Tails vs Heads',
        description: 'Coins differ. Player 2 wins.',
        payoffs: { p1: -1, p2: 1 },
        likelihood: 0.25,
        type: 'worst',
      },
      {
        id: 'o4',
        label: 'Both Tails',
        description: 'Coins match. Player 1 wins.',
        payoffs: { p1: 1, p2: -1 },
        likelihood: 0.25,
        type: 'best',
      },
    ],
    strategies: [
      { playerId: 'p1', name: 'Heads', description: 'Show heads — wins if Player 2 also shows heads.', risk: 'medium', expectedPayoff: 0 },
      { playerId: 'p1', name: 'Tails', description: 'Show tails — wins if Player 2 also shows tails.', risk: 'medium', expectedPayoff: 0 },
      { playerId: 'p2', name: 'Heads', description: 'Show heads — wins if Player 1 shows tails.', risk: 'medium', expectedPayoff: 0 },
      { playerId: 'p2', name: 'Tails', description: 'Show tails — wins if Player 1 shows heads.', risk: 'medium', expectedPayoff: 0 },
    ],
    payoffMatrix: [
      { strategies: { p1: 'Heads', p2: 'Heads' }, payoffs: { p1: 1, p2: -1 } },
      { strategies: { p1: 'Heads', p2: 'Tails' }, payoffs: { p1: -1, p2: 1 } },
      { strategies: { p1: 'Tails', p2: 'Heads' }, payoffs: { p1: -1, p2: 1 } },
      { strategies: { p1: 'Tails', p2: 'Tails' }, payoffs: { p1: 1, p2: -1 } },
    ],
    recommendation:
      'The only equilibrium is a mixed strategy where both players randomize 50/50. Any predictable pattern can be exploited by the opponent.',
    nashEquilibrium: 'Mixed NE only: each player plays Heads and Tails with 50% probability each. Expected payoff is 0 for both.',
    dominantStrategy: 'No dominant strategy — the game is purely strategic with no safe choice.',
    realWorldParallel:
      'Penalty kicks in soccer (goalkeeper vs striker), rock-paper-scissors, military feints, cybersecurity attack/defense — any setting where predictability is punished.',
  },
};

// ---------------------------------------------------------------------------
// 6. Public Goods Game
// ---------------------------------------------------------------------------

const publicGoods: ScenarioTemplate = {
  icon: '🏛️',
  shortDescription: 'Contribute to the group or free-ride on others?',
  category: 'Cooperation',
  difficulty: 3,
  analysis: {
    title: 'Public Goods Game',
    summary:
      'Three citizens decide whether to contribute to a public good. Contributions are multiplied and shared equally, but free-riders benefit without paying.',
    gameType: 'Public Goods / Social Dilemma',
    gameTypeDescription:
      'An N-player social dilemma. Each player benefits from the public good regardless of contribution, creating a free-rider problem. The dominant strategy is to free-ride, but universal contribution is optimal.',
    players: [
      {
        id: 'p1',
        name: 'Citizen A',
        emoji: '🏠',
        color: '#6c5ce7',
        role: 'Community Member',
        goals: ['Benefit from public good', 'Minimize personal cost'],
        strategies: ['Contribute', 'Free-Ride'],
        position: { x: 250, y: 80 },
      },
      {
        id: 'p2',
        name: 'Citizen B',
        emoji: '🏢',
        color: '#00b894',
        role: 'Community Member',
        goals: ['Benefit from public good', 'Minimize personal cost'],
        strategies: ['Contribute', 'Free-Ride'],
        position: { x: 100, y: 380 },
      },
      {
        id: 'p3',
        name: 'Citizen C',
        emoji: '🏫',
        color: '#e17055',
        role: 'Community Member',
        goals: ['Benefit from public good', 'Minimize personal cost'],
        strategies: ['Contribute', 'Free-Ride'],
        position: { x: 400, y: 380 },
      },
    ],
    connections: [
      { from: 'p1', to: 'p2', type: 'cooperation', label: 'Community bond', strength: 0.5 },
      { from: 'p2', to: 'p3', type: 'cooperation', label: 'Community bond', strength: 0.5 },
      { from: 'p1', to: 'p3', type: 'cooperation', label: 'Community bond', strength: 0.5 },
    ],
    rules: [
      'Each citizen independently chooses to Contribute (pay a cost of 3) or Free-Ride (pay nothing).',
      'Total contributions are multiplied by 1.5 and divided equally among all three citizens.',
      'Free-riders receive the benefit without paying the cost.',
      'If all contribute, each gets 4.5 - 3 = 1.5 net. If all free-ride, everyone gets 0.',
    ],
    incentives: [
      { playerId: 'p1', incentive: 'Free-riding saves the cost of contribution', strength: 0.8 },
      { playerId: 'p2', incentive: 'Free-riding saves the cost of contribution', strength: 0.8 },
      { playerId: 'p3', incentive: 'Free-riding saves the cost of contribution', strength: 0.8 },
      { playerId: 'p1', incentive: 'If everyone contributes, the public good benefits all', strength: 0.6 },
      { playerId: 'p2', incentive: 'If everyone contributes, the public good benefits all', strength: 0.6 },
      { playerId: 'p3', incentive: 'If everyone contributes, the public good benefits all', strength: 0.6 },
    ],
    outcomes: [
      {
        id: 'o1',
        label: 'All Contribute',
        description: 'Maximum public good. Each pays 3, gets back 4.5. Net = 1.5 each.',
        payoffs: { p1: 2, p2: 2, p3: 2 },
        likelihood: 0.15,
        type: 'pareto',
      },
      {
        id: 'o2',
        label: 'Two Contribute, One Free-Rides',
        description: 'The free-rider gets the benefit without paying. Contributors get less.',
        payoffs: { p1: 0, p2: 0, p3: 3 },
        likelihood: 0.35,
        type: 'likely',
      },
      {
        id: 'o3',
        label: 'One Contributes, Two Free-Ride',
        description: 'The lone contributor subsidizes the free-riders.',
        payoffs: { p1: -2, p2: 2, p3: 2 },
        likelihood: 0.3,
        type: 'worst',
      },
      {
        id: 'o4',
        label: 'All Free-Ride',
        description: 'No public good is provided. Everyone gets nothing.',
        payoffs: { p1: 0, p2: 0, p3: 0 },
        likelihood: 0.2,
        type: 'nash',
      },
    ],
    strategies: [
      { playerId: 'p1', name: 'Contribute', description: 'Pay the cost to fund the public good.', risk: 'high', expectedPayoff: 0 },
      { playerId: 'p1', name: 'Free-Ride', description: 'Enjoy the benefit without contributing.', risk: 'low', expectedPayoff: 1.5 },
      { playerId: 'p2', name: 'Contribute', description: 'Pay the cost to fund the public good.', risk: 'high', expectedPayoff: 0 },
      { playerId: 'p2', name: 'Free-Ride', description: 'Enjoy the benefit without contributing.', risk: 'low', expectedPayoff: 1.5 },
      { playerId: 'p3', name: 'Contribute', description: 'Pay the cost to fund the public good.', risk: 'high', expectedPayoff: 0 },
      { playerId: 'p3', name: 'Free-Ride', description: 'Enjoy the benefit without contributing.', risk: 'low', expectedPayoff: 1.5 },
    ],
    payoffMatrix: [
      // All 8 combinations for 3 players x 2 strategies
      { strategies: { p1: 'Contribute', p2: 'Contribute', p3: 'Contribute' }, payoffs: { p1: 2, p2: 2, p3: 2 } },
      { strategies: { p1: 'Contribute', p2: 'Contribute', p3: 'Free-Ride' }, payoffs: { p1: 0, p2: 0, p3: 3 } },
      { strategies: { p1: 'Contribute', p2: 'Free-Ride', p3: 'Contribute' }, payoffs: { p1: 0, p2: 3, p3: 0 } },
      { strategies: { p1: 'Contribute', p2: 'Free-Ride', p3: 'Free-Ride' }, payoffs: { p1: -2, p2: 2, p3: 2 } },
      { strategies: { p1: 'Free-Ride', p2: 'Contribute', p3: 'Contribute' }, payoffs: { p1: 3, p2: 0, p3: 0 } },
      { strategies: { p1: 'Free-Ride', p2: 'Contribute', p3: 'Free-Ride' }, payoffs: { p1: 2, p2: -2, p3: 2 } },
      { strategies: { p1: 'Free-Ride', p2: 'Free-Ride', p3: 'Contribute' }, payoffs: { p1: 2, p2: 2, p3: -2 } },
      { strategies: { p1: 'Free-Ride', p2: 'Free-Ride', p3: 'Free-Ride' }, payoffs: { p1: 0, p2: 0, p3: 0 } },
    ],
    recommendation:
      'Institutions, social norms, and punishment mechanisms can sustain cooperation. In repeated games, conditional cooperation (contribute if others do) can maintain the public good.',
    nashEquilibrium: 'All Free-Ride (0, 0, 0) — free-riding is the dominant strategy.',
    dominantStrategy: 'Free-Ride is dominant for each player individually.',
    realWorldParallel:
      'Taxation, climate change mitigation, open-source software, neighborhood watch programs, vaccinations — any collective action problem with diffuse benefits and concentrated costs.',
  },
};

// ---------------------------------------------------------------------------
// 7. Ultimatum Game
// ---------------------------------------------------------------------------

const ultimatumGame: ScenarioTemplate = {
  icon: '💰',
  shortDescription: 'Split the money — be fair or be greedy?',
  category: 'Social',
  difficulty: 2,
  analysis: {
    title: 'Ultimatum Game',
    summary:
      'A Proposer offers a split of a sum of money. The Responder can accept (both get the proposed split) or reject (both get nothing). Tests fairness vs rationality.',
    gameType: 'Sequential / Bargaining Game',
    gameTypeDescription:
      'An asymmetric game where the Proposer has first-mover advantage. Game theory predicts the Responder should accept any positive offer, but experiments show people reject unfair offers.',
    players: [
      {
        id: 'p1',
        name: 'Proposer',
        emoji: '💰',
        color: '#ffd43b',
        role: 'Proposer',
        goals: ['Keep as much money as possible', 'Get the offer accepted'],
        strategies: ['Fair Split', 'Greedy Split'],
        position: { x: 150, y: 200 },
      },
      {
        id: 'p2',
        name: 'Responder',
        emoji: '🤝',
        color: '#00b894',
        role: 'Responder',
        goals: ['Get a fair share', 'Punish unfair offers'],
        strategies: ['Accept', 'Reject'],
        position: { x: 350, y: 200 },
      },
    ],
    connections: [
      { from: 'p1', to: 'p2', type: 'negotiation', label: 'Offer and Response', strength: 0.8 },
    ],
    rules: [
      'The Proposer chooses to offer a Fair Split (50/50) or a Greedy Split (80/20).',
      'The Responder then chooses to Accept or Reject the offer.',
      'If accepted, the money is divided as proposed.',
      'If rejected, both players receive nothing.',
    ],
    incentives: [
      { playerId: 'p1', incentive: 'A greedy split keeps more money if accepted', strength: 0.7 },
      { playerId: 'p1', incentive: 'A fair split is more likely to be accepted', strength: 0.8 },
      { playerId: 'p2', incentive: 'Accepting any offer is better than getting nothing', strength: 0.6 },
      { playerId: 'p2', incentive: 'Rejecting punishes greed and upholds fairness norms', strength: 0.7 },
    ],
    outcomes: [
      {
        id: 'o1',
        label: 'Fair Split + Accept',
        description: 'Proposer offers 50/50, Responder accepts. Both get a fair share.',
        payoffs: { p1: 5, p2: 5 },
        likelihood: 0.4,
        type: 'pareto',
      },
      {
        id: 'o2',
        label: 'Fair Split + Reject',
        description: 'Proposer offers 50/50, but Responder rejects. Both get nothing.',
        payoffs: { p1: 0, p2: 0 },
        likelihood: 0.05,
        type: 'worst',
      },
      {
        id: 'o3',
        label: 'Greedy Split + Accept',
        description: 'Proposer takes 80%, Responder accepts the small share.',
        payoffs: { p1: 8, p2: 2 },
        likelihood: 0.25,
        type: 'nash',
      },
      {
        id: 'o4',
        label: 'Greedy Split + Reject',
        description: 'Proposer is greedy, Responder punishes by rejecting. Both get nothing.',
        payoffs: { p1: 0, p2: 0 },
        likelihood: 0.3,
        type: 'likely',
      },
    ],
    strategies: [
      { playerId: 'p1', name: 'Fair Split', description: 'Offer an equal 50/50 split.', risk: 'low', expectedPayoff: 4.5 },
      { playerId: 'p1', name: 'Greedy Split', description: 'Offer an 80/20 split in your favor.', risk: 'high', expectedPayoff: 4.4 },
      { playerId: 'p2', name: 'Accept', description: 'Accept whatever offer is made.', risk: 'low', expectedPayoff: 3.5 },
      { playerId: 'p2', name: 'Reject', description: 'Reject the offer to punish unfairness.', risk: 'high', expectedPayoff: 0 },
    ],
    payoffMatrix: [
      { strategies: { p1: 'Fair Split', p2: 'Accept' }, payoffs: { p1: 5, p2: 5 } },
      { strategies: { p1: 'Fair Split', p2: 'Reject' }, payoffs: { p1: 0, p2: 0 } },
      { strategies: { p1: 'Greedy Split', p2: 'Accept' }, payoffs: { p1: 8, p2: 2 } },
      { strategies: { p1: 'Greedy Split', p2: 'Reject' }, payoffs: { p1: 0, p2: 0 } },
    ],
    recommendation:
      'Rational game theory says Proposer should be greedy and Responder should accept anything. But human experiments consistently show ~40-50% offers and rejection of offers below ~20%.',
    nashEquilibrium: 'Subgame perfect: (Greedy Split, Accept) — Responder should accept any positive offer. But behavioral equilibrium often settles near (Fair Split, Accept).',
    dominantStrategy: 'Accept is weakly dominant for the Responder (any money > no money). Proposer has no dominant strategy.',
    realWorldParallel:
      'Salary negotiations, business acquisitions, divorce settlements, international aid — any take-it-or-leave-it offer where fairness norms interact with rational self-interest.',
  },
};

// ---------------------------------------------------------------------------
// 8. Arms Race
// ---------------------------------------------------------------------------

const armsRace: ScenarioTemplate = {
  icon: '🛡️',
  shortDescription: 'Arm or disarm — trust between rival nations.',
  category: 'Geopolitical',
  difficulty: 3,
  analysis: {
    title: 'Arms Race',
    summary:
      'Two rival nations decide whether to build weapons (Arm) or pursue peace (Disarm). Arming is costly but protective. Mutual disarmament is ideal but requires trust.',
    gameType: "Prisoner's Dilemma (Geopolitical)",
    gameTypeDescription:
      'A Prisoner\'s Dilemma variant with geopolitical stakes. Each nation has an incentive to arm regardless of the other\'s choice, yet mutual disarmament produces the best collective outcome.',
    players: [
      {
        id: 'p1',
        name: 'Nation Alpha',
        emoji: '🦅',
        color: '#0984e3',
        role: 'Sovereign Nation',
        goals: ['Ensure national security', 'Minimize military spending'],
        strategies: ['Arm', 'Disarm'],
        position: { x: 100, y: 200 },
      },
      {
        id: 'p2',
        name: 'Nation Beta',
        emoji: '🐻',
        color: '#d63031',
        role: 'Sovereign Nation',
        goals: ['Ensure national security', 'Minimize military spending'],
        strategies: ['Arm', 'Disarm'],
        position: { x: 400, y: 200 },
      },
    ],
    connections: [
      { from: 'p1', to: 'p2', type: 'competition', label: 'Geopolitical rivalry', strength: 0.85 },
    ],
    rules: [
      'Each nation independently chooses to Arm (build weapons) or Disarm (pursue peace).',
      'If both disarm, both enjoy peace and prosperity (3 each).',
      'If one arms and the other disarms, the armed nation gains dominance (5) and the disarmed nation is vulnerable (0).',
      'If both arm, both bear heavy military costs with no advantage (1 each).',
    ],
    incentives: [
      { playerId: 'p1', incentive: 'Arming provides security regardless of the other nation', strength: 0.9 },
      { playerId: 'p2', incentive: 'Arming provides security regardless of the other nation', strength: 0.9 },
      { playerId: 'p1', incentive: 'Mutual disarmament saves resources and reduces risk', strength: 0.7 },
      { playerId: 'p2', incentive: 'Mutual disarmament saves resources and reduces risk', strength: 0.7 },
    ],
    outcomes: [
      {
        id: 'o1',
        label: 'Mutual Disarmament',
        description: 'Peace and prosperity. Both save on military spending.',
        payoffs: { p1: 3, p2: 3 },
        likelihood: 0.2,
        type: 'pareto',
      },
      {
        id: 'o2',
        label: 'Alpha Arms, Beta Disarms',
        description: 'Alpha gains military dominance. Beta is vulnerable.',
        payoffs: { p1: 5, p2: 0 },
        likelihood: 0.2,
        type: 'best',
      },
      {
        id: 'o3',
        label: 'Beta Arms, Alpha Disarms',
        description: 'Beta gains military dominance. Alpha is vulnerable.',
        payoffs: { p1: 0, p2: 5 },
        likelihood: 0.2,
        type: 'worst',
      },
      {
        id: 'o4',
        label: 'Mutual Armament',
        description: 'Both nations bear heavy costs. No advantage gained.',
        payoffs: { p1: 1, p2: 1 },
        likelihood: 0.4,
        type: 'nash',
      },
    ],
    strategies: [
      { playerId: 'p1', name: 'Arm', description: 'Build weapons for security and potential dominance.', risk: 'medium', expectedPayoff: 3 },
      { playerId: 'p1', name: 'Disarm', description: 'Pursue peace, trusting the other nation to do the same.', risk: 'high', expectedPayoff: 1.5 },
      { playerId: 'p2', name: 'Arm', description: 'Build weapons for security and potential dominance.', risk: 'medium', expectedPayoff: 3 },
      { playerId: 'p2', name: 'Disarm', description: 'Pursue peace, trusting the other nation to do the same.', risk: 'high', expectedPayoff: 1.5 },
    ],
    payoffMatrix: [
      { strategies: { p1: 'Arm', p2: 'Arm' }, payoffs: { p1: 1, p2: 1 } },
      { strategies: { p1: 'Arm', p2: 'Disarm' }, payoffs: { p1: 5, p2: 0 } },
      { strategies: { p1: 'Disarm', p2: 'Arm' }, payoffs: { p1: 0, p2: 5 } },
      { strategies: { p1: 'Disarm', p2: 'Disarm' }, payoffs: { p1: 3, p2: 3 } },
    ],
    recommendation:
      'Treaties, verification mechanisms, and repeated interactions (diplomacy) can help achieve mutual disarmament. Without enforceable agreements, the arms race is the likely outcome.',
    nashEquilibrium: 'Both Arm (1, 1) — arming is the dominant strategy.',
    dominantStrategy: 'Arm is dominant for both nations.',
    realWorldParallel:
      'Cold War nuclear arms race, US-Soviet/Russia relations, India-Pakistan tensions, cybersecurity escalation between nations — any competitive security dilemma.',
  },
};

// ---------------------------------------------------------------------------
// Exported array
// ---------------------------------------------------------------------------

export const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  prisonersDilemma,
  chicken,
  stagHunt,
  battleOfSexes,
  matchingPennies,
  publicGoods,
  ultimatumGame,
  armsRace,
];

// ---------------------------------------------------------------------------
// Difficulty dots helper
// ---------------------------------------------------------------------------

function DifficultyDots({ level }: { level: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-0.5" title={`Difficulty: ${level}/3`}>
      {[1, 2, 3].map((dot) => (
        <div
          key={dot}
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: dot <= level ? '#e0e0ff' : '#25253e',
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScenarioTemplates component
// ---------------------------------------------------------------------------

interface ScenarioTemplatesProps {
  onSelect: (analysis: GameAnalysis) => void;
}

export default function ScenarioTemplates({ onSelect }: ScenarioTemplatesProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a29bfe" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        <h3 className="text-xs font-bold text-[#a29bfe]">Classic Scenarios</h3>
        <span className="text-[10px] text-[#e0e0ff]/30 ml-auto">Click to load</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SCENARIO_TEMPLATES.map((template, index) => {
          const catColor = CATEGORY_COLORS[template.category];

          return (
            <motion.button
              key={template.analysis.title}
              onClick={() => onSelect(template.analysis)}
              className="group relative text-left rounded-xl border border-[#25253e] bg-[#1a1a2e]/60
                backdrop-blur-sm p-4 transition-all duration-200
                hover:border-[#6c5ce7]/60 hover:shadow-[0_0_20px_rgba(108,92,231,0.12)]
                focus:outline-none focus:border-[#6c5ce7]"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.06 }}
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Top row: icon + badges */}
              <div className="flex items-start justify-between mb-2">
                <span className="text-2xl leading-none">{template.icon}</span>
                <div className="flex items-center gap-1.5">
                  {/* Player count badge */}
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-[#25253e] text-[#e0e0ff]/50">
                    {template.analysis.players.length}P
                  </span>
                  {/* Category badge */}
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: catColor.bg,
                      color: catColor.text,
                      border: `1px solid ${catColor.border}`,
                    }}
                  >
                    {template.category}
                  </span>
                </div>
              </div>

              {/* Title */}
              <h4 className="text-sm font-bold text-[#e0e0ff] mb-1 group-hover:text-white transition-colors">
                {template.analysis.title}
              </h4>

              {/* Description */}
              <p className="text-[11px] text-[#e0e0ff]/40 leading-relaxed line-clamp-1">
                {template.shortDescription}
              </p>

              {/* Bottom row: game type + difficulty */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#25253e]/60">
                <span className="text-[9px] text-[#a29bfe]/60 font-medium truncate max-w-[70%]">
                  {template.analysis.gameType}
                </span>
                <DifficultyDots level={template.difficulty} />
              </div>

              {/* Hover glow overlay */}
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br from-[#6c5ce7]/5 to-transparent" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
