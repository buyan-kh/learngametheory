export interface Player {
  id: string;
  name: string;
  emoji: string;
  color: string;
  role: string;
  goals: string[];
  strategies: string[];
  position: { x: number; y: number };
}

export interface Connection {
  from: string;
  to: string;
  type: 'cooperation' | 'competition' | 'dependency' | 'negotiation';
  label: string;
  strength: number; // 0-1
}

export interface Outcome {
  id: string;
  label: string;
  description: string;
  payoffs: Record<string, number>; // playerId -> payoff score
  likelihood: number; // 0-1
  type: 'best' | 'worst' | 'nash' | 'pareto' | 'likely';
}

export interface Strategy {
  playerId: string;
  name: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
  expectedPayoff: number;
}

export interface PayoffCell {
  strategies: Record<string, string>; // playerId -> strategy name
  payoffs: Record<string, number>; // playerId -> payoff
}

export interface GameAnalysis {
  id?: string;
  title: string;
  summary: string;
  gameType: string;
  gameTypeDescription: string;
  players: Player[];
  connections: Connection[];
  rules: string[];
  incentives: { playerId: string; incentive: string; strength: number }[];
  outcomes: Outcome[];
  strategies: Strategy[];
  payoffMatrix: PayoffCell[];
  recommendation: string;
  nashEquilibrium: string;
  dominantStrategy: string;
  realWorldParallel: string;
}

export interface Scenario {
  id: string;
  input: string;
  analysis: GameAnalysis;
  created_at: string;
}

// Simulation types
export interface SimulationRound {
  round: number;
  strategies: Record<string, string>; // playerId -> strategy chosen
  payoffs: Record<string, number>; // playerId -> payoff received
  cumulativePayoffs: Record<string, number>;
}

export interface CustomSimulationStrategy {
  id: string;
  name: string;
  description: string;
  weights: Record<string, number>; // algorithm name -> 0-1 weight
  cooperationBias: number;         // -1 to +1
}

export interface SimulationConfig {
  rounds: number;
  noise: number; // 0-1, probability of random strategy
  learningRate: number; // 0-1, how much players adapt
  strategy: 'tit-for-tat' | 'random' | 'greedy' | 'adaptive' | 'mixed' | 'best-response' | 'fictitious-play' | 'replicator-dynamics' | (string & {});
  customStrategyId?: string;
}

export interface SimulationResult {
  id: string;
  scenarioInput: string;
  analysis: GameAnalysis;
  config: SimulationConfig;
  rounds: SimulationRound[];
  convergence: {
    converged: boolean;
    equilibriumRound: number | null;
    finalStrategies: Record<string, string>;
  };
  insights: string[];
  narrative: string;
  strategyNarrative: Record<string, string>;
}

// Comparison types
export interface ComparisonData {
  scenarios: GameAnalysis[];
  differences: ComparisonDifference[];
  payoffDeltas: Record<string, number>[];
  strategyOverlap: number;
}

export interface ComparisonDifference {
  category: 'gameType' | 'players' | 'payoffs' | 'nash' | 'outcomes' | 'strategies' | 'risk' | 'cooperation';
  description: string;
  scenarioLabels: string[];
}

export type AppMode = 'analyze' | 'simulate' | 'compare' | 'openworld' | 'village';

// ---------------------------------------------------------------------------
// Open World Simulation Types
// ---------------------------------------------------------------------------

/** A player/actor in the open world simulation — fully user-customizable */
export interface OpenWorldPlayer {
  id: string;
  name: string;
  emoji: string;
  color: string;
  type: 'nation' | 'corporation' | 'individual' | 'organization' | 'market' | 'custom';
  description: string;
  goals: string[];
  resources: OpenWorldResource[];
  constraints: string[];
  personalityTraits: {
    aggression: number;    // 0-1
    cooperation: number;   // 0-1
    riskTolerance: number; // 0-1
    rationality: number;   // 0-1
    patience: number;      // 0-1
  };
  alliances: string[];     // player IDs
  rivals: string[];        // player IDs
  position: { x: number; y: number };
}

export interface OpenWorldResource {
  name: string;
  amount: number;
  maxAmount: number;
  regenerationRate: number; // per turn
}

