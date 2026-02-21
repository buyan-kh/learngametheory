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
// Constants
// ---------------------------------------------------------------------------

const PLAYER_LINE_COLORS = [
  '#6c5ce7', '#00b894', '#e17055', '#0984e3',
  '#fdcb6e', '#e84393', '#00cec9', '#ff7675',
];

const GOLD = '#ffd43b';

type ParameterType = 'noise' | 'learningRate' | 'rounds';

const PARAMETER_RANGES: Record<ParameterType, number[]> = {
  noise: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.5],
  learningRate: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1.0],
  rounds: [5, 10, 15, 20, 30, 40, 50, 60, 80, 100],
};

const PARAMETER_LABELS: Record<ParameterType, string> = {
  noise: 'Noise',
  learningRate: 'Learning Rate',
  rounds: 'Rounds',
};

interface SensitivityDataPoint {
  paramValue: number;
  totalPayoffs: Record<string, number>;
  converged: boolean;
}

interface SensitivityAnalysisProps {
  analysis: GameAnalysis;
  baseConfig: SimulationConfig;
  customStrategies?: CustomSimulationStrategy[];
}

// ---------------------------------------------------------------------------
// SVG Icons
// ---------------------------------------------------------------------------

function TuningIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Tooltip component
// ---------------------------------------------------------------------------

