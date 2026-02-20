import { create } from 'zustand';
import { GameAnalysis, Player, Scenario, SimulationResult, SimulationConfig, AppMode } from './types';

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
}));