/** A relationship between two players */
export interface OpenWorldRelationship {
  fromId: string;
  toId: string;
  type: 'alliance' | 'rivalry' | 'trade' | 'dependency' | 'threat' | 'neutral';
  strength: number;       // -1 to 1 (-1 hostile, 1 strong ally)
  history: string[];      // brief history of the relationship
}

/** An action a player can take in a given turn */
export interface OpenWorldAction {
  id: string;
  name: string;
  description: string;
  category: 'aggressive' | 'cooperative' | 'defensive' | 'economic' | 'diplomatic' | 'deceptive';
  targetPlayerId?: string;
  resourceCost: Record<string, number>;
  successProbability: number; // 0-1
  payoffOnSuccess: Record<string, number>;   // playerId -> payoff delta
  payoffOnFailure: Record<string, number>;
  prerequisites: string[];
}

/** A single event that happened during simulation */
export interface OpenWorldEvent {
  turn: number;
  playerId: string;
  action: OpenWorldAction;
  targetPlayerId?: string;
  succeeded: boolean;
  description: string;
  impact: Record<string, number>; // playerId -> payoff impact
  narrativeDetail: string;
}

/** External shock/event that affects the whole world */
export interface OpenWorldShock {
  id: string;
  name: string;
  description: string;
  turn: number;
  probability: number;    // chance of happening each turn
  effects: {
    playerId: string;
    resourceChanges: Record<string, number>;
    payoffDelta: number;
  }[];
  triggered: boolean;
}

/** A rule that governs the world */
export interface OpenWorldRule {
  id: string;
  name: string;
  description: string;
  type: 'constraint' | 'trigger' | 'modifier' | 'victory' | 'elimination';
  condition: string;       // human-readable condition
  effect: string;          // human-readable effect
  active: boolean;
}

/** Turn-by-turn state snapshot */
export interface OpenWorldTurnState {
  turn: number;
  playerStates: Record<string, {
    payoff: number;
    cumulativePayoff: number;
    resources: Record<string, number>;
    actionTaken: string;
    targetPlayer?: string;
    alliances: string[];
    rivals: string[];
    status: 'active' | 'eliminated' | 'won';
  }>;
  events: OpenWorldEvent[];
  shocksTriggered: string[];
  narrative: string;
  worldState: {
    tension: number;       // 0-1 global tension level
    cooperation: number;   // 0-1 global cooperation level
    volatility: number;    // 0-1 how much things are changing
  };
}

/** AI-generated prediction for what happens next */
export interface OpenWorldPrediction {
  shortTerm: string;       // next 1-3 turns
  mediumTerm: string;      // next 5-10 turns
  longTerm: string;        // end-game prediction
  mostLikelyOutcome: string;
  wildcardScenario: string;
  playerPredictions: Record<string, {
    likelyStrategy: string;
    survivalProbability: number;
    threatLevel: number;
  }>;
  confidenceLevel: number; // 0-1
}

/** Full configuration for an open world simulation */
export interface OpenWorldConfig {
  totalTurns: number;              // how many turns to run
  turnSpeed: number;               // ms delay between turns for animation
  enableShocks: boolean;           // random external events
  shockFrequency: number;          // 0-1
  allianceFlexibility: number;     // 0-1 how easily alliances shift
  eliminationEnabled: boolean;     // can players get eliminated?
  eliminationThreshold: number;    // payoff below which player is eliminated
  resourceScarcity: number;        // 0-1 how scarce resources are
  informationAsymmetry: number;    // 0-1 (0 = perfect info, 1 = fog of war)
  diplomacyWeight: number;         // 0-1 how much diplomacy matters
}

/** Full result of an open world simulation */
export interface OpenWorldResult {
  id: string;
  scenarioDescription: string;
  config: OpenWorldConfig;
  players: OpenWorldPlayer[];
  relationships: OpenWorldRelationship[];
  rules: OpenWorldRule[];
  shocks: OpenWorldShock[];
  turns: OpenWorldTurnState[];
  predictions: OpenWorldPrediction | null;
  finalNarrative: string;
  insights: string[];
  winner: string | null;           // player ID or null if no winner
  eliminatedPlayers: string[];
}
