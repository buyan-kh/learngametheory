'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { GameAnalysis, SimulationConfig, SimulationResult } from '@/lib/types';
import { runClientSimulation } from '@/lib/simulation';
import PixelCharacter from './PixelCharacter';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STRATEGY_COLORS = [
  '#6c5ce7', '#00b894', '#e17055', '#0984e3',
  '#fdcb6e', '#e84393', '#00cec9', '#ff7675',
  '#a29bfe', '#55efc4', '#fab1a0', '#74b9ff',
];

const PLAYER_LINE_COLORS = [
  '#6c5ce7', '#00b894', '#e17055', '#0984e3',
  '#fdcb6e', '#e84393', '#00cec9', '#ff7675',
];

function getStrategyColor(strategy: string, allStrategies: string[]): string {
  const idx = allStrategies.indexOf(strategy);
  return STRATEGY_COLORS[idx >= 0 ? idx % STRATEGY_COLORS.length : 0];
}

// ---------------------------------------------------------------------------
// Strategy definitions for the selector
// ---------------------------------------------------------------------------

const STRATEGY_OPTIONS: {
  value: SimulationConfig['strategy'];
  label: string;
  description: string;
}[] = [
  {
    value: 'tit-for-tat',
    label: 'Tit-for-Tat',
    description: "Start cooperative, then mirror the opponent's last move.",
  },
  {
    value: 'random',
    label: 'Random',
    description: 'Each player picks randomly from their available strategies.',
  },
  {
    value: 'greedy',
    label: 'Greedy',
    description: 'Always pick the strategy with highest expected payoff.',
  },
  {
    value: 'adaptive',
    label: 'Adaptive',
    description: 'Explore-exploit: weight strategies by historical payoffs.',
  },
  {
    value: 'mixed',
    label: 'Mixed',
    description: 'Each player uses a different algorithm for diverse dynamics.',
  },
  {
    value: 'best-response',
    label: 'Best Response',
    description: "Each player picks the strategy maximizing payoff given opponents' last choices.",
  },
  {
    value: 'fictitious-play',
    label: 'Fictitious Play',
    description: 'Best-respond to the historical frequency of opponent strategies.',
  },
  {
    value: 'replicator-dynamics',
    label: 'Replicator',
    description: 'Strategy probabilities evolve based on relative payoff performance.',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a smooth SVG path through points using catmull-rom spline */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  if (points.length === 2)
    return `M${points[0].x},${points[0].y}L${points[1].x},${points[1].y}`;
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

/** Animated counting number that eases from previous value to new value */
function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const diff = value - from;
    const startTime = performance.now();
    cancelAnimationFrame(rafRef.current);
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + diff * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return <>{display.toFixed(1)}</>;
}

/** Particle burst for convergence celebration */
function ConvergenceBurst() {
  const particles = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        angle: (i / 12) * Math.PI * 2,
        dist: 30 + Math.random() * 30,
        size: 3 + Math.random() * 4,
        color: STRATEGY_COLORS[i % STRATEGY_COLORS.length],
      })),
    [],
  );

  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{ width: p.size, height: p.size, backgroundColor: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
          animate={{
            x: Math.cos(p.angle) * p.dist,
            y: Math.sin(p.angle) * p.dist,
            opacity: 0,
            scale: 1.5,
          }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Slider control used throughout the setup panel */
function ConfigSlider({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex-1 min-w-[180px]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-[#a29bfe] font-medium">{label}</span>
        <span className="text-[11px] text-[#e0e0ff] font-mono bg-[#25253e] px-2 py-0.5 rounded">
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#6c5ce7]
          [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#a29bfe]
          [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(108,92,231,0.5)]
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-[#6c5ce7] [&::-moz-range-thumb]:border-2
          [&::-moz-range-thumb]:border-[#a29bfe]"
        style={{
          background: `linear-gradient(to right, #6c5ce7 0%, #6c5ce7 ${((value - min) / (max - min)) * 100}%, #25253e ${((value - min) / (max - min)) * 100}%, #25253e 100%)`,
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Setup Panel
// ---------------------------------------------------------------------------

function SetupPanel({
  analysis,
  config,
  isSimulating,
  onConfigChange,
  onRunSimulation,
  onChangeScenario,
}: {
  analysis: GameAnalysis | null;
  config: SimulationConfig;
  isSimulating: boolean;
  onConfigChange: (partial: Partial<SimulationConfig>) => void;
  onRunSimulation: () => void;
  onChangeScenario: () => void;
}) {
  const { setInput, setAnalysis, setIsAnalyzing, setError, addToHistory } = useStore();
  const [localInput, setLocalInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyzeFirst = useCallback(async () => {
    if (!localInput.trim() || analyzing) return;
    setAnalyzing(true);
    setError(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: localInput.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Analysis failed');
      }

      const { analysis: newAnalysis } = await res.json();
      setAnalysis(newAnalysis);
      setInput(localInput.trim());
      addToHistory(localInput.trim(), newAnalysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setAnalyzing(false);
      setIsAnalyzing(false);
    }
  }, [localInput, analyzing, setError, setAnalysis, setInput, setIsAnalyzing, addToHistory]);

  return (
    <motion.div
      className="rounded-2xl border border-[#25253e] bg-[#1a1a2e]/80 backdrop-blur-sm p-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Scenario section */}
      {!analysis ? (
        <div className="mb-5">
          <h3 className="text-xs font-bold text-[#a29bfe] mb-3 flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Describe a Scenario to Simulate
          </h3>
          <textarea
            className="w-full bg-[#0a0a1a] border border-[#25253e] rounded-xl px-4 py-3 text-sm text-[#e0e0ff]
              placeholder:text-[#e0e0ff30] resize-none outline-none min-h-[80px] focus:border-[#6c5ce7] transition-colors"
            placeholder='e.g. "Two companies competing for market share with pricing strategies"'
            value={localInput}
            onChange={(e) => setLocalInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAnalyzeFirst();
            }}
          />
          <motion.button
            onClick={handleAnalyzeFirst}
            disabled={!localInput.trim() || analyzing}
            className="mt-3 px-5 py-2 rounded-xl bg-[#6c5ce7] text-white text-xs font-bold
              hover:bg-[#5b4bd5] disabled:opacity-30 disabled:cursor-not-allowed transition-all
              flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {analyzing ? (
              <>
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                Analyze First
              </>
            )}
          </motion.button>
        </div>
      ) : (
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#6c5ce7]/20 flex items-center justify-center text-lg">
              {analysis.players[0]?.emoji || '?'}
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#e0e0ff]">{analysis.title}</h3>
              <p className="text-[10px] text-[#a29bfe]">{analysis.gameType}</p>
            </div>
          </div>
          <button
            onClick={onChangeScenario}
            className="text-[10px] px-3 py-1.5 rounded-lg bg-[#25253e] text-[#a29bfe]
              hover:bg-[#6c5ce720] transition-colors"
          >
            Change Scenario
          </button>
        </div>
      )}

      {/* Config controls */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-[#a29bfe] flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Simulation Configuration
        </h3>

        <div className="flex flex-wrap gap-4">
          <ConfigSlider
            label="Rounds"
            value={config.rounds}
            min={5}
            max={100}
            step={5}
            displayValue={`${config.rounds}`}
            onChange={(v) => onConfigChange({ rounds: v })}
          />

          <ConfigSlider
            label="Noise"
            value={config.noise}
            min={0}
            max={0.5}
            step={0.05}
            displayValue={`${(config.noise * 100).toFixed(0)}%`}
            onChange={(v) => onConfigChange({ noise: v })}
          />

          <ConfigSlider
            label="Learning Rate"
            value={config.learningRate}
            min={0}
            max={1}
            step={0.1}
            displayValue={`${config.learningRate.toFixed(1)}`}
            onChange={(v) => onConfigChange({ learningRate: v })}
          />
        </div>

        {/* Strategy selector */}
        <div>
          <span className="text-[11px] text-[#a29bfe] font-medium block mb-1.5">Strategy Algorithm</span>
          <div className="flex flex-wrap gap-2">
            {STRATEGY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onConfigChange({ strategy: opt.value })}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  config.strategy === opt.value
                    ? 'bg-[#6c5ce7] text-white shadow-[0_0_12px_rgba(108,92,231,0.4)]'
                    : 'bg-[#25253e] text-[#a29bfe] hover:bg-[#6c5ce720]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[#e0e0ff]/30 mt-1.5">
            {STRATEGY_OPTIONS.find((o) => o.value === config.strategy)?.description}
          </p>
        </div>
      </div>

      {/* Run button */}
      <motion.button
        onClick={onRunSimulation}
        disabled={!analysis || isSimulating}
        className="mt-5 w-full py-3 rounded-xl bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] text-white
          text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all
          hover:shadow-[0_0_30px_rgba(108,92,231,0.4)] relative overflow-hidden"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        {isSimulating ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Simulating...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Run Simulation
          </span>
        )}
      </motion.button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Timeline Chart (SVG Line Chart)
// ---------------------------------------------------------------------------

function TimelineChart({ result }: { result: SimulationResult }) {
  const playerIds = result.analysis.players.map((p) => p.id);
  const nameOf = (id: string) => result.analysis.players.find((p) => p.id === id)?.name ?? id;

  const W = 600;
  const H = 200;
  const PAD = { top: 10, right: 10, bottom: 25, left: 45 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const maxPayoff = useMemo(() => {
    let m = 0;
    for (const round of result.rounds) {
      for (const pid of playerIds) {
        if (round.payoffs[pid] > m) m = round.payoffs[pid];
      }
    }
    return Math.max(m, 1);
  }, [result.rounds, playerIds]);

  const getX = (idx: number) =>
    PAD.left + (result.rounds.length > 1 ? (idx / (result.rounds.length - 1)) * chartW : chartW / 2);
  const getY = (payoff: number) =>
    PAD.top + chartH - (payoff / maxPayoff) * chartH;

  const convergenceIdx = useMemo(() => {
    if (!result.convergence.converged || result.convergence.equilibriumRound == null) return -1;
    return result.rounds.findIndex((r) => r.round === result.convergence.equilibriumRound);
  }, [result.rounds, result.convergence]);

  return (
    <motion.div
      className="rounded-2xl border border-[#25253e] bg-[#1a1a2e]/80 backdrop-blur-sm p-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <h3 className="text-xs font-bold text-[#a29bfe] mb-3 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
        </svg>
        Payoff Timeline
      </h3>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-3">
        {playerIds.map((pid, i) => (
          <div key={pid} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: PLAYER_LINE_COLORS[i % PLAYER_LINE_COLORS.length] }}
            />
            <span className="text-[10px] text-[#e0e0ff]/60">{nameOf(pid)}</span>
          </div>
        ))}
        {result.convergence.converged && (
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="w-0 h-3 border-l border-dashed border-[#ffd43b]" />
            <span className="text-[10px] text-[#ffd43b]/60">Convergence</span>
          </div>
        )}
      </div>

      {/* SVG Line Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          {playerIds.map((pid, i) => (
            <linearGradient key={pid} id={`pg-${pid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PLAYER_LINE_COLORS[i % PLAYER_LINE_COLORS.length]} stopOpacity="0.2" />
              <stop offset="100%" stopColor={PLAYER_LINE_COLORS[i % PLAYER_LINE_COLORS.length]} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={PAD.left}
            y1={getY(f * maxPayoff)}
            x2={W - PAD.right}
            y2={getY(f * maxPayoff)}
            stroke="#25253e"
            strokeWidth="0.5"
          />
        ))}

        {/* Y axis labels */}
        {[0, 0.5, 1].map((f) => (
          <text
            key={f}
            x={PAD.left - 5}
            y={getY(f * maxPayoff)}
            fill="#e0e0ff"
            fillOpacity="0.3"
            fontSize="8"
            textAnchor="end"
            dominantBaseline="middle"
          >
            {(f * maxPayoff).toFixed(0)}
          </text>
        ))}

        {/* Convergence vertical dashed line */}
        {convergenceIdx >= 0 && (
          <line
            x1={getX(convergenceIdx)}
            y1={PAD.top}
            x2={getX(convergenceIdx)}
            y2={PAD.top + chartH}
            stroke="#ffd43b"
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity="0.6"
          />
        )}

        {/* Player lines, gradient fills, dot markers */}
        {playerIds.map((pid, pIdx) => {
          const color = PLAYER_LINE_COLORS[pIdx % PLAYER_LINE_COLORS.length];
          const points = result.rounds.map((r, i) => ({
            x: getX(i),
            y: getY(r.payoffs[pid] ?? 0),
          }));
          if (points.length === 0) return null;

          const linePath = smoothPath(points);
          const areaPath =
            `${linePath} L${points[points.length - 1].x},${PAD.top + chartH} L${points[0].x},${PAD.top + chartH} Z`;

          return (
            <g key={pid}>
              {/* Gradient area fill */}
              <path d={areaPath} fill={`url(#pg-${pid})`} opacity="0.8" />
              {/* Smooth bezier line */}
              <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Dot markers at each round */}
              {points.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r="2.5"
                  fill={color}
                  stroke="#1a1a2e"
                  strokeWidth="1"
                  opacity="0.9"
                >
                  <title>R{result.rounds[i]?.round} {nameOf(pid)}: {(result.rounds[i]?.payoffs[pid] ?? 0).toFixed(1)}</title>
                </circle>
              ))}
            </g>
          );
        })}

        {/* X axis round labels */}
        {result.rounds.map((r, i) => {
          if (r.round === 1 || r.round % 5 === 0 || i === result.rounds.length - 1) {
            return (
              <text
                key={i}
                x={getX(i)}
                y={H - 5}
                fill="#e0e0ff"
                fillOpacity="0.3"
                fontSize="8"
                textAnchor="middle"
              >
                {r.round}
              </text>
            );
          }
          return null;
        })}
      </svg>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Battle Arena
// ---------------------------------------------------------------------------

function BattleArena({
  result,
  currentRoundIdx,
}: {
  result: SimulationResult;
  currentRoundIdx: number;
}) {
  const players = result.analysis.players;
  const round = result.rounds[currentRoundIdx];
  if (!round) return null;

  const playerIds = players.map((p) => p.id);
  const maxPayoff = Math.max(...playerIds.map((id) => round.payoffs[id] ?? 0));

  return (
    <motion.div
      className="rounded-2xl border border-[#25253e] bg-[#1a1a2e]/80 backdrop-blur-sm p-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between text-[10px] mb-3">
        <span className="font-bold text-[#a29bfe] flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" />
          </svg>
          Round {round.round}
        </span>
        <span className="text-[#e0e0ff]/30">Battle Arena</span>
      </div>
      <div className="flex items-center justify-center gap-6 sm:gap-10">
        {players.map((player, i) => {
          const payoff = round.payoffs[player.id] ?? 0;
          const isWinner = payoff >= maxPayoff && maxPayoff > 0;
          const strategy = round.strategies[player.id] ?? '?';

          return (
            <motion.div
              key={player.id}
              className="flex flex-col items-center"
              animate={{
                opacity: isWinner ? 1 : 0.5,
                scale: isWinner ? 1.05 : 0.95,
              }}
              transition={{ duration: 0.3 }}
            >
              {/* Speech bubble */}
              <motion.div
                className="px-2 py-1 rounded-lg border border-[#25253e] bg-[#0a0a1a] text-[9px] text-[#e0e0ff] mb-2 relative whitespace-nowrap"
                key={`${round.round}-${player.id}`}
                initial={{ opacity: 0, y: 5, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                {strategy}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#0a0a1a] border-r border-b border-[#25253e] rotate-45" />
              </motion.div>

              {/* Pixel character (flip alternate players to face each other) */}
              <motion.div
                style={{ transform: i > 0 ? 'scaleX(-1)' : undefined }}
                animate={
                  isWinner
                    ? { filter: `drop-shadow(0 0 8px ${player.color})` }
                    : { filter: 'drop-shadow(0 0 0px transparent)' }
                }
                transition={{ duration: 0.3 }}
              >
                <PixelCharacter player={player} size={4} showLabel={false} animate={false} />
              </motion.div>

              <div className="mt-1 text-[9px] font-medium" style={{ color: player.color }}>
                {player.name}
              </div>
              <div className="text-[8px] text-[#e0e0ff]/40 font-mono">
                +{payoff.toFixed(1)}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Strategy Evolution
// ---------------------------------------------------------------------------

function StrategyEvolution({
  result,
}: {
  result: SimulationResult;
}) {
  const playerIds = result.analysis.players.map((p) => p.id);
  const nameOf = (id: string) => result.analysis.players.find((p) => p.id === id)?.name ?? id;

  // Collect all unique strategies across all players
  const allStrategies = useMemo(() => {
    const set = new Set<string>();
    for (const round of result.rounds) {
      for (const pid of playerIds) {
        if (round.strategies[pid]) set.add(round.strategies[pid]);
      }
    }
    return Array.from(set);
  }, [result.rounds, playerIds]);

  // Determine stable region: for each player, find the first round from which
  // the strategy doesn't change until the end.
  const stableFrom = useMemo(() => {
    const sf: Record<string, number | null> = {};
    for (const pid of playerIds) {
      const final = result.rounds[result.rounds.length - 1]?.strategies[pid];
      let start: number | null = null;
      // Walk backwards
      for (let i = result.rounds.length - 1; i >= 0; i--) {
        if (result.rounds[i].strategies[pid] === final) {
          start = result.rounds[i].round;
        } else {
          break;
        }
      }
      sf[pid] = start !== null && start < result.rounds[result.rounds.length - 1]?.round ? start : null;
    }
    return sf;
  }, [result.rounds, playerIds]);

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [result]);

  // Compute strategy frequencies per player for summary bars
  const freqMap = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    for (const pid of playerIds) {
      const freq: Record<string, number> = {};
      for (const round of result.rounds) {
        const s = round.strategies[pid];
        if (s) freq[s] = (freq[s] || 0) + 1;
      }
      map[pid] = freq;
    }
    return map;
  }, [result.rounds, playerIds]);

  return (
    <motion.div
      className="rounded-2xl border border-[#25253e] bg-[#1a1a2e]/80 backdrop-blur-sm p-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <h3 className="text-xs font-bold text-[#a29bfe] mb-3 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
        Strategy Evolution
      </h3>

      {/* Strategy color legend */}
      <div className="flex flex-wrap gap-2 mb-3">
        {allStrategies.map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: getStrategyColor(s, allStrategies) }}
            />
            <span className="text-[10px] text-[#e0e0ff]/60">{s}</span>
          </div>
        ))}
      </div>

      {/* Evolution rows */}
      <div ref={scrollRef} className="overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
        <div className="min-w-max space-y-2">
          {playerIds.map((pid, pIdx) => (
            <div key={pid} className="flex items-center gap-2">
              <div className="w-24 shrink-0 text-[10px] text-[#e0e0ff]/60 truncate text-right pr-2">
                {nameOf(pid)}
              </div>
              <div className="flex items-center gap-[2px]">
                {result.rounds.map((round, rIdx) => {
                  const strategy = round.strategies[pid] ?? '';
                  const color = getStrategyColor(strategy, allStrategies);
                  const isStable = stableFrom[pid] !== null && round.round >= (stableFrom[pid] ?? Infinity);

                  return (
                    <motion.div
                      key={round.round}
                      className="group relative cursor-default"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2, delay: rIdx * 0.01 + pIdx * 0.05 }}
                    >
                      <div
                        className="rounded-full transition-all"
                        style={{
                          width: Math.max(8, Math.floor(500 / result.rounds.length)),
                          height: Math.max(8, Math.floor(500 / result.rounds.length)),
                          minWidth: 6,
                          minHeight: 6,
                          backgroundColor: color,
                          opacity: isStable ? 1 : 0.6,
                          boxShadow: isStable ? `0 0 6px ${color}50` : 'none',
                        }}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-20">
                        <div className="bg-[#0a0a1a] border border-[#25253e] rounded px-2 py-1 text-[9px] text-[#e0e0ff] whitespace-nowrap shadow-lg">
                          R{round.round}: {strategy}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strategy frequency summary bars */}
      {result.rounds.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[#25253e]/50 space-y-1.5">
          <span className="text-[10px] text-[#e0e0ff]/30 font-medium">Strategy Frequency</span>
          {playerIds.map((pid) => {
            const freq = freqMap[pid] || {};
            const total = result.rounds.length;
            return (
              <div key={pid} className="flex items-center gap-2">
                <div className="w-24 shrink-0 text-[10px] text-[#e0e0ff]/40 truncate text-right pr-2">
                  {nameOf(pid)}
                </div>
                <div className="flex-1 h-3 bg-[#0a0a1a] rounded-full overflow-hidden flex">
                  {allStrategies.map((s) => {
                    const pct = total > 0 ? ((freq[s] || 0) / total) * 100 : 0;
                    if (pct === 0) return null;
                    return (
                      <motion.div
                        key={s}
                        className="h-full"
                        style={{ backgroundColor: getStrategyColor(s, allStrategies) }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        title={`${s}: ${pct.toFixed(0)}%`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Final Stats
// ---------------------------------------------------------------------------

function FinalStats({
  result,
  showCelebration,
}: {
  result: SimulationResult;
  showCelebration?: boolean;
}) {
  const playerIds = result.analysis.players.map((p) => p.id);
  const nameOf = (id: string) => result.analysis.players.find((p) => p.id === id)?.name ?? id;
  const emojiOf = (id: string) => result.analysis.players.find((p) => p.id === id)?.emoji ?? '?';
  const colorOf = (id: string) => result.analysis.players.find((p) => p.id === id)?.color ?? '#6c5ce7';

  // Compute per-player stats
  const playerStats = useMemo(() => {
    return playerIds.map((pid) => {
      const totalPayoff = result.rounds[result.rounds.length - 1]?.cumulativePayoffs[pid] ?? 0;

      // Most used strategy
      const freq: Record<string, number> = {};
      for (const round of result.rounds) {
        const s = round.strategies[pid];
        if (s) freq[s] = (freq[s] || 0) + 1;
      }
      const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
      const mostUsed = sorted[0]?.[0] ?? 'N/A';
      const mostUsedPct = sorted[0] ? Math.round((sorted[0][1] / result.rounds.length) * 100) : 0;

      // Win rate: rounds where this player had the highest payoff
      let wins = 0;
      for (const round of result.rounds) {
        const myPayoff = round.payoffs[pid] ?? 0;
        const max = Math.max(...playerIds.map((id) => round.payoffs[id] ?? 0));
        if (myPayoff >= max) wins++;
      }
      const winRate = Math.round((wins / result.rounds.length) * 100);

      return { pid, totalPayoff, mostUsed, mostUsedPct, winRate };
    });
  }, [result, playerIds]);

  // Find overall best
  const bestPlayer = playerStats.reduce((a, b) => (a.totalPayoff > b.totalPayoff ? a : b));

  return (
    <motion.div
      className="rounded-2xl border border-[#25253e] bg-[#1a1a2e]/80 backdrop-blur-sm p-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <h3 className="text-xs font-bold text-[#a29bfe] mb-4 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 15l-2 5l9-13h-8l2-5l-9 13h8z" />
        </svg>
        Final Statistics
      </h3>

      {/* Player cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {playerStats.map((ps, i) => {
          const isBest = ps.pid === bestPlayer.pid;
          return (
            <motion.div
              key={ps.pid}
              className={`rounded-xl p-4 border transition-all ${
                isBest
                  ? 'border-[#00b894]/40 bg-[#00b894]/5'
                  : 'border-[#25253e] bg-[#0a0a1a]/50'
              }`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.08 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                  style={{ backgroundColor: `${colorOf(ps.pid)}20` }}
                >
                  {emojiOf(ps.pid)}
                </div>
                <div>
                  <div className="text-xs font-bold text-[#e0e0ff]">{nameOf(ps.pid)}</div>
                  {isBest && (
                    <span className="text-[9px] text-[#00b894] font-medium">Top Performer</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#e0e0ff]/40">Total Payoff</span>
                  <span className="text-xs font-bold font-mono text-[#e0e0ff]">
                    <AnimatedNumber value={ps.totalPayoff} duration={1200} />
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#e0e0ff]/40">Most Used</span>
                  <span className="text-[10px] font-medium text-[#a29bfe]">
                    {ps.mostUsed} ({ps.mostUsedPct}%)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#e0e0ff]/40">Win Rate</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 bg-[#25253e] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: ps.winRate >= 50 ? '#00b894' : '#ff6b6b',
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${ps.winRate}%` }}
                        transition={{ duration: 0.8, delay: 0.5 + i * 0.1 }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-[#e0e0ff]/60">{ps.winRate}%</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Convergence info */}
      <motion.div
        className={`rounded-xl p-3 border flex items-center gap-3 relative overflow-hidden ${
          result.convergence.converged
            ? 'border-[#00b894]/30 bg-[#00b894]/5'
            : 'border-[#ffd43b]/30 bg-[#ffd43b]/5'
        }`}
        animate={
          showCelebration && result.convergence.converged
            ? {
                borderColor: ['#00b894', '#6c5ce7', '#ffd43b', '#00b894'],
                scale: [1, 1.02, 1],
              }
            : {}
        }
        transition={{ duration: 1 }}
      >
        {showCelebration && result.convergence.converged && <ConvergenceBurst />}
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
            result.convergence.converged
              ? 'bg-[#00b894]/20 text-[#00b894]'
              : 'bg-[#ffd43b]/20 text-[#ffd43b]'
          }`}
        >
          {result.convergence.converged ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" />
            </svg>
          )}
        </div>
        <div className="relative z-10">
          <div className="text-xs font-bold text-[#e0e0ff]">
            {result.convergence.converged
              ? `Converged at round ${result.convergence.equilibriumRound}`
              : 'Did not converge'}
          </div>
          <div className="text-[10px] text-[#e0e0ff]/40">
            {result.convergence.converged
              ? `Final strategies: ${Object.entries(result.convergence.finalStrategies)
                  .map(([pid, s]) => `${nameOf(pid)} -> ${s}`)
                  .join(', ')}`
              : 'Strategies continued to fluctuate throughout the simulation window.'}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Insights Panel
// ---------------------------------------------------------------------------

function InsightsPanel({ insights }: { insights: string[] }) {
  const ICONS = [
    // Rotating through a few icon SVGs
    <svg key="i0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>,
    <svg key="i1" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>,
    <svg key="i2" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
    <svg key="i3" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg>,
    <svg key="i4" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
  ];

  return (
    <motion.div
      className="rounded-2xl border border-[#25253e] bg-[#1a1a2e]/80 backdrop-blur-sm p-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      <h3 className="text-xs font-bold text-[#a29bfe] mb-3 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        Simulation Insights
      </h3>

      <div className="space-y-2">
        {insights.map((insight, i) => (
          <motion.div
            key={i}
            className="flex items-start gap-3 p-2.5 rounded-lg bg-[#0a0a1a]/40 border border-[#25253e]/50"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.06 }}
          >
            <div className="w-6 h-6 rounded-md bg-[#6c5ce7]/10 flex items-center justify-center text-[#a29bfe] shrink-0 mt-0.5">
              {ICONS[i % ICONS.length]}
            </div>
            <p className="text-[11px] text-[#e0e0ff]/70 leading-relaxed">{insight}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main SimulationView
// ---------------------------------------------------------------------------

export default function SimulationView() {
  const {
    analysis,
    setAnalysis,
    simulationConfig,
    setSimulationConfig,
    simulationResult,
    setSimulationResult,
    isSimulating,
    setIsSimulating,
    error,
    setError,
  } = useStore();

  const [showChangeScenario, setShowChangeScenario] = useState(false);

  // Animated playback state
  const [displayedRounds, setDisplayedRounds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Convergence celebration state
  const [showCelebration, setShowCelebration] = useState(false);
  const convergenceShownRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Client-side simulation handler (synchronous, no API call)
  // ---------------------------------------------------------------------------
  const handleRunSimulation = useCallback(() => {
    if (!analysis || isSimulating) return;
    setIsSimulating(true);
    setError(null);

    try {
      const result = runClientSimulation(analysis, simulationConfig);
      setSimulationResult(result);
      // Start animated playback
      setDisplayedRounds(0);
      setIsPlaying(true);
      convergenceShownRef.current = false;
      setShowCelebration(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setIsSimulating(false);
    }
  }, [analysis, simulationConfig, isSimulating, setIsSimulating, setError, setSimulationResult]);

  // ---------------------------------------------------------------------------
  // Animated playback effect
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isPlaying || !simulationResult) return;
    const totalRounds = simulationResult.rounds.length;
    if (displayedRounds >= totalRounds) {
      setIsPlaying(false);
      return;
    }
    const interval = setInterval(() => {
      setDisplayedRounds((prev) => {
        const next = prev + 1;
        if (next >= totalRounds) {
          setIsPlaying(false);
        }
        return Math.min(next, totalRounds);
      });
    }, 200 / playbackSpeed);
    return () => clearInterval(interval);
  }, [isPlaying, displayedRounds, simulationResult, playbackSpeed]);

  // ---------------------------------------------------------------------------
  // Convergence detection during playback
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (
      !simulationResult?.convergence.converged ||
      simulationResult.convergence.equilibriumRound == null ||
      convergenceShownRef.current
    )
      return;

    const eqRound = simulationResult.convergence.equilibriumRound;
    const currentRound = simulationResult.rounds[displayedRounds - 1]?.round ?? 0;

    if (currentRound >= eqRound) {
      convergenceShownRef.current = true;
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [displayedRounds, simulationResult]);

  // ---------------------------------------------------------------------------
  // Sliced result for progressive chart rendering
  // ---------------------------------------------------------------------------
  const displayedResult = useMemo(() => {
    if (!simulationResult) return null;
    return {
      ...simulationResult,
      rounds: simulationResult.rounds.slice(0, displayedRounds),
    };
  }, [simulationResult, displayedRounds]);

  const playbackComplete =
    simulationResult !== null && displayedRounds >= simulationResult.rounds.length;

  const handleChangeScenario = useCallback(() => {
    setAnalysis(null);
    setSimulationResult(null);
    setShowChangeScenario(false);
    setDisplayedRounds(0);
    setIsPlaying(false);
  }, [setAnalysis, setSimulationResult]);

  const handleConfigChange = useCallback(
    (partial: Partial<SimulationConfig>) => {
      setSimulationConfig(partial);
    },
    [setSimulationConfig],
  );

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="p-3 rounded-xl border border-[#ff6b6b30] bg-[#ff6b6b08] flex items-center justify-between"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <span className="text-xs text-[#ff6b6b]">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-[#ff6b6b] hover:text-white text-xs ml-4"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Setup Panel */}
      <SetupPanel
        analysis={analysis}
        config={simulationConfig}
        isSimulating={isSimulating}
        onConfigChange={handleConfigChange}
        onRunSimulation={handleRunSimulation}
        onChangeScenario={handleChangeScenario}
      />

      {/* Playback Controls */}
      {simulationResult && (
        <motion.div
          className="flex items-center justify-between px-4 py-2 rounded-xl border border-[#25253e] bg-[#1a1a2e]/80"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-3">
            {/* Restart button */}
            <button
              onClick={() => {
                setDisplayedRounds(0);
                setIsPlaying(true);
                convergenceShownRef.current = false;
                setShowCelebration(false);
              }}
              className="w-7 h-7 rounded-lg bg-[#25253e] flex items-center justify-center text-[#a29bfe]
                hover:bg-[#6c5ce720] transition-colors"
              title="Restart"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            </button>

            {/* Play / Pause button */}
            <button
              onClick={() => {
                if (displayedRounds >= simulationResult.rounds.length) {
                  // If at the end, restart playback
                  setDisplayedRounds(0);
                  setIsPlaying(true);
                  convergenceShownRef.current = false;
                  setShowCelebration(false);
                } else {
                  setIsPlaying(!isPlaying);
                }
              }}
              className="w-7 h-7 rounded-lg bg-[#6c5ce7] flex items-center justify-center text-white
                hover:bg-[#5b4bd5] transition-colors shadow-[0_0_12px_rgba(108,92,231,0.3)]"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}
            </button>

            {/* Round counter */}
            <span className="text-xs font-mono text-[#a29bfe]">
              Round {displayedRounds}/{simulationResult.rounds.length}
            </span>

            {/* Progress bar */}
            <div className="hidden sm:block w-32 h-1.5 bg-[#25253e] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-[#6c5ce7] rounded-full"
                animate={{
                  width: `${(displayedRounds / simulationResult.rounds.length) * 100}%`,
                }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>

          {/* Speed controls */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#e0e0ff]/30 mr-1">Speed</span>
            {[0.5, 1, 2, 4].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-2 py-1 rounded-md text-[10px] font-mono font-medium transition-all ${
                  playbackSpeed === speed
                    ? 'bg-[#6c5ce7] text-white shadow-[0_0_8px_rgba(108,92,231,0.3)]'
                    : 'bg-[#25253e] text-[#a29bfe] hover:bg-[#6c5ce720]'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Battle Arena (shows during playback) */}
      <AnimatePresence>
        {displayedResult && displayedResult.rounds.length > 0 && !playbackComplete && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <BattleArena
              result={displayedResult}
              currentRoundIdx={displayedResult.rounds.length - 1}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Convergence celebration (during playback) */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            className="relative rounded-2xl border-2 border-[#00b894] bg-[#00b894]/10 p-4 flex items-center justify-center overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            <ConvergenceBurst />
            <div className="text-center relative z-10">
              <div className="text-sm font-bold text-[#00b894]">Convergence Reached!</div>
              <div className="text-[10px] text-[#e0e0ff]/50">
                Equilibrium at round {simulationResult?.convergence.equilibriumRound}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {displayedResult && displayedResult.rounds.length > 0 && (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Timeline Chart (animated with partial rounds) */}
            <TimelineChart result={displayedResult} />

            {/* Strategy Evolution (animated with partial rounds) */}
            <StrategyEvolution result={displayedResult} />

            {/* Two-column for stats and insights -- only when playback is complete */}
            {playbackComplete && (
              <motion.div
                className="grid grid-cols-1 lg:grid-cols-2 gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <FinalStats result={simulationResult!} showCelebration={showCelebration} />
                <InsightsPanel insights={simulationResult!.insights} />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state when no result yet and analysis exists */}
      {!simulationResult && analysis && !isSimulating && (
        <motion.div
          className="text-center py-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="text-3xl mb-3 opacity-20">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="mx-auto text-[#6c5ce7]"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <p className="text-xs text-[#e0e0ff]/30">
            Configure your parameters above and hit <span className="text-[#a29bfe]">Run Simulation</span> to begin
          </p>
        </motion.div>
      )}
    </div>
  );
}
