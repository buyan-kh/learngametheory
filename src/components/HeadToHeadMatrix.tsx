'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GameAnalysis,
  SimulationConfig,
  SimulationResult,
  CustomSimulationStrategy,
} from '@/lib/types';
import { runClientSimulation } from '@/lib/simulation';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HeadToHeadMatrixProps {
  analysis: GameAnalysis;
  config: SimulationConfig;
  customStrategies?: CustomSimulationStrategy[];
}

interface StrategyEntry {
  value: string;
  label: string;
}

interface TournamentEntry {
  strategy: StrategyEntry;
  result: SimulationResult;
  /** Per-player total (cumulative) payoff at end of simulation */
  playerPayoffs: Record<string, number>;
  /** Sum of all players' total payoffs */
  totalWelfare: number;
  /** Whether the simulation converged */
  converged: boolean;
  /** Convergence round, if any */
  convergenceRound: number | null;
}

type ViewMode = 'total' | string; // 'total' or a player id
type SortMode = 'payoff' | 'convergence' | 'alpha';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BUILT_IN_STRATEGIES: StrategyEntry[] = [
  { value: 'tit-for-tat', label: 'Tit-for-Tat' },
  { value: 'random', label: 'Random' },
  { value: 'greedy', label: 'Greedy' },
  { value: 'adaptive', label: 'Adaptive' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'best-response', label: 'Best Response' },
  { value: 'fictitious-play', label: 'Fictitious Play' },
  { value: 'replicator-dynamics', label: 'Replicator' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Interpolate between red and green through yellow for a heat map. */
function heatColor(value: number, min: number, max: number): string {
  if (max === min) return 'rgba(108, 92, 231, 0.25)';
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  // red (0) -> yellow (0.5) -> green (1)
  const r = t < 0.5 ? 220 : Math.round(220 - (t - 0.5) * 2 * 180);
  const g = t < 0.5 ? Math.round(60 + t * 2 * 160) : 220;
  const b = 60;
  return `rgba(${r}, ${g}, ${b}, 0.18)`;
}

function formatPayoff(n: number): string {
  return n >= 100 ? n.toFixed(0) : n.toFixed(1);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HeadToHeadMatrix({
  analysis,
  config,
  customStrategies = [],
}: HeadToHeadMatrixProps) {
  const [entries, setEntries] = useState<TournamentEntry[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('total');
  const [sortMode, setSortMode] = useState<SortMode>('payoff');
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  const players = analysis.players;
  const playerIds = players.map((p) => p.id);

  // Build strategy list including custom ones
  const allStrategies = useMemo<StrategyEntry[]>(() => {
    const custom = customStrategies.map((cs) => ({
      value: `custom-${cs.id}`,
      label: cs.name,
    }));
    return [...BUILT_IN_STRATEGIES, ...custom];
  }, [customStrategies]);

  // -------------------------------------------------------------------------
  // Run tournament
  // -------------------------------------------------------------------------

  const runTournament = useCallback(() => {
    if (isRunning) return;
    setIsRunning(true);
    setProgress(0);
    setEntries(null);

    // Use setTimeout to yield to the event loop and allow React to render progress
    const strategies = allStrategies;
    const results: TournamentEntry[] = [];
    let idx = 0;

    function runNext() {
      if (idx >= strategies.length) {
        setEntries(results);
        setIsRunning(false);
        setProgress(100);
        return;
      }

      const strat = strategies[idx];
      const simConfig: SimulationConfig = {
        ...config,
        strategy: strat.value as SimulationConfig['strategy'],
      };
      const result = runClientSimulation(analysis, simConfig, customStrategies);
      const lastRound = result.rounds[result.rounds.length - 1];

      const playerPayoffs: Record<string, number> = {};
      let totalWelfare = 0;
      for (const pid of playerIds) {
        const p = lastRound?.cumulativePayoffs[pid] ?? 0;
        playerPayoffs[pid] = p;
        totalWelfare += p;
      }

      results.push({
        strategy: strat,
        result,
        playerPayoffs,
        totalWelfare,
        converged: result.convergence.converged,
        convergenceRound: result.convergence.equilibriumRound,
      });

      idx++;
      setProgress(Math.round((idx / strategies.length) * 100));
      setTimeout(runNext, 0);
    }

    setTimeout(runNext, 0);
  }, [isRunning, allStrategies, config, analysis, customStrategies, playerIds]);

  // -------------------------------------------------------------------------
  // Sorted entries
  // -------------------------------------------------------------------------

  const sortedEntries = useMemo(() => {
    if (!entries) return null;
    const arr = [...entries];
    switch (sortMode) {
      case 'payoff':
        arr.sort((a, b) => {
          if (viewMode === 'total') return b.totalWelfare - a.totalWelfare;
          return (b.playerPayoffs[viewMode] ?? 0) - (a.playerPayoffs[viewMode] ?? 0);
        });
        break;
      case 'convergence':
        arr.sort((a, b) => {
          const aR = a.convergenceRound ?? Infinity;
          const bR = b.convergenceRound ?? Infinity;
          return aR - bR;
        });
        break;
      case 'alpha':
        arr.sort((a, b) => a.strategy.label.localeCompare(b.strategy.label));
        break;
    }
    return arr;
  }, [entries, sortMode, viewMode]);

  // -------------------------------------------------------------------------
  // Compute matrix values
  // -------------------------------------------------------------------------

  /** For the matrix: cell(row, col) = payoff value for the current viewMode under the row algorithm */
  const matrixData = useMemo(() => {
    if (!sortedEntries) return null;

    const n = sortedEntries.length;

    // Each row = an algorithm. Each column = a player (or total welfare).
    // But per the spec, the matrix is NxN where rows and columns are both algorithms.
    // Cell (i,j) = How algorithm i's payoff compares to algorithm j.
    // We'll show: algorithm i's value minus algorithm j's value (payoff advantage).

    // First gather per-algorithm values
    const values: number[] = sortedEntries.map((e) => {
      if (viewMode === 'total') return e.totalWelfare;
      return e.playerPayoffs[viewMode] ?? 0;
    });

    // Build NxN difference matrix
    const matrix: number[][] = [];
    let globalMin = Infinity;
    let globalMax = -Infinity;

    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) {
        const diff = values[i] - values[j];
        row.push(diff);
        if (i !== j) {
          globalMin = Math.min(globalMin, diff);
          globalMax = Math.max(globalMax, diff);
        }
      }
      matrix.push(row);
    }

    // Absolute values for the diagonal
    const absValues = values;

    return { matrix, absValues, globalMin, globalMax, values };
  }, [sortedEntries, viewMode]);

  // -------------------------------------------------------------------------
  // Rank badges
  // -------------------------------------------------------------------------

  const ranks = useMemo(() => {
    if (!sortedEntries) return new Map<string, number>();
    // Rank by payoff regardless of current sort
    const byPayoff = [...sortedEntries].sort((a, b) => {
      if (viewMode === 'total') return b.totalWelfare - a.totalWelfare;
      return (b.playerPayoffs[viewMode] ?? 0) - (a.playerPayoffs[viewMode] ?? 0);
    });
    const map = new Map<string, number>();
    byPayoff.forEach((e, i) => map.set(e.strategy.value, i + 1));
    return map;
  }, [sortedEntries, viewMode]);

  // -------------------------------------------------------------------------
  // Dominance detection
  // -------------------------------------------------------------------------

  const dominanceInfo = useMemo(() => {
    if (!entries) return null;
    // Algorithm A strictly dominates B if for EVERY player, A gives >= payoff AND at least one strictly greater.
    const dominated = new Map<string, string[]>(); // key dominates values
    for (const a of entries) {
      const doms: string[] = [];
      for (const b of entries) {
        if (a.strategy.value === b.strategy.value) continue;
        let allGe = true;
        let oneStrict = false;
        for (const pid of playerIds) {
          const pa = a.playerPayoffs[pid] ?? 0;
          const pb = b.playerPayoffs[pid] ?? 0;
          if (pa < pb) { allGe = false; break; }
          if (pa > pb) oneStrict = true;
        }
        if (allGe && oneStrict) doms.push(b.strategy.label);
      }
      if (doms.length > 0) dominated.set(a.strategy.value, doms);
    }
    return dominated;
  }, [entries, playerIds]);

  // -------------------------------------------------------------------------
  // Win/Loss/Draw record
  // -------------------------------------------------------------------------

  const wldRecords = useMemo(() => {
    if (!sortedEntries) return null;
    return sortedEntries.map((entry) => {
      let wins = 0;
      let losses = 0;
      let draws = 0;
      for (const other of sortedEntries) {
        if (other.strategy.value === entry.strategy.value) continue;
        if (entry.totalWelfare > other.totalWelfare) wins++;
        else if (entry.totalWelfare < other.totalWelfare) losses++;
        else draws++;
      }
      return { strategy: entry.strategy, wins, losses, draws };
    });
  }, [sortedEntries]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <motion.div
      className="rounded-2xl border border-[#25253e] bg-[#1a1a2e]/80 backdrop-blur-sm p-5 space-y-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#ffd43b]/20 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffd43b" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#ffd43b]">Head-to-Head Matrix</h3>
            <p className="text-[10px] text-[#e0e0ff]/40">
              Pairwise payoff comparison across all strategy algorithms
            </p>
          </div>
        </div>

        <motion.button
          onClick={runTournament}
          disabled={isRunning}
          className="py-2.5 px-5 rounded-xl bg-[#ffd43b]/10 border border-[#ffd43b]/30 text-[#ffd43b]
            text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all
            hover:bg-[#ffd43b]/20 hover:shadow-[0_0_20px_rgba(255,212,59,0.15)]"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isRunning ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Running... {progress}%
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
              Run Tournament
            </span>
          )}
        </motion.button>
      </div>

      {/* Progress bar */}
      <AnimatePresence>
        {isRunning && (
          <motion.div
            className="w-full h-1.5 rounded-full bg-[#25253e] overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#ffd43b] to-[#ff9f43]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.2 }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <AnimatePresence>
        {sortedEntries && (
          <motion.div
            className="flex flex-wrap items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {/* Per-player toggle */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-[#e0e0ff]/30 mr-1">View:</span>
              <button
                onClick={() => setViewMode('total')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                  viewMode === 'total'
                    ? 'bg-[#ffd43b]/15 text-[#ffd43b] border border-[#ffd43b]/30'
                    : 'bg-[#25253e]/50 text-[#e0e0ff]/40 border border-transparent hover:text-[#e0e0ff]/60'
                }`}
              >
                Total Welfare
              </button>
              {players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setViewMode(p.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                    viewMode === p.id
                      ? 'bg-[#6c5ce7]/15 text-[#a29bfe] border border-[#6c5ce7]/30'
                      : 'bg-[#25253e]/50 text-[#e0e0ff]/40 border border-transparent hover:text-[#e0e0ff]/60'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>

            {/* Sort options */}
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[10px] uppercase tracking-wider text-[#e0e0ff]/30 mr-1">Sort:</span>
              {([
                { key: 'payoff' as SortMode, label: 'Payoff' },
                { key: 'convergence' as SortMode, label: 'Convergence' },
                { key: 'alpha' as SortMode, label: 'A-Z' },
              ]).map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSortMode(opt.key)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                    sortMode === opt.key
                      ? 'bg-[#00b894]/15 text-[#00b894] border border-[#00b894]/30'
                      : 'bg-[#25253e]/50 text-[#e0e0ff]/40 border border-transparent hover:text-[#e0e0ff]/60'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dominance alerts */}
      <AnimatePresence>
        {dominanceInfo && dominanceInfo.size > 0 && (
          <motion.div
            className="space-y-1.5"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {Array.from(dominanceInfo.entries()).map(([key, dominated]) => {
              const entry = entries?.find((e) => e.strategy.value === key);
              if (!entry) return null;
              return (
                <div
                  key={key}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#00b894]/8 border border-[#00b894]/20"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00b894" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span className="text-[11px] text-[#00b894]">
                    <span className="font-bold">{entry.strategy.label}</span>{' '}
                    strictly dominates {dominated.join(', ')}
                  </span>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Matrix */}
      <AnimatePresence>
        {sortedEntries && matrixData && (
          <motion.div
            className="overflow-x-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="inline-block min-w-full">
              <div
                className="grid gap-[3px]"
                style={{
                  gridTemplateColumns: `140px repeat(${sortedEntries.length}, minmax(72px, 1fr))`,
                }}
              >
                {/* Top-left corner */}
                <div className="rounded-lg bg-[#25253e]/30 p-2 flex items-center justify-center">
                  <span className="text-[9px] text-[#e0e0ff]/30 uppercase tracking-wider">
                    Row vs Col
                  </span>
                </div>

                {/* Column headers */}
                {sortedEntries.map((col, j) => {
                  const rank = ranks.get(col.strategy.value) ?? 0;
                  return (
                    <motion.div
                      key={`col-${col.strategy.value}`}
                      className="rounded-lg bg-[#25253e]/40 p-2 flex flex-col items-center justify-center gap-0.5"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * j }}
                    >
                      <span className="text-[10px] font-semibold text-[#e0e0ff]/70 text-center leading-tight">
                        {col.strategy.label}
                      </span>
                      <span
                        className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                          rank === 1
                            ? 'bg-[#ffd43b]/20 text-[#ffd43b]'
                            : rank === 2
                              ? 'bg-[#a29bfe]/15 text-[#a29bfe]'
                              : rank === 3
                                ? 'bg-[#e17055]/15 text-[#e17055]'
                                : 'bg-[#25253e] text-[#e0e0ff]/30'
                        }`}
                      >
                        #{rank}
                      </span>
                    </motion.div>
                  );
                })}

                {/* Rows */}
                {sortedEntries.map((row, i) => {
                  const rank = ranks.get(row.strategy.value) ?? 0;
                  return (
                    <>
                      {/* Row header */}
                      <motion.div
                        key={`row-${row.strategy.value}`}
                        className="rounded-lg bg-[#25253e]/40 p-2 flex items-center gap-2"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * i }}
                      >
                        <span
                          className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                            rank === 1
                              ? 'bg-[#ffd43b]/20 text-[#ffd43b]'
                              : rank === 2
                                ? 'bg-[#a29bfe]/15 text-[#a29bfe]'
                                : rank === 3
                                  ? 'bg-[#e17055]/15 text-[#e17055]'
                                  : 'bg-[#25253e] text-[#e0e0ff]/30'
                          }`}
                        >
                          #{rank}
                        </span>
                        <span className="text-[10px] font-semibold text-[#e0e0ff]/70 leading-tight">
                          {row.strategy.label}
                        </span>
                      </motion.div>

                      {/* Cells */}
                      {sortedEntries.map((col, j) => {
                        const isDiagonal = i === j;
                        const diff = matrixData.matrix[i][j];
                        const isHovered =
                          hoveredCell?.row === i && hoveredCell?.col === j;

                        let bgColor: string;
                        if (isDiagonal) {
                          bgColor = 'rgba(108, 92, 231, 0.12)';
                        } else {
                          bgColor = heatColor(
                            diff,
                            matrixData.globalMin,
                            matrixData.globalMax,
                          );
                        }

                        const displayValue = isDiagonal
                          ? formatPayoff(matrixData.values[i])
                          : (diff >= 0 ? '+' : '') + formatPayoff(diff);

                        return (
                          <motion.div
                            key={`cell-${row.strategy.value}-${col.strategy.value}`}
                            className={`rounded-lg p-2 flex items-center justify-center cursor-default relative transition-all ${
                              isDiagonal
                                ? 'border border-[#6c5ce7]/20'
                                : 'border border-transparent'
                            } ${isHovered ? 'ring-1 ring-[#ffd43b]/40 z-10' : ''}`}
                            style={{ backgroundColor: bgColor }}
                            onMouseEnter={() => setHoveredCell({ row: i, col: j })}
                            onMouseLeave={() => setHoveredCell(null)}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              delay: 0.02 * (i * sortedEntries.length + j),
                              duration: 0.2,
                            }}
                          >
                            <span
                              className={`text-[11px] font-mono font-semibold ${
                                isDiagonal
                                  ? 'text-[#a29bfe]'
                                  : diff > 0
                                    ? 'text-[#00b894]'
                                    : diff < 0
                                      ? 'text-[#e17055]'
                                      : 'text-[#e0e0ff]/50'
                              }`}
                            >
                              {displayValue}
                            </span>

                            {/* Tooltip */}
                            <AnimatePresence>
                              {isHovered && (
                                <motion.div
                                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg
                                    bg-[#0d0d21] border border-[#25253e] shadow-xl z-50 whitespace-nowrap pointer-events-none"
                                  initial={{ opacity: 0, y: 4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 4 }}
                                  transition={{ duration: 0.15 }}
                                >
                                  {isDiagonal ? (
                                    <div className="space-y-0.5">
                                      <div className="text-[10px] font-bold text-[#a29bfe]">
                                        {row.strategy.label}
                                      </div>
                                      <div className="text-[9px] text-[#e0e0ff]/60">
                                        {viewMode === 'total' ? 'Total welfare' : `${players.find((p) => p.id === viewMode)?.name}'s payoff`}:{' '}
                                        <span className="text-[#e0e0ff] font-mono">
                                          {formatPayoff(matrixData.values[i])}
                                        </span>
                                      </div>
                                      <div className="text-[9px] text-[#e0e0ff]/40">
                                        {row.converged
                                          ? `Converged at round ${row.convergenceRound}`
                                          : 'Did not converge'}
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-0.5">
                                      <div className="text-[10px] font-bold text-[#e0e0ff]/80">
                                        {row.strategy.label} vs {col.strategy.label}
                                      </div>
                                      <div className="text-[9px] text-[#e0e0ff]/60">
                                        {row.strategy.label}:{' '}
                                        <span className="text-[#e0e0ff] font-mono">
                                          {formatPayoff(matrixData.values[i])}
                                        </span>
                                      </div>
                                      <div className="text-[9px] text-[#e0e0ff]/60">
                                        {col.strategy.label}:{' '}
                                        <span className="text-[#e0e0ff] font-mono">
                                          {formatPayoff(matrixData.values[j])}
                                        </span>
                                      </div>
                                      <div className="text-[9px] text-[#e0e0ff]/40">
                                        Advantage:{' '}
                                        <span
                                          className={`font-mono ${
                                            diff > 0
                                              ? 'text-[#00b894]'
                                              : diff < 0
                                                ? 'text-[#e17055]'
                                                : 'text-[#e0e0ff]/50'
                                          }`}
                                        >
                                          {diff >= 0 ? '+' : ''}
                                          {formatPayoff(diff)}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="mt-3 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-[#e0e0ff]/30 uppercase tracking-wider">Heat Map:</span>
                <div className="flex items-center gap-0.5">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: heatColor(0, 0, 1) }} />
                  <span className="text-[9px] text-[#e17055]/60">Low</span>
                </div>
                <div className="w-16 h-2 rounded-full" style={{
                  background: 'linear-gradient(to right, rgba(220,60,60,0.18), rgba(220,220,60,0.18), rgba(40,220,60,0.18))',
                }} />
                <div className="flex items-center gap-0.5">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: heatColor(1, 0, 1) }} />
                  <span className="text-[9px] text-[#00b894]/60">High</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded border border-[#6c5ce7]/30" style={{ backgroundColor: 'rgba(108,92,231,0.12)' }} />
                  <span className="text-[9px] text-[#e0e0ff]/30">Diagonal (self)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-mono text-[#00b894]">+</span>
                  <span className="text-[9px] text-[#e0e0ff]/30">Row beats column</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-mono text-[#e17055]">-</span>
                  <span className="text-[9px] text-[#e0e0ff]/30">Column beats row</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Win/Loss/Draw Record */}
      <AnimatePresence>
        {wldRecords && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="text-[10px] uppercase tracking-wider text-[#e0e0ff]/30 mb-2 flex items-center gap-1.5">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20V10" />
                <path d="M18 20V4" />
                <path d="M6 20v-4" />
              </svg>
              Win-Loss-Draw Record (by total welfare)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {wldRecords.map((record, i) => {
                const total = record.wins + record.losses + record.draws;
                const winPct = total > 0 ? Math.round((record.wins / total) * 100) : 0;
                return (
                  <motion.div
                    key={record.strategy.value}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#25253e]/30 border border-[#25253e]/50"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                  >
                    <span className="text-[10px] font-semibold text-[#e0e0ff]/70 w-24 truncate shrink-0">
                      {record.strategy.label}
                    </span>
                    <div className="flex items-center gap-2 text-[10px] font-mono">
                      <span className="text-[#00b894]">{record.wins}W</span>
                      <span className="text-[#e17055]">{record.losses}L</span>
                      <span className="text-[#e0e0ff]/40">{record.draws}D</span>
                    </div>
                    {/* Mini bar */}
                    <div className="flex-1 h-1.5 rounded-full bg-[#25253e] overflow-hidden ml-1">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#00b894] to-[#00b894]/60"
                        style={{ width: `${winPct}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-[#e0e0ff]/30 font-mono w-7 text-right">
                      {winPct}%
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!entries && !isRunning && (
        <div className="text-center py-8">
          <div className="text-[#e0e0ff]/20 text-sm">
            Click <span className="text-[#ffd43b]/60 font-semibold">Run Tournament</span> to generate
            the head-to-head matrix
          </div>
          <p className="text-[10px] text-[#e0e0ff]/15 mt-1">
            Runs each algorithm and compares pairwise payoff advantages
          </p>
        </div>
      )}
    </motion.div>
  );
}
