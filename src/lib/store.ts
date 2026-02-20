import { create } from 'zustand';
import { GameAnalysis, Player, Scenario, SimulationResult, SimulationConfig, AppMode, CustomSimulationStrategy, Strategy } from './types';

interface AppState {
  // App mode
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;

  // Analysis state
  input: string;
  setInput: (input: string) => void;
  isAnalyzing: boolean;
  setIsAnalyzing: (v: boolean) => void;
  analysis: GameAnalysis | null;
  setAnalysis: (a: GameAnalysis | null) => void;
  selectedPlayer: string | null;
  setSelectedPlayer: (id: string | null) => void;
  selectedOutcome: string | null;
  setSelectedOutcome: (id: string | null) => void;
  activeTab: 'board' | 'matrix' | 'outcomes' | 'strategy';
  setActiveTab: (tab: 'board' | 'matrix' | 'outcomes' | 'strategy') => void;
  updatePlayerPosition: (id: string, pos: { x: number; y: number }) => void;
  error: string | null;
  setError: (e: string | null) => void;
  isRecording: boolean;
  setIsRecording: (v: boolean) => void;

  // Auth state
  showAuthModal: boolean;
  setShowAuthModal: (v: boolean) => void;

  // Saved scenarios
  savedScenarios: Scenario[];
  setSavedScenarios: (s: Scenario[]) => void;
  addSavedScenario: (s: Scenario) => void;
  removeSavedScenario: (id: string) => void;
  showSavedPanel: boolean;
  setShowSavedPanel: (v: boolean) => void;

  // Simulation state
  simulationConfig: SimulationConfig;
  setSimulationConfig: (c: Partial<SimulationConfig>) => void;
  simulationResult: SimulationResult | null;
  setSimulationResult: (r: SimulationResult | null) => void;
  isSimulating: boolean;
  setIsSimulating: (v: boolean) => void;

  // Comparison state
  comparisonScenarios: GameAnalysis[];
  addComparisonScenario: (a: GameAnalysis) => void;
  removeComparisonScenario: (index: number) => void;
  clearComparison: () => void;
  comparisonInput: string;
  setComparisonInput: (v: string) => void;
  isComparing: boolean;
  setIsComparing: (v: boolean) => void;

  // Analysis history for comparison (in-session)
  analysisHistory: { input: string; analysis: GameAnalysis }[];
  addToHistory: (input: string, analysis: GameAnalysis) => void;

  // Player goal editing
  addPlayerGoal: (playerId: string, goal: string) => void;
  removePlayerGoal: (playerId: string, goalIndex: number) => void;
  editPlayerGoal: (playerId: string, goalIndex: number, newGoal: string) => void;

  // Player strategy editing (bidirectional sync with analysis.strategies)
  addPlayerStrategy: (playerId: string, strategy: string) => void;
  removePlayerStrategy: (playerId: string, stratIndex: number) => void;
  editPlayerStrategy: (playerId: string, stratIndex: number, newName: string) => void;

  // Incentive editing
  addIncentive: (playerId: string, incentive: string, strength: number) => void;
  removeIncentive: (playerId: string, incentiveIndex: number) => void;
  editIncentive: (playerId: string, incentiveIndex: number, updates: { incentive?: string; strength?: number }) => void;

  // Analysis strategy editing (full Strategy objects)
  addAnalysisStrategy: (strategy: Strategy) => void;
  removeAnalysisStrategy: (playerId: string, strategyName: string) => void;
  editAnalysisStrategy: (playerId: string, strategyName: string, updates: Partial<Strategy>) => void;

  // Custom simulation strategies
  customSimulationStrategies: CustomSimulationStrategy[];
  addCustomSimulationStrategy: (strategy: CustomSimulationStrategy) => void;
  removeCustomSimulationStrategy: (id: string) => void;
  editCustomSimulationStrategy: (id: string, updates: Partial<CustomSimulationStrategy>) => void;
}

