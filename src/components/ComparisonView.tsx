'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { GameAnalysis, Player } from '@/lib/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCENARIO_COLORS = ['#6c5ce7', '#00b894', '#e17055', '#0984e3'];
const SCENARIO_LABELS = ['A', 'B', 'C', 'D'];
const MAX_SCENARIOS = 4;
const MIN_SCENARIOS = 2;

const OUTCOME_COLORS: Record<string, string> = {
  best: '#00b894',
  worst: '#ff6b6b',
  nash: '#6c5ce7',
  pareto: '#74c0fc',
  likely: '#0984e3',
};

const RISK_CONFIG: Record<string, { color: string; label: string }> = {
  low: { color: '#00b894', label: 'Low' },
  medium: { color: '#ffd43b', label: 'Med' },
  high: { color: '#ff6b6b', label: 'High' },
};

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function truncate(str: string, len: number): string {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

function averagePayoff(analysis: GameAnalysis): number {
  if (!analysis.outcomes.length) return 0;
  const allPayoffs = analysis.outcomes.flatMap((o) =>
    Object.values(o.payoffs),
  );
  if (!allPayoffs.length) return 0;
  return allPayoffs.reduce((a, b) => a + b, 0) / allPayoffs.length;
}

function playerAveragePayoff(analysis: GameAnalysis, playerId: string): number {
  const payoffs = analysis.outcomes
    .map((o) => o.payoffs[playerId])
    .filter((v) => v !== undefined);
  if (!payoffs.length) return 0;
  return payoffs.reduce((a, b) => a + b, 0) / payoffs.length;
}

function generateKeyDifferences(scenarios: GameAnalysis[]): string[] {
  const diffs: string[] = [];
  if (scenarios.length < 2) return diffs;

  // Game type differences
  const gameTypes = scenarios.map((s) => s.gameType);
  const uniqueTypes = [...new Set(gameTypes)];
  if (uniqueTypes.length > 1) {
    const parts = scenarios.map(
      (s, i) => `Scenario ${SCENARIO_LABELS[i]} is a ${s.gameType}`,
    );
    diffs.push(parts.join(' while ') + '.');
  } else {
    diffs.push(`All scenarios are classified as ${uniqueTypes[0]}.`);
  }

  // Player count differences
  const playerCounts = scenarios.map((s) => s.players.length);
  if (new Set(playerCounts).size > 1) {
    const parts = scenarios.map(
      (s, i) =>
        `Scenario ${SCENARIO_LABELS[i]} has ${s.players.length} player${s.players.length !== 1 ? 's' : ''}`,
    );
    diffs.push(parts.join(', ') + '.');
  }

  // Average payoff differences
  const avgPayoffs = scenarios.map((s) => averagePayoff(s));
  const maxAvgIdx = avgPayoffs.indexOf(Math.max(...avgPayoffs));
  const minAvgIdx = avgPayoffs.indexOf(Math.min(...avgPayoffs));
  if (maxAvgIdx !== minAvgIdx) {
    diffs.push(
      `Scenario ${SCENARIO_LABELS[maxAvgIdx]} has the highest average payoffs (${avgPayoffs[maxAvgIdx].toFixed(1)}) while Scenario ${SCENARIO_LABELS[minAvgIdx]} has the lowest (${avgPayoffs[minAvgIdx].toFixed(1)}).`,
    );
  }

  // Nash equilibrium comparison
  const nashDescriptions = scenarios.map((s) => s.nashEquilibrium);
  const uniqueNash = [...new Set(nashDescriptions)];
  if (uniqueNash.length > 1) {
    diffs.push('The scenarios have different Nash equilibria.');
  } else if (uniqueNash.length === 1 && uniqueNash[0]) {
    diffs.push('All scenarios share the same Nash equilibrium structure.');
  }

  // Outcome count differences
  const outcomeCounts = scenarios.map((s) => s.outcomes.length);
  if (new Set(outcomeCounts).size > 1) {
    const maxIdx = outcomeCounts.indexOf(Math.max(...outcomeCounts));
    diffs.push(
      `Scenario ${SCENARIO_LABELS[maxIdx]} has the most possible outcomes (${outcomeCounts[maxIdx]}).`,
    );
  }

  // Strategy risk comparison
  scenarios.forEach((s, i) => {
    const highRisk = s.strategies.filter((st) => st.risk === 'high').length;
    const total = s.strategies.length;
    if (total > 0 && highRisk / total > 0.5) {
      diffs.push(
        `Scenario ${SCENARIO_LABELS[i]} has predominantly high-risk strategies.`,
      );
    }
    const lowRisk = s.strategies.filter((st) => st.risk === 'low').length;
    if (total > 0 && lowRisk / total > 0.5) {
      diffs.push(
        `Players in Scenario ${SCENARIO_LABELS[i]} have more cooperative/low-risk strategies.`,
      );
    }
  });

  // Cooperation vs competition
  scenarios.forEach((s, i) => {
    const coopConns = s.connections.filter((c) => c.type === 'cooperation').length;
    const compConns = s.connections.filter((c) => c.type === 'competition').length;
    if (coopConns > compConns && compConns > 0) {
      diffs.push(
        `Scenario ${SCENARIO_LABELS[i]} is more cooperative in nature.`,
      );
    } else if (compConns > coopConns && coopConns > 0) {
      diffs.push(
        `Scenario ${SCENARIO_LABELS[i]} is more competitive in nature.`,
      );
    }
  });

  return diffs;
}

// ---------------------------------------------------------------------------
// Sub-components: Scenario Selector
// ---------------------------------------------------------------------------

function AddScenarioMenu({
  onClose,
  slotIndex,
}: {
  onClose: () => void;
  slotIndex: number;
}) {
  const {
    analysis,
    analysisHistory,
    addComparisonScenario,
    comparisonInput,
    setComparisonInput,
    isComparing,
    setIsComparing,
    setError,
  } = useStore();
  const [showHistory, setShowHistory] = useState(false);
  const [showNewInput, setShowNewInput] = useState(false);

  const handleAddFromCurrent = useCallback(() => {
    if (analysis) {
      addComparisonScenario(analysis);
      onClose();
    }
  }, [analysis, addComparisonScenario, onClose]);

  const handleAddFromHistory = useCallback(
    (item: { input: string; analysis: GameAnalysis }) => {
      addComparisonScenario(item.analysis);
      setShowHistory(false);
      onClose();
    },
    [addComparisonScenario, onClose],
  );

  const handleAnalyzeNew = useCallback(async () => {
    if (!comparisonInput.trim() || isComparing) return;
    setIsComparing(true);
    setError(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: comparisonInput.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Analysis failed');
      }
      const { analysis: newAnalysis } = await res.json();
      addComparisonScenario(newAnalysis);
      setComparisonInput('');
      setShowNewInput(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsComparing(false);
    }
  }, [
    comparisonInput,
    isComparing,
    setIsComparing,
    setError,
    addComparisonScenario,
    setComparisonInput,
    onClose,
  ]);

  return (
    <motion.div
      className="absolute top-full left-0 right-0 mt-2 z-20 rounded-xl border border-[#25253e] bg-[#1a1a2e] shadow-xl overflow-hidden"
      initial={{ opacity: 0, y: -8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.15 }}
    >
      <div className="p-3 space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-[#a29bfe] font-bold px-1">
          Add Scenario {SCENARIO_LABELS[slotIndex]}
        </div>

        {/* From current analysis */}
        {analysis && (
          <button
            onClick={handleAddFromCurrent}
            className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-[#25253e] transition-colors flex items-center gap-2"
          >
            <span className="w-5 h-5 rounded-full bg-[#6c5ce720] flex items-center justify-center text-[10px]">
              +
            </span>
            <span>
              From current analysis
              <span className="opacity-40 ml-1">
                ({truncate(analysis.title, 30)})
              </span>
            </span>
          </button>
        )}

        {/* From history */}
        {analysisHistory.length > 0 && (
          <div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-[#25253e] transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#00b89420] flex items-center justify-center text-[10px]">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
                  </svg>
                </span>
                <span>From history ({analysisHistory.length})</span>
              </div>
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="currentColor"
                className={`transform transition-transform ${showHistory ? 'rotate-180' : ''}`}
              >
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </button>
            <AnimatePresence>
              {showHistory && (
                <motion.div
                  className="mt-1 ml-6 space-y-1 max-h-40 overflow-y-auto custom-scrollbar"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {analysisHistory.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAddFromHistory(item)}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-[11px] hover:bg-[#25253e] transition-colors opacity-80 hover:opacity-100"
                    >
                      <div className="font-medium">{truncate(item.analysis.title, 40)}</div>
                      <div className="text-[10px] opacity-40 mt-0.5">
                        {item.analysis.gameType} - {truncate(item.input, 50)}
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* New scenario */}
        <div>
          <button
            onClick={() => setShowNewInput(!showNewInput)}
            className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-[#25253e] transition-colors flex items-center gap-2"
          >
            <span className="w-5 h-5 rounded-full bg-[#e1705520] flex items-center justify-center text-[10px]">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
              </svg>
            </span>
            <span>New scenario</span>
          </button>
          <AnimatePresence>
            {showNewInput && (
              <motion.div
                className="mt-2 px-2"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <textarea
                  className="w-full bg-[#0a0a1a] border border-[#25253e] rounded-lg px-3 py-2 text-xs text-[#e0e0ff] placeholder:text-[#e0e0ff30] resize-none outline-none focus:border-[#6c5ce7] min-h-[60px]"
                  placeholder="Describe a scenario to analyze..."
                  value={comparisonInput}
                  onChange={(e) => setComparisonInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      handleAnalyzeNew();
                    }
                  }}
                />
                <div className="flex justify-end mt-2 mb-1">
                  <button
                    onClick={handleAnalyzeNew}
                    disabled={!comparisonInput.trim() || isComparing}
                    className="px-3 py-1.5 rounded-full bg-[#6c5ce7] text-white text-[11px] font-bold hover:bg-[#5b4bd5] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1.5"
                  >
                    {isComparing ? (
                      <>
                        <svg
                          className="animate-spin h-3 w-3"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Analyzing...
                      </>
                    ) : (
                      'Analyze & Add'
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        className="w-full text-center py-2 text-[10px] text-[#a29bfe60] hover:text-[#a29bfe] border-t border-[#25253e] transition-colors"
      >
        Cancel
      </button>
    </motion.div>
  );
}

function ScenarioSlot({
  index,
  scenario,
}: {
  index: number;
  scenario: GameAnalysis | null;
}) {
  const { removeComparisonScenario } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const color = SCENARIO_COLORS[index];

  if (scenario) {
    return (
      <motion.div
        className="relative rounded-xl border p-4 min-h-[120px] flex flex-col"
        style={{
          borderColor: color + '50',
          backgroundColor: color + '08',
        }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
            style={{ backgroundColor: color }}
          >
            {SCENARIO_LABELS[index]}
          </div>
          <button
            onClick={() => removeComparisonScenario(index)}
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] opacity-40 hover:opacity-100 hover:bg-[#ff6b6b30] hover:text-[#ff6b6b] transition-all"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Title */}
        <h4 className="text-sm font-bold mb-1.5 leading-tight">
          {truncate(scenario.title, 50)}
        </h4>

        {/* Game type badge */}
        <div className="flex items-center gap-1.5 mb-2">
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-bold"
            style={{ backgroundColor: color + '20', color: color }}
          >
            {scenario.gameType}
          </span>
        </div>

        {/* Meta */}
        <div className="mt-auto flex items-center gap-3 text-[10px] opacity-50">
          <span>{scenario.players.length} players</span>
          <span>{scenario.outcomes.length} outcomes</span>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="relative">
      <motion.button
        onClick={() => setMenuOpen(true)}
        className="w-full rounded-xl border-2 border-dashed border-[#25253e] hover:border-[#6c5ce750] p-4 min-h-[120px] flex flex-col items-center justify-center gap-2 transition-all group"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm opacity-40 group-hover:opacity-80 transition-opacity"
          style={{ backgroundColor: color + '15', color: color }}
        >
          +
        </div>
        <span className="text-[10px] opacity-40 group-hover:opacity-70 transition-opacity">
          Add Scenario {SCENARIO_LABELS[index]}
        </span>
      </motion.button>
      <AnimatePresence>
        {menuOpen && (
          <AddScenarioMenu
            slotIndex={index}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ScenarioSelector() {
  const { comparisonScenarios, clearComparison } = useStore();

  const slots = Array.from({ length: MAX_SCENARIOS }, (_, i) =>
    i < comparisonScenarios.length ? comparisonScenarios[i] : null,
  );

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#a29bfe] flex items-center gap-2">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="text-[#6c5ce7]"
            >
              <path d="M10 3H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1zm10 0h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1zM10 13H4a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1zm10 0h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-6a1 1 0 0 0-1-1z" />
            </svg>
            Scenario Selector
          </h3>
          <p className="text-[10px] opacity-40 mt-0.5">
            Add {MIN_SCENARIOS}-{MAX_SCENARIOS} scenarios to compare side by side
          </p>
        </div>
        {comparisonScenarios.length > 0 && (
          <button
            onClick={clearComparison}
            className="text-[10px] px-3 py-1 rounded-full border border-[#ff6b6b30] text-[#ff6b6b] hover:bg-[#ff6b6b10] transition-all"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {slots.map((scenario, i) => (
          <ScenarioSlot key={i} index={i} scenario={scenario} />
        ))}
      </div>

      {comparisonScenarios.length > 0 &&
        comparisonScenarios.length < MIN_SCENARIOS && (
          <motion.p
            className="text-[11px] text-[#ffd43b] flex items-center gap-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
            </svg>
            Add at least {MIN_SCENARIOS} scenarios to start comparing
          </motion.p>
        )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components: Comparison Dashboard sections
// ---------------------------------------------------------------------------

function OverviewCards({ scenarios }: { scenarios: GameAnalysis[] }) {
  return (
    <motion.div
      className="space-y-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <h3 className="text-xs font-bold text-[#a29bfe] flex items-center gap-1.5">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-[#6c5ce7]"
        >
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
        </svg>
        Overview
      </h3>
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${scenarios.length}, minmax(0, 1fr))`,
        }}
      >
        {scenarios.map((s, i) => (
          <motion.div
            key={i}
            className="rounded-xl border p-4 space-y-3"
            style={{
              borderColor: SCENARIO_COLORS[i] + '30',
              backgroundColor: SCENARIO_COLORS[i] + '06',
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                style={{ backgroundColor: SCENARIO_COLORS[i] }}
              >
                {SCENARIO_LABELS[i]}
              </div>
              <h4 className="text-xs font-bold leading-tight">
                {truncate(s.title, 40)}
              </h4>
            </div>

            <div
              className="text-[10px] px-2 py-0.5 rounded-full font-bold inline-block"
              style={{
                backgroundColor: SCENARIO_COLORS[i] + '18',
                color: SCENARIO_COLORS[i],
              }}
            >
              {s.gameType}
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="opacity-50">Players</span>
                <span className="font-bold">{s.players.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-50">Outcomes</span>
                <span className="font-bold">{s.outcomes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-50">Avg Payoff</span>
                <span className="font-bold">{averagePayoff(s).toFixed(1)}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-[#25253e]">
              <div className="text-[10px] opacity-40 mb-1">Nash Equilibrium</div>
              <p className="text-[10px] opacity-70 leading-relaxed">
                {truncate(s.nashEquilibrium, 100)}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function PlayersComparison({ scenarios }: { scenarios: GameAnalysis[] }) {
  // Collect unique player roles across all scenarios
  const allRoles = useMemo(() => {
    const roleMap = new Map<string, { scenarioIdx: number; player: Player }[]>();
    scenarios.forEach((s, sIdx) => {
      s.players.forEach((p) => {
        const key = p.role.toLowerCase().trim();
        if (!roleMap.has(key)) roleMap.set(key, []);
        roleMap.get(key)!.push({ scenarioIdx: sIdx, player: p });
      });
    });
    // Also add by name for cases where roles differ but names match
    scenarios.forEach((s, sIdx) => {
      s.players.forEach((p) => {
        const nameKey = p.name.toLowerCase().trim();
        // If the name key doesn't overlap with an existing role key
        if (!roleMap.has(nameKey)) {
          // Check if this player is already in a role group
          const inGroup = Array.from(roleMap.values()).some((entries) =>
            entries.some(
              (e) => e.scenarioIdx === sIdx && e.player.id === p.id,
            ),
          );
          if (!inGroup) {
            roleMap.set(nameKey, [{ scenarioIdx: sIdx, player: p }]);
          }
        }
      });
    });
    return roleMap;
  }, [scenarios]);

  return (
    <motion.div
      className="space-y-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <h3 className="text-xs font-bold text-[#a29bfe] flex items-center gap-1.5">
        <span>Players Comparison</span>
      </h3>

      <div className="space-y-2">
        {Array.from(allRoles.entries()).map(([role, entries]) => (
          <motion.div
            key={role}
            className="rounded-xl border border-[#25253e] bg-[#1a1a2e]/30 p-3"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="text-[10px] uppercase tracking-wider opacity-40 mb-2">
              {role}
            </div>
            <div
              className="grid gap-3"
              style={{
                gridTemplateColumns: `repeat(${scenarios.length}, minmax(0, 1fr))`,
              }}
            >
              {scenarios.map((_, sIdx) => {
                const entry = entries.find((e) => e.scenarioIdx === sIdx);
                if (!entry) {
                  return (
                    <div
                      key={sIdx}
                      className="text-[10px] opacity-20 italic p-2"
                    >
                      Not present
                    </div>
                  );
                }
                const p = entry.player;
                return (
                  <div
                    key={sIdx}
                    className="rounded-lg p-2 border"
                    style={{
                      borderColor: SCENARIO_COLORS[sIdx] + '25',
                      backgroundColor: SCENARIO_COLORS[sIdx] + '06',
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-sm">{p.emoji}</span>
                      <span
                        className="text-[11px] font-bold"
                        style={{ color: SCENARIO_COLORS[sIdx] }}
                      >
                        {p.name}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] opacity-40">Goals:</div>
                      {p.goals.map((g, gi) => (
                        <div
                          key={gi}
                          className="text-[10px] opacity-70 pl-2 flex items-start gap-1"
                        >
                          <span className="opacity-40 shrink-0">-</span>
                          <span>{g}</span>
                        </div>
                      ))}
                      <div className="text-[10px] opacity-40 mt-1">
                        Strategies:
                      </div>
                      {p.strategies.map((st, si) => (
                        <div
                          key={si}
                          className="text-[10px] opacity-60 pl-2 flex items-start gap-1"
                        >
                          <span className="opacity-40 shrink-0">-</span>
                          <span>{st}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function PayoffComparison({ scenarios }: { scenarios: GameAnalysis[] }) {
  // For each scenario, calculate average payoff per player
  const chartData = useMemo(() => {
    return scenarios.map((s, sIdx) => ({
      scenarioIdx: sIdx,
      label: SCENARIO_LABELS[sIdx],
      players: s.players.map((p) => ({
        player: p,
        avgPayoff: playerAveragePayoff(s, p.id),
      })),
    }));
  }, [scenarios]);

  const maxPayoff = useMemo(() => {
    let max = 0;
    chartData.forEach((cd) => {
      cd.players.forEach((p) => {
        if (p.avgPayoff > max) max = p.avgPayoff;
      });
    });
    return Math.max(max, 1);
  }, [chartData]);

  return (
    <motion.div
      className="space-y-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <h3 className="text-xs font-bold text-[#a29bfe] flex items-center gap-1.5">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-[#6c5ce7]"
        >
          <path d="M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z" />
        </svg>
        Average Payoff Comparison
      </h3>
      <p className="text-[10px] opacity-40">
        Average payoffs across all outcomes for each player in each scenario
      </p>

      <div className="rounded-xl border border-[#25253e] bg-[#1a1a2e]/30 p-4">
        <div
          className="grid gap-6"
          style={{
            gridTemplateColumns: `repeat(${scenarios.length}, minmax(0, 1fr))`,
          }}
        >
          {chartData.map((group) => (
            <div key={group.scenarioIdx}>
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                  style={{
                    backgroundColor: SCENARIO_COLORS[group.scenarioIdx],
                  }}
                >
                  {group.label}
                </div>
                <span className="text-[10px] font-bold opacity-70">
                  {truncate(scenarios[group.scenarioIdx].title, 25)}
                </span>
              </div>

              <div className="space-y-2">
                {group.players.map((item, pIdx) => (
                  <div key={pIdx} className="flex items-center gap-2">
                    <span className="text-[10px] w-16 truncate opacity-60">
                      {item.player.emoji} {item.player.name}
                    </span>
                    <div className="flex-1 h-5 bg-[#25253e] rounded-md overflow-hidden relative">
                      <motion.div
                        className="h-full rounded-md flex items-center justify-end pr-1.5"
                        style={{
                          backgroundColor: item.player.color || SCENARIO_COLORS[group.scenarioIdx],
                          boxShadow: `0 0 8px ${(item.player.color || SCENARIO_COLORS[group.scenarioIdx])}40`,
                        }}
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(item.avgPayoff / maxPayoff) * 100}%`,
                        }}
                        transition={{ duration: 0.6, delay: pIdx * 0.08 }}
                      >
                        <span className="text-[9px] font-bold text-white drop-shadow-sm">
                          {item.avgPayoff.toFixed(1)}
                        </span>
                      </motion.div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function OutcomeComparison({ scenarios }: { scenarios: GameAnalysis[] }) {
  return (
    <motion.div
      className="space-y-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <h3 className="text-xs font-bold text-[#a29bfe] flex items-center gap-1.5">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-[#6c5ce7]"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
        Outcome Comparison
      </h3>

      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${scenarios.length}, minmax(0, 1fr))`,
        }}
      >
        {scenarios.map((s, sIdx) => {
          const sorted = [...s.outcomes].sort((a, b) => {
            const typeOrder: Record<string, number> = {
              nash: 0,
              best: 1,
              likely: 2,
              pareto: 3,
              worst: 4,
            };
            return (
              (typeOrder[a.type] ?? 5) - (typeOrder[b.type] ?? 5) ||
              b.likelihood - a.likelihood
            );
          });

          return (
            <div key={sIdx} className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                  style={{ backgroundColor: SCENARIO_COLORS[sIdx] }}
                >
                  {SCENARIO_LABELS[sIdx]}
                </div>
                <span className="text-[10px] font-bold opacity-60">
                  {truncate(s.title, 20)}
                </span>
              </div>

              {sorted.map((outcome, oIdx) => {
                const isNash = outcome.type === 'nash';
                const outcomeColor =
                  OUTCOME_COLORS[outcome.type] || '#a29bfe';

                return (
                  <motion.div
                    key={outcome.id}
                    className={`rounded-lg border p-2.5 ${isNash ? 'ring-1' : ''}`}
                    style={{
                      borderColor: outcomeColor + '35',
                      backgroundColor: outcomeColor + '08',
                      ...(isNash
                        ? { ringColor: '#6c5ce760' }
                        : {}),
                    }}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: sIdx * 0.1 + oIdx * 0.05 }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="text-[9px] uppercase tracking-wider font-bold"
                        style={{ color: outcomeColor }}
                      >
                        {outcome.type}
                        {isNash && ' *'}
                      </span>
                      <span
                        className="text-[10px] font-bold"
                        style={{ color: outcomeColor }}
                      >
                        {Math.round(outcome.likelihood * 100)}%
                      </span>
                    </div>

                    <div className="text-[10px] font-medium mb-1.5">
                      {truncate(outcome.label, 35)}
                    </div>

                    {/* Likelihood bar */}
                    <div className="h-1.5 bg-[#25253e] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: outcomeColor }}
                        initial={{ width: 0 }}
                        animate={{
                          width: `${outcome.likelihood * 100}%`,
                        }}
                        transition={{
                          duration: 0.6,
                          delay: sIdx * 0.1 + oIdx * 0.05,
                        }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function StrategyComparison({ scenarios }: { scenarios: GameAnalysis[] }) {
  // Find overlapping player roles/names
  const overlappingRoles = useMemo(() => {
    if (scenarios.length < 2) return [];
    const roleSets = scenarios.map(
      (s) =>
        new Set(
          s.players.map((p) => p.role.toLowerCase().trim()),
        ),
    );
    const first = roleSets[0];
    const shared = [...first].filter((role) =>
      roleSets.every((set) => set.has(role)),
    );
    return shared;
  }, [scenarios]);

  // Build comparison data for each overlapping role
  const comparisonData = useMemo(() => {
    return overlappingRoles.map((role) => {
      const perScenario = scenarios.map((s, sIdx) => {
        const player = s.players.find(
          (p) => p.role.toLowerCase().trim() === role,
        );
        if (!player) return null;
        const strategies = s.strategies.filter(
          (st) => st.playerId === player.id,
        );
        return { scenarioIdx: sIdx, player, strategies };
      });
      return { role, perScenario };
    });
  }, [overlappingRoles, scenarios]);

  // If no overlapping roles, show all strategies side by side
  const showGeneric = comparisonData.length === 0;

  return (
    <motion.div
      className="space-y-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <h3 className="text-xs font-bold text-[#a29bfe] flex items-center gap-1.5">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-[#6c5ce7]"
        >
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 17.93c-3.95.49-7.4-2.04-8.54-5.43h2.18a6.02 6.02 0 0 0 6.36 4.26v1.17zm3.9-4.26c-.42 1.23-1.27 2.27-2.35 2.96V16.5A3.5 3.5 0 0 0 11.05 13H8.5v-1.5h2.55A3.5 3.5 0 0 0 14.5 8H16v1.5h-1.5a2 2 0 0 1 0 4h-.91c.42.41.75.93.91 1.5h2.04a6.02 6.02 0 0 0-1.24 0.67z" />
        </svg>
        Strategy Comparison
      </h3>

      {showGeneric ? (
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `repeat(${scenarios.length}, minmax(0, 1fr))`,
          }}
        >
          {scenarios.map((s, sIdx) => (
            <div key={sIdx} className="space-y-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                  style={{ backgroundColor: SCENARIO_COLORS[sIdx] }}
                >
                  {SCENARIO_LABELS[sIdx]}
                </div>
                <span className="text-[10px] font-bold opacity-60">
                  {truncate(s.title, 20)}
                </span>
              </div>

              {s.strategies.map((st, stIdx) => {
                const player = s.players.find((p) => p.id === st.playerId);
                const risk = RISK_CONFIG[st.risk] || RISK_CONFIG.medium;

                return (
                  <motion.div
                    key={stIdx}
                    className="rounded-lg border border-[#25253e] bg-[#1a1a2e]/40 p-2.5"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: sIdx * 0.1 + stIdx * 0.05 }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] opacity-50">
                        {player?.emoji} {player?.name}
                      </span>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                        style={{
                          backgroundColor: risk.color + '20',
                          color: risk.color,
                        }}
                      >
                        {risk.label}
                      </span>
                    </div>
                    <div className="text-[11px] font-bold mb-0.5">
                      {st.name}
                    </div>
                    <p className="text-[10px] opacity-60 mb-1.5">
                      {truncate(st.description, 80)}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[#25253e] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            backgroundColor:
                              player?.color || SCENARIO_COLORS[sIdx],
                          }}
                          initial={{ width: 0 }}
                          animate={{
                            width: `${st.expectedPayoff * 10}%`,
                          }}
                          transition={{
                            duration: 0.5,
                            delay: stIdx * 0.05,
                          }}
                        />
                      </div>
                      <span className="text-[9px] font-bold opacity-70">
                        {st.expectedPayoff}/10
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {comparisonData.map(({ role, perScenario }) => (
            <div
              key={role}
              className="rounded-xl border border-[#25253e] bg-[#1a1a2e]/30 p-3"
            >
              <div className="text-[10px] uppercase tracking-wider opacity-40 mb-2">
                {role}
              </div>
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(${scenarios.length}, minmax(0, 1fr))`,
                }}
              >
                {perScenario.map((data, sIdx) => {
                  if (!data) {
                    return (
                      <div
                        key={sIdx}
                        className="text-[10px] opacity-20 italic p-2"
                      >
                        Not present
                      </div>
                    );
                  }

                  // Check for differences in strategies across scenarios
                  const otherStrategies = perScenario
                    .filter((d, idx) => d && idx !== sIdx)
                    .flatMap((d) => d!.strategies.map((s) => s.name.toLowerCase()));
                  const hasUnique = data.strategies.some(
                    (st) =>
                      !otherStrategies.includes(st.name.toLowerCase()),
                  );

                  return (
                    <div key={sIdx} className="space-y-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-sm">{data.player.emoji}</span>
                        <span
                          className="text-[10px] font-bold"
                          style={{ color: SCENARIO_COLORS[sIdx] }}
                        >
                          {data.player.name}
                        </span>
                      </div>

                      {data.strategies.map((st, stIdx) => {
                        const isUniqueStrategy = !otherStrategies.includes(
                          st.name.toLowerCase(),
                        );
                        const risk =
                          RISK_CONFIG[st.risk] || RISK_CONFIG.medium;

                        return (
                          <div
                            key={stIdx}
                            className="rounded-lg border p-2"
                            style={{
                              borderColor:
                                isUniqueStrategy && hasUnique
                                  ? '#ffd43b40'
                                  : '#25253e',
                              backgroundColor:
                                isUniqueStrategy && hasUnique
                                  ? '#ffd43b08'
                                  : '#0a0a1a40',
                            }}
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[11px] font-bold">
                                {st.name}
                              </span>
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded-full font-bold"
                                style={{
                                  backgroundColor: risk.color + '20',
                                  color: risk.color,
                                }}
                              >
                                {risk.label}
                              </span>
                            </div>
                            <p className="text-[10px] opacity-60 mb-1">
                              {truncate(st.description, 60)}
                            </p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1 bg-[#25253e] rounded-full overflow-hidden">
                                <motion.div
                                  className="h-full rounded-full"
                                  style={{
                                    backgroundColor:
                                      data.player.color ||
                                      SCENARIO_COLORS[sIdx],
                                  }}
                                  initial={{ width: 0 }}
                                  animate={{
                                    width: `${st.expectedPayoff * 10}%`,
                                  }}
                                  transition={{
                                    duration: 0.5,
                                    delay: stIdx * 0.05,
                                  }}
                                />
                              </div>
                              <span className="text-[9px] font-bold opacity-60">
                                {st.expectedPayoff}/10
                              </span>
                            </div>
                            {isUniqueStrategy && hasUnique && (
                              <div className="text-[9px] text-[#ffd43b] mt-1 flex items-center gap-1">
                                <svg
                                  width="8"
                                  height="8"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6z" />
                                </svg>
                                Unique to this scenario
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function KeyDifferences({ scenarios }: { scenarios: GameAnalysis[] }) {
  const differences = useMemo(
    () => generateKeyDifferences(scenarios),
    [scenarios],
  );

  if (!differences.length) return null;

  return (
    <motion.div
      className="space-y-3"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
    >
      <h3 className="text-xs font-bold text-[#a29bfe] flex items-center gap-1.5">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-[#6c5ce7]"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
        </svg>
        Key Differences
      </h3>

      <div className="rounded-xl border border-[#6c5ce720] bg-[#6c5ce706] p-4 space-y-2">
        {differences.map((diff, i) => (
          <motion.div
            key={i}
            className="flex items-start gap-2.5 text-xs"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 0.85, x: 0 }}
            transition={{ delay: 0.6 + i * 0.08 }}
          >
            <div className="w-5 h-5 rounded-full bg-[#6c5ce715] flex items-center justify-center text-[9px] font-bold text-[#a29bfe] shrink-0 mt-0.5">
              {i + 1}
            </div>
            <span className="leading-relaxed">{diff}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ComparisonView() {
  const { comparisonScenarios } = useStore();
  const hasEnough = comparisonScenarios.length >= MIN_SCENARIOS;

  return (
    <motion.div
      className="w-full max-w-7xl mx-auto space-y-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="bg-gradient-to-r from-[#6c5ce7] to-[#00b894] bg-clip-text text-transparent">
            Comparison Mode
          </span>
        </h2>
        <p className="text-xs opacity-40 mt-1">
          Compare game theory scenarios side by side to uncover differences and
          insights
        </p>
      </div>

      {/* Scenario Selector */}
      <ScenarioSelector />

      {/* Comparison Dashboard */}
      <AnimatePresence>
        {hasEnough && (
          <motion.div
            className="space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4 }}
          >
            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#6c5ce730] to-transparent" />
              <span className="text-[10px] uppercase tracking-widest text-[#a29bfe60] font-bold">
                Comparison Dashboard
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#6c5ce730] to-transparent" />
            </div>

            {/* A: Overview Cards */}
            <OverviewCards scenarios={comparisonScenarios} />

            {/* B: Players Comparison */}
            <PlayersComparison scenarios={comparisonScenarios} />

            {/* C: Payoff Comparison */}
            <PayoffComparison scenarios={comparisonScenarios} />

            {/* D: Outcome Comparison */}
            <OutcomeComparison scenarios={comparisonScenarios} />

            {/* E: Strategy Comparison */}
            <StrategyComparison scenarios={comparisonScenarios} />

            {/* F: Key Differences Summary */}
            <KeyDifferences scenarios={comparisonScenarios} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