function ChartTooltip({
  x,
  y,
  content,
  visible,
}: {
  x: number;
  y: number;
  content: string[];
  visible: boolean;
}) {
  if (!visible) return null;
  return (
    <g>
      <rect
        x={x + 8}
        y={y - 10 - content.length * 14}
        width={Math.max(...content.map((c) => c.length * 5.5), 80) + 16}
        height={content.length * 14 + 10}
        rx="4"
        fill="#0d0d1a"
        stroke="#25253e"
        strokeWidth="1"
        opacity="0.95"
      />
      {content.map((line, i) => (
        <text
          key={i}
          x={x + 16}
          y={y - content.length * 14 + i * 14 + 4}
          fill="#e0e0ff"
          fontSize="9"
          fontFamily="monospace"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function SensitivityAnalysis({
  analysis,
  baseConfig,
  customStrategies,
}: SensitivityAnalysisProps) {
  const [selectedParam, setSelectedParam] = useState<ParameterType>('noise');
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SensitivityDataPoint[] | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{
    index: number;
    x: number;
    y: number;
  } | null>(null);

  const playerIds = analysis.players.map((p) => p.id);
  const nameOf = useCallback(
    (id: string) => analysis.players.find((p) => p.id === id)?.name ?? id,
    [analysis.players],
  );

  // -- Run sensitivity analysis -----------------------------------------------

  const runAnalysis = useCallback(() => {
    setIsRunning(true);
    setResults(null);
    setProgress(0);

    const range = PARAMETER_RANGES[selectedParam];
    const dataPoints: SensitivityDataPoint[] = [];

    // Use setTimeout to allow UI to update between simulations
    let i = 0;
    const runNext = () => {
      if (i >= range.length) {
        setResults(dataPoints);
        setIsRunning(false);
        return;
      }

      const paramValue = range[i];
      const config: SimulationConfig = { ...baseConfig };

      if (selectedParam === 'noise') {
        config.noise = paramValue;
      } else if (selectedParam === 'learningRate') {
        config.learningRate = paramValue;
      } else {
        config.rounds = paramValue;
      }

      const result: SimulationResult = runClientSimulation(
        analysis,
        config,
        customStrategies,
      );

      const lastRound = result.rounds[result.rounds.length - 1];
      const totalPayoffs: Record<string, number> = {};
      for (const pid of playerIds) {
        totalPayoffs[pid] = lastRound?.cumulativePayoffs[pid] ?? 0;
      }

      dataPoints.push({
        paramValue,
        totalPayoffs,
        converged: result.convergence.converged,
      });

      i++;
      setProgress(i);

      // Yield to the browser for a repaint, then continue
      setTimeout(runNext, 10);
    };

    // Kick off the first iteration after a brief delay so the loading state renders
    setTimeout(runNext, 50);
  }, [selectedParam, baseConfig, analysis, customStrategies, playerIds]);

  // -- Computed insights from results -----------------------------------------

  const insights = useMemo(() => {
    if (!results || results.length === 0) return null;

    // Sweet spot: parameter value that maximizes total welfare
    let bestWelfare = -Infinity;
    let sweetSpotIndex = 0;
    for (let i = 0; i < results.length; i++) {
      const welfare = playerIds.reduce(
        (sum, pid) => sum + (results[i].totalPayoffs[pid] ?? 0),
        0,
      );
      if (welfare > bestWelfare) {
        bestWelfare = welfare;
        sweetSpotIndex = i;
      }
    }

    // Most sensitive player: largest variance across the range
    let mostSensitiveId = playerIds[0];
    let maxVariance = 0;
    for (const pid of playerIds) {
      const values = results.map((d) => d.totalPayoffs[pid] ?? 0);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance =
        values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
      if (variance > maxVariance) {
        maxVariance = variance;
        mostSensitiveId = pid;
      }
    }

    // Convergence rate at each point
    const convergenceRate = results.map((d) => (d.converged ? 1 : 0) as number);
    const overallConvergenceRate =
      convergenceRate.reduce((a: number, b: number) => a + b, 0) / convergenceRate.length;

    // Key insight in plain English
    const firstPayoffs = playerIds.reduce(
      (sum, pid) => sum + (results[0].totalPayoffs[pid] ?? 0),
      0,
    );
    const lastPayoffs = playerIds.reduce(
      (sum, pid) =>
        sum + (results[results.length - 1].totalPayoffs[pid] ?? 0),
      0,
    );
    const paramLabel = PARAMETER_LABELS[selectedParam].toLowerCase();

    let keyInsight = '';

    // Compute per-player relative changes
    const playerChanges: { name: string; pct: number }[] = [];
    for (const pid of playerIds) {
      const first = results[0].totalPayoffs[pid] ?? 0;
      const last = results[results.length - 1].totalPayoffs[pid] ?? 0;
      const pct = first !== 0 ? Math.round(((last - first) / Math.abs(first)) * 100) : 0;
      playerChanges.push({ name: nameOf(pid), pct });
    }

    if (Math.abs(lastPayoffs - firstPayoffs) < firstPayoffs * 0.05) {
      keyInsight = `Changing ${paramLabel} has minimal effect on total payoffs. The game outcome is robust to this parameter.`;
    } else if (lastPayoffs > firstPayoffs) {
      const changeDescriptions = playerChanges
        .map((pc) => `${pc.name}'s payoff ${pc.pct >= 0 ? 'increases' : 'decreases'} ${Math.abs(pc.pct)}%`)
        .join(', ');
      keyInsight = `Higher ${paramLabel} benefits the players overall. ${changeDescriptions}.`;
    } else {
      const changeDescriptions = playerChanges
        .map((pc) => `${pc.name}'s payoff ${pc.pct >= 0 ? 'increases' : 'drops'} ${Math.abs(pc.pct)}%`)
        .join(' vs ');
      keyInsight = `Higher ${paramLabel} hurts overall welfare. ${changeDescriptions}.`;
    }

    return {
      sweetSpotValue: results[sweetSpotIndex].paramValue,
      sweetSpotWelfare: bestWelfare,
      mostSensitivePlayer: nameOf(mostSensitiveId),
      convergenceRate,
      overallConvergenceRate,
      keyInsight,
    };
  }, [results, playerIds, nameOf, selectedParam]);

  // -- Chart computations -----------------------------------------------------

  const chartData = useMemo(() => {
    if (!results || results.length === 0) return null;

    const W = 700;
    const H = 220;
    const PAD = { top: 16, right: 20, bottom: 32, left: 50 };
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;

    // Find Y range
    let maxVal = 0;
    let minVal = Infinity;
    for (const d of results) {
      for (const pid of playerIds) {
        const v = d.totalPayoffs[pid] ?? 0;
        if (v > maxVal) maxVal = v;
        if (v < minVal) minVal = v;
      }
    }
    if (maxVal === minVal) {
      maxVal += 1;
      minVal -= 1;
    }
    // Add padding
    const yRange = maxVal - minVal;
    const yPad = yRange * 0.1;
    const yMin = minVal - yPad;
    const yMax = maxVal + yPad;
    const effectiveRange = yMax - yMin || 1;

    const toX = (idx: number) =>
      PAD.left + (idx / Math.max(results.length - 1, 1)) * chartW;
    const toY = (val: number) =>
      PAD.top + chartH - ((val - yMin) / effectiveRange) * chartH;

    // Lines per player
    const lines = playerIds.map((pid, pIdx) => {
      const points = results
        .map((d, i) => `${toX(i)},${toY(d.totalPayoffs[pid] ?? 0)}`)
        .join(' ');
      const areaPoints =
        results
          .map((d, i) => `${toX(i)},${toY(d.totalPayoffs[pid] ?? 0)}`)
          .join(' ') +
        ` ${toX(results.length - 1)},${PAD.top + chartH} ${toX(0)},${PAD.top + chartH}`;
      return {
        pid,
        points,
        areaPoints,
        color: PLAYER_LINE_COLORS[pIdx % PLAYER_LINE_COLORS.length],
        dataPoints: results.map((d, i) => ({
          x: toX(i),
          y: toY(d.totalPayoffs[pid] ?? 0),
          value: d.totalPayoffs[pid] ?? 0,
        })),
      };
    });

    // Y-axis ticks
    const yTicks: number[] = [];
    const step = (yMax - yMin) / 4;
    for (let i = 0; i <= 4; i++) {
      yTicks.push(yMin + step * i);
    }

    // Convergence bar heights
    const convergenceBars = results.map((d, i) => ({
      x: toX(i),
      converged: d.converged,
    }));

    return {
      W,
      H,
      PAD,
      chartW,
      chartH,
      toX,
      toY,
      lines,
      yTicks,
      yMin,
      yMax,
      convergenceBars,
    };
  }, [results, playerIds]);

  // -- Render -----------------------------------------------------------------

  const range = PARAMETER_RANGES[selectedParam];

  return (
    <motion.div
      className="rounded-2xl border border-[#25253e] bg-[#1a1a2e]/80 backdrop-blur-sm p-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color: GOLD }}>
          <TuningIcon />
        </span>
        <h3 className="text-sm font-bold" style={{ color: GOLD }}>
          Sensitivity Analysis
        </h3>
      </div>

      {/* Parameter selector */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-[11px] text-[#e0e0ff]/50 font-medium">
          Vary:
        </span>
        <div className="flex gap-1 rounded-lg bg-[#0d0d1a]/60 p-1">
          {(Object.keys(PARAMETER_RANGES) as ParameterType[]).map((param) => (
            <button
              key={param}
              onClick={() => {
                setSelectedParam(param);
                setResults(null);
              }}
              className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all duration-200 ${
                selectedParam === param
                  ? 'text-[#0d0d1a]'
                  : 'text-[#e0e0ff]/50 hover:text-[#e0e0ff]/80 hover:bg-[#25253e]/40'
              }`}
              style={
                selectedParam === param
                  ? { backgroundColor: GOLD }
                  : undefined
              }
            >
              {PARAMETER_LABELS[param]}
            </button>
          ))}
        </div>

        {/* Run button */}
        <motion.button
          onClick={runAnalysis}
          disabled={isRunning}
          className="ml-auto px-4 py-2 rounded-lg text-[11px] font-bold transition-all duration-200 disabled:opacity-50"
          style={{
            backgroundColor: isRunning ? '#25253e' : GOLD,
            color: isRunning ? '#e0e0ff' : '#0d0d1a',
          }}
          whileHover={!isRunning ? { scale: 1.03 } : undefined}
          whileTap={!isRunning ? { scale: 0.97 } : undefined}
        >
          {isRunning ? `Running ${progress}/${range.length}...` : 'Run Sensitivity Analysis'}
        </motion.button>
      </div>

      {/* Progress bar during loading */}
      <AnimatePresence>
        {isRunning && (
          <motion.div
            className="mb-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="w-full h-1.5 rounded-full bg-[#0d0d1a]/60 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: GOLD }}
                initial={{ width: '0%' }}
                animate={{ width: `${(progress / range.length) * 100}%` }}
                transition={{ duration: 0.2 }}
              />
            </div>
            <p className="text-[10px] text-[#e0e0ff]/40 mt-1">
              Simulating with {PARAMETER_LABELS[selectedParam].toLowerCase()} ={' '}
              {progress < range.length ? range[progress] : range[range.length - 1]}...
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence mode="wait">
        {results && chartData && insights && (
          <motion.div
            key={selectedParam + '-results'}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
          >
            {/* Legend */}
            <div className="flex flex-wrap gap-3 mb-3">
              {playerIds.map((pid, i) => (
                <div key={pid} className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{
                      backgroundColor:
                        PLAYER_LINE_COLORS[i % PLAYER_LINE_COLORS.length],
                    }}
                  />
                  <span className="text-[10px] text-[#e0e0ff]/60">
                    {nameOf(pid)}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 ml-auto">
                <div
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: GOLD, opacity: 0.5 }}
                />
                <span className="text-[10px] text-[#e0e0ff]/40">
                  Converged
                </span>
              </div>
            </div>

            {/* SVG Chart */}
            <div
              className="overflow-x-auto"
              style={{ scrollbarWidth: 'thin' }}
            >
              <svg
                viewBox={`0 0 ${chartData.W} ${chartData.H}`}
                className="w-full min-w-[500px]"
                preserveAspectRatio="xMidYMid meet"
                onMouseLeave={() => setHoveredPoint(null)}
              >
                {/* Grid lines */}
                {chartData.yTicks.map((tick, i) => (
                  <g key={i}>
                    <line
                      x1={chartData.PAD.left}
                      y1={chartData.toY(tick)}
                      x2={chartData.W - chartData.PAD.right}
                      y2={chartData.toY(tick)}
                      stroke="#25253e"
                      strokeWidth="0.5"
                    />
                    <text
                      x={chartData.PAD.left - 6}
                      y={chartData.toY(tick) + 3}
                      textAnchor="end"
                      fill="#e0e0ff40"
                      fontSize="8"
                      fontFamily="monospace"
                    >
                      {tick.toFixed(1)}
                    </text>
                  </g>
                ))}

                {/* X-axis labels */}
                {results.map((d, i) => (
                  <text
                    key={i}
                    x={chartData.toX(i)}
                    y={chartData.H - 6}
                    textAnchor="middle"
                    fill="#e0e0ff30"
                    fontSize="8"
                    fontFamily="monospace"
                  >
                    {selectedParam === 'rounds'
                      ? d.paramValue
                      : d.paramValue.toFixed(2)}
                  </text>
                ))}

                {/* X-axis title */}
                <text
                  x={chartData.PAD.left + chartData.chartW / 2}
                  y={chartData.H}
                  textAnchor="middle"
                  fill="#e0e0ff20"
                  fontSize="8"
                  fontFamily="monospace"
                >
                  {PARAMETER_LABELS[selectedParam]}
                </text>

                {/* Convergence indicator bars at bottom */}
                {chartData.convergenceBars.map((bar, i) => (
                  <rect
                    key={`conv-${i}`}
                    x={bar.x - 4}
                    y={chartData.PAD.top + chartData.chartH - 3}
                    width={8}
                    height={3}
                    rx={1}
                    fill={bar.converged ? GOLD : '#25253e'}
                    opacity={bar.converged ? 0.5 : 0.3}
                  />
                ))}

                {/* Area fills */}
                {chartData.lines.map((line) => (
                  <motion.polygon
                    key={`area-${line.pid}`}
                    points={line.areaPoints}
                    fill={line.color}
                    fillOpacity={0.06}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8 }}
                  />
                ))}

                {/* Lines */}
                {chartData.lines.map((line) => (
                  <motion.polyline
                    key={`line-${line.pid}`}
                    points={line.points}
                    fill="none"
                    stroke={line.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.85 }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                  />
                ))}

                {/* Data point dots */}
                {chartData.lines.map((line) =>
                  line.dataPoints.map((dp, i) => (
                    <motion.circle
                      key={`dot-${line.pid}-${i}`}
                      cx={dp.x}
                      cy={dp.y}
                      r="3.5"
                      fill={line.color}
                      stroke="#1a1a2e"
                      strokeWidth="1.5"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1 * i, type: 'spring' }}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={() =>
                        setHoveredPoint({ index: i, x: dp.x, y: dp.y })
                      }
                    />
                  )),
                )}

                {/* Hover hitboxes (invisible, larger targets for hover) */}
                {results.map((_, i) => (
                  <rect
                    key={`hitbox-${i}`}
                    x={chartData.toX(i) - 15}
                    y={chartData.PAD.top}
                    width={30}
                    height={chartData.chartH}
                    fill="transparent"
                    onMouseEnter={() =>
                      setHoveredPoint({
                        index: i,
                        x: chartData.toX(i),
                        y: chartData.PAD.top + 20,
                      })
                    }
                  />
                ))}

                {/* Hover vertical line */}
                {hoveredPoint && (
                  <line
                    x1={chartData.toX(hoveredPoint.index)}
                    y1={chartData.PAD.top}
                    x2={chartData.toX(hoveredPoint.index)}
                    y2={chartData.PAD.top + chartData.chartH}
                    stroke="#e0e0ff"
                    strokeWidth="0.5"
                    strokeDasharray="3,3"
                    opacity={0.3}
                  />
                )}

                {/* Tooltip */}
                {hoveredPoint && results[hoveredPoint.index] && (
                  <ChartTooltip
                    x={hoveredPoint.x}
                    y={hoveredPoint.y}
                    visible={true}
                    content={[
                      `${PARAMETER_LABELS[selectedParam]}: ${results[hoveredPoint.index].paramValue}`,
                      ...playerIds.map(
                        (pid) =>
                          `${nameOf(pid)}: ${(results[hoveredPoint.index].totalPayoffs[pid] ?? 0).toFixed(1)}`,
                      ),
                      results[hoveredPoint.index].converged
                        ? 'Converged'
                        : 'Not converged',
                    ]}
                  />
                )}
              </svg>
            </div>

            {/* Insights panel */}
            <motion.div
              className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              {/* Sweet spot */}
              <div className="rounded-xl border border-[#25253e] bg-[#0d0d1a]/50 p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span style={{ color: GOLD }}>
                    <TargetIcon />
                  </span>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: GOLD }}
                  >
                    Sweet Spot
                  </span>
                </div>
                <p className="text-[13px] font-semibold text-[#e0e0ff]/90">
                  {PARAMETER_LABELS[selectedParam]} ={' '}
                  {insights.sweetSpotValue}
                </p>
                <p className="text-[10px] text-[#e0e0ff]/40 mt-0.5">
                  Maximizes total welfare ({insights.sweetSpotWelfare.toFixed(1)}{' '}
                  combined payoff)
                </p>
              </div>

              {/* Most sensitive player */}
              <div className="rounded-xl border border-[#25253e] bg-[#0d0d1a]/50 p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span style={{ color: GOLD }}>
                    <ChartIcon />
                  </span>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: GOLD }}
                  >
                    Most Sensitive
                  </span>
                </div>
                <p className="text-[13px] font-semibold text-[#e0e0ff]/90">
                  {insights.mostSensitivePlayer}
                </p>
                <p className="text-[10px] text-[#e0e0ff]/40 mt-0.5">
                  Payoff varies the most across the range
                </p>
              </div>

              {/* Convergence rate */}
              <div className="rounded-xl border border-[#25253e] bg-[#0d0d1a]/50 p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span style={{ color: GOLD }}>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: GOLD }}
                  >
                    Convergence Rate
                  </span>
                </div>
                <p className="text-[13px] font-semibold text-[#e0e0ff]/90">
                  {Math.round(insights.overallConvergenceRate * 100)}% of
                  simulations
                </p>
                <div className="flex gap-0.5 mt-1.5">
                  {insights.convergenceRate.map((rate, i) => (
                    <div
                      key={i}
                      className="flex-1 h-2 rounded-sm"
                      style={{
                        backgroundColor: rate ? GOLD : '#25253e',
                        opacity: rate ? 0.7 : 0.4,
                      }}
                      title={`${PARAMETER_LABELS[selectedParam]}=${results[i].paramValue}: ${rate ? 'Converged' : 'Not converged'}`}
                    />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Key insight */}
            <motion.div
              className="mt-3 rounded-xl border border-[#25253e] bg-[#0d0d1a]/50 p-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              <div className="flex items-start gap-2">
                <span
                  className="text-[14px] mt-0.5 shrink-0"
                  style={{ color: GOLD }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </span>
                <p className="text-[12px] text-[#e0e0ff]/70 leading-relaxed">
                  {insights.keyInsight}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!results && !isRunning && (
        <motion.div
          className="text-center py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="text-[11px] text-[#e0e0ff]/30">
            Select a parameter and run the analysis to see how outcomes change
            across different values.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
