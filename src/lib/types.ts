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

export type AppMode = 'analyze' | 'simulate' | 'compare';