export const useStore = create<AppState>((set) => ({
  // App mode
  appMode: 'analyze',
  setAppMode: (appMode) => set({ appMode }),

  // Analysis state
  input: '',
  setInput: (input) => set({ input }),
  isAnalyzing: false,
  setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  analysis: null,
  setAnalysis: (analysis) => set({ analysis }),
  selectedPlayer: null,
  setSelectedPlayer: (selectedPlayer) => set({ selectedPlayer }),
  selectedOutcome: null,
  setSelectedOutcome: (selectedOutcome) => set({ selectedOutcome }),
  activeTab: 'board',
  setActiveTab: (activeTab) => set({ activeTab }),
  updatePlayerPosition: (id, pos) =>
    set((state) => {
      if (!state.analysis) return state;
      return {
        analysis: {
          ...state.analysis,
          players: state.analysis.players.map((p: Player) =>
            p.id === id ? { ...p, position: pos } : p
          ),
        },
      };
    }),
  error: null,
  setError: (error) => set({ error }),
  isRecording: false,
  setIsRecording: (isRecording) => set({ isRecording }),

  // Auth state
  showAuthModal: false,
  setShowAuthModal: (showAuthModal) => set({ showAuthModal }),

  // Saved scenarios
  savedScenarios: [],
  setSavedScenarios: (savedScenarios) => set({ savedScenarios }),
  addSavedScenario: (scenario) =>
    set((state) => ({
      savedScenarios: [scenario, ...state.savedScenarios],
    })),
  removeSavedScenario: (id) =>
    set((state) => ({
      savedScenarios: state.savedScenarios.filter((s) => s.id !== id),
    })),
  showSavedPanel: false,
  setShowSavedPanel: (showSavedPanel) => set({ showSavedPanel }),

  // Simulation state
  simulationConfig: {
    rounds: 20,
    noise: 0.1,
    learningRate: 0.3,
    strategy: 'adaptive',
  },
  setSimulationConfig: (config) =>
    set((state) => ({
      simulationConfig: { ...state.simulationConfig, ...config },
    })),
  simulationResult: null,
  setSimulationResult: (simulationResult) => set({ simulationResult }),
  isSimulating: false,
  setIsSimulating: (isSimulating) => set({ isSimulating }),

  // Comparison state
  comparisonScenarios: [],
  addComparisonScenario: (analysis) =>
    set((state) => ({
      comparisonScenarios: [...state.comparisonScenarios, analysis],
    })),
  removeComparisonScenario: (index) =>
    set((state) => ({
      comparisonScenarios: state.comparisonScenarios.filter((_, i) => i !== index),
    })),
  clearComparison: () => set({ comparisonScenarios: [] }),
  comparisonInput: '',
  setComparisonInput: (comparisonInput) => set({ comparisonInput }),
  isComparing: false,
  setIsComparing: (isComparing) => set({ isComparing }),

  // Analysis history
  analysisHistory: [],
  addToHistory: (input, analysis) =>
    set((state) => ({
      analysisHistory: [...state.analysisHistory, { input, analysis }],
    })),

  // Player goal editing
  addPlayerGoal: (playerId, goal) =>
    set((state) => {
      if (!state.analysis) return state;
      return {
        analysis: {
          ...state.analysis,
          players: state.analysis.players.map((p: Player) =>
            p.id === playerId ? { ...p, goals: [...p.goals, goal] } : p
          ),
        },
      };
    }),
  removePlayerGoal: (playerId, goalIndex) =>
    set((state) => {
      if (!state.analysis) return state;
      return {
        analysis: {
          ...state.analysis,
          players: state.analysis.players.map((p: Player) =>
            p.id === playerId
              ? { ...p, goals: p.goals.filter((_, i) => i !== goalIndex) }
              : p
          ),
        },
      };
    }),
  editPlayerGoal: (playerId, goalIndex, newGoal) =>
    set((state) => {
      if (!state.analysis) return state;
      return {
        analysis: {
          ...state.analysis,
          players: state.analysis.players.map((p: Player) =>
            p.id === playerId
              ? { ...p, goals: p.goals.map((g, i) => (i === goalIndex ? newGoal : g)) }
              : p
          ),
        },
      };
    }),

  // Player strategy editing (with bidirectional sync to analysis.strategies)
  addPlayerStrategy: (playerId, strategy) =>
    set((state) => {
      if (!state.analysis) return state;
      const newAnalysisStrategy: Strategy = {
        playerId,
        name: strategy,
        description: `Custom strategy: ${strategy}`,
        risk: 'medium',
        expectedPayoff: 5,
      };
      return {
        analysis: {
          ...state.analysis,
          players: state.analysis.players.map((p: Player) =>
            p.id === playerId ? { ...p, strategies: [...p.strategies, strategy] } : p
          ),
          strategies: [...state.analysis.strategies, newAnalysisStrategy],
        },
      };
    }),
  removePlayerStrategy: (playerId, stratIndex) =>
    set((state) => {
      if (!state.analysis) return state;
      const player = state.analysis.players.find((p) => p.id === playerId);
      if (!player) return state;
      const removedName = player.strategies[stratIndex];
      return {
        analysis: {
          ...state.analysis,
          players: state.analysis.players.map((p: Player) =>
            p.id === playerId
              ? { ...p, strategies: p.strategies.filter((_, i) => i !== stratIndex) }
              : p
          ),
          strategies: state.analysis.strategies.filter(
            (s) => !(s.playerId === playerId && s.name === removedName)
          ),
        },
      };
    }),
  editPlayerStrategy: (playerId, stratIndex, newName) =>
    set((state) => {
      if (!state.analysis) return state;
      const player = state.analysis.players.find((p) => p.id === playerId);
      if (!player) return state;
      const oldName = player.strategies[stratIndex];
      return {
        analysis: {
          ...state.analysis,
          players: state.analysis.players.map((p: Player) =>
            p.id === playerId
              ? { ...p, strategies: p.strategies.map((s, i) => (i === stratIndex ? newName : s)) }
              : p
          ),
          strategies: state.analysis.strategies.map((s) =>
            s.playerId === playerId && s.name === oldName ? { ...s, name: newName } : s
          ),
          payoffMatrix: state.analysis.payoffMatrix.map((cell) => ({
            ...cell,
            strategies: Object.fromEntries(
              Object.entries(cell.strategies).map(([pid, sName]) =>
                pid === playerId && sName === oldName ? [pid, newName] : [pid, sName]
              )
            ),
          })),
        },
      };
    }),

  // Incentive editing
  addIncentive: (playerId, incentive, strength) =>
    set((state) => {
      if (!state.analysis) return state;
      return {
        analysis: {
          ...state.analysis,
          incentives: [...state.analysis.incentives, { playerId, incentive, strength }],
        },
      };
    }),
  removeIncentive: (playerId, incentiveIndex) =>
    set((state) => {
      if (!state.analysis) return state;
      let idx = 0;
      return {
        analysis: {
          ...state.analysis,
          incentives: state.analysis.incentives.filter((inc) => {
            if (inc.playerId === playerId) {
              return idx++ !== incentiveIndex;
            }
            return true;
          }),
        },
      };
    }),
  editIncentive: (playerId, incentiveIndex, updates) =>
    set((state) => {
      if (!state.analysis) return state;
      let idx = 0;
      return {
        analysis: {
          ...state.analysis,
          incentives: state.analysis.incentives.map((inc) => {
            if (inc.playerId === playerId) {
              if (idx++ === incentiveIndex) {
                return { ...inc, ...updates };
              }
            }
            return inc;
          }),
        },
      };
    }),

  // Analysis strategy editing (full Strategy objects)
  addAnalysisStrategy: (strategy) =>
    set((state) => {
      if (!state.analysis) return state;
      const player = state.analysis.players.find((p) => p.id === strategy.playerId);
      const playerHasStrategy = player?.strategies.includes(strategy.name);
      return {
        analysis: {
          ...state.analysis,
          strategies: [...state.analysis.strategies, strategy],
          players: playerHasStrategy
            ? state.analysis.players
            : state.analysis.players.map((p: Player) =>
                p.id === strategy.playerId
                  ? { ...p, strategies: [...p.strategies, strategy.name] }
                  : p
              ),
        },
      };
    }),
  removeAnalysisStrategy: (playerId, strategyName) =>
    set((state) => {
      if (!state.analysis) return state;
      return {
        analysis: {
          ...state.analysis,
          strategies: state.analysis.strategies.filter(
            (s) => !(s.playerId === playerId && s.name === strategyName)
          ),
          players: state.analysis.players.map((p: Player) =>
            p.id === playerId
              ? { ...p, strategies: p.strategies.filter((s) => s !== strategyName) }
              : p
          ),
        },
      };
    }),
  editAnalysisStrategy: (playerId, strategyName, updates) =>
    set((state) => {
      if (!state.analysis) return state;
      const newName = updates.name;
      return {
        analysis: {
          ...state.analysis,
          strategies: state.analysis.strategies.map((s) =>
            s.playerId === playerId && s.name === strategyName ? { ...s, ...updates } : s
          ),
          players: newName
            ? state.analysis.players.map((p: Player) =>
                p.id === playerId
                  ? { ...p, strategies: p.strategies.map((s) => (s === strategyName ? newName : s)) }
                  : p
              )
            : state.analysis.players,
          payoffMatrix: newName
            ? state.analysis.payoffMatrix.map((cell) => ({
                ...cell,
                strategies: Object.fromEntries(
                  Object.entries(cell.strategies).map(([pid, sName]) =>
                    pid === playerId && sName === strategyName ? [pid, newName] : [pid, sName]
                  )
                ),
              }))
            : state.analysis.payoffMatrix,
        },
      };
    }),

  // Custom simulation strategies
  customSimulationStrategies: [],
  addCustomSimulationStrategy: (strategy) =>
    set((state) => ({
      customSimulationStrategies: [...state.customSimulationStrategies, strategy],
    })),
  removeCustomSimulationStrategy: (id) =>
    set((state) => ({
      customSimulationStrategies: state.customSimulationStrategies.filter((s) => s.id !== id),
    })),
  editCustomSimulationStrategy: (id, updates) =>
    set((state) => ({
      customSimulationStrategies: state.customSimulationStrategies.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    })),
}));
