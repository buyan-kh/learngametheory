'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { GameAnalysis, SimulationConfig, SimulationResult } from '@/lib/types';
import { runClientSimulation } from '@/lib/simulation';

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
// Battle Arena - shows current round matchup during playback
// ---------------------------------------------------------------------------

function BattleArena({
  result,
  currentRound,
}: {
  result: SimulationResult;
  currentRound: number;
}) {
  const players = result.analysis.players;
  const round = result.rounds[currentRound - 1];
  if (!round || players.length < 2) return null;

  const p1 = players[0];
  const p2 = players[1];
  const s1 = round.strategies[p1.id] ?? '?';
  const s2 = round.strategies[p2.id] ?? '?';
  const pay1 = round.payoffs[p1.id] ?? 0;
  const pay2 = round.payoffs[p2.id] ?? 0;
  const cum1 = round.cumulativePayoffs[p1.id] ?? 0;
  const cum2 = round.cumulativePayoffs[p2.id] ?? 0;
  const winner = pay1 > pay2 ? 'left' : pay2 > pay1 ? 'right' : 'tie';

  return (
    <motion.div
      className="rounded-2xl border border-[#25253e] bg-[#1a1a2e]/80 backdrop-blur-sm overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Round banner */}
      <div className="bg-gradient-to-r from-[#6c5ce7]/20 via-[#1a1a2e] to-[#00b894]/20 px-5 py-2 flex items-center justify-center gap-2 border-b border-[#25253e]/60">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a29bfe" strokeWidth="2">
          <path d="M12 15l-2 5l9-13h-8l2-5l-9 13h8z" />
        </svg>
        <span className="text-[11px] font-bold text-[#a29bfe]">
          Round {currentRound}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a29bfe" strokeWidth="2">
          <path d="M12 15l-2 5l9-13h-8l2-5l-9 13h8z" />
        </svg>
      </div>

      <div className="px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Player 1 */}
          <motion.div
            className="flex-1 text-center"
            animate={winner === 'left' ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-2xl mb-2 relative"
              style={{ backgroundColor: `${p1.color}20`, border: `2px solid ${p1.color}40` }}
              animate={winner === 'left' ? { boxShadow: [`0 0 0px ${p1.color}00`, `0 0 20px ${p1.color}60`, `0 0 0px ${p1.color}00`] } : {}}
              transition={{ duration: 0.6 }}
            >
              {p1.emoji}
              {winner === 'left' && (
                <motion.div
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#ffd43b] flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10 }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#1a1a2e" stroke="none">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </motion.div>
              )}
            </motion.div>
            <div className="text-xs font-bold text-[#e0e0ff] mb-0.5">{p1.name}</div>
            <div className="text-[10px] text-[#a29bfe] mb-2 px-2 py-0.5 bg-[#6c5ce7]/10 rounded-md inline-block">
              {s1}
            </div>
            <div className="flex items-center justify-center gap-3 mt-1">
              <div className="text-center">
                <motion.div
                  className="text-lg font-black font-mono"
                  style={{ color: pay1 >= pay2 ? '#00b894' : '#ff6b6b' }}
                  key={`${currentRound}-${pay1}`}
                  initial={{ scale: 1.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {pay1.toFixed(1)}
                </motion.div>
                <div className="text-[8px] text-[#e0e0ff]/30">round</div>
              </div>
              <div className="w-px h-6 bg-[#25253e]" />
              <div className="text-center">
                <div className="text-xs font-bold font-mono text-[#e0e0ff]/60">
                  {cum1.toFixed(1)}
                </div>
                <div className="text-[8px] text-[#e0e0ff]/30">total</div>
              </div>
            </div>
          </motion.div>

          {/* VS divider */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <motion.div
              className="w-10 h-10 rounded-full bg-[#25253e] border border-[#6c5ce7]/30 flex items-center justify-center"
              animate={{
                boxShadow: winner === 'tie'
                  ? ['0 0 0px #ffd43b00', '0 0 15px #ffd43b40', '0 0 0px #ffd43b00']
                  : '0 0 0px transparent',
              }}
              transition={{ duration: 1.5, repeat: winner === 'tie' ? Infinity : 0 }}
            >
              <span className="text-[10px] font-black text-[#a29bfe]">VS</span>
            </motion.div>
            {winner === 'tie' && (
              <span className="text-[8px] text-[#ffd43b] font-medium">DRAW</span>
            )}
          </div>

          {/* Player 2 */}
          <motion.div
            className="flex-1 text-center"
            animate={winner === 'right' ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center text-2xl mb-2 relative"
              style={{ backgroundColor: `${p2.color}20`, border: `2px solid ${p2.color}40` }}
              animate={winner === 'right' ? { boxShadow: [`0 0 0px ${p2.color}00`, `0 0 20px ${p2.color}60`, `0 0 0px ${p2.color}00`] } : {}}
              transition={{ duration: 0.6 }}
            >
              {p2.emoji}
              {winner === 'right' && (
                <motion.div
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#ffd43b] flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10 }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#1a1a2e" stroke="none">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </motion.div>
              )}
            </motion.div>
            <div className="text-xs font-bold text-[#e0e0ff] mb-0.5">{p2.name}</div>
            <div className="text-[10px] text-[#a29bfe] mb-2 px-2 py-0.5 bg-[#6c5ce7]/10 rounded-md inline-block">
              {s2}
            </div>
            <div className="flex items-center justify-center gap-3 mt-1">
              <div className="text-center">
                <motion.div
                  className="text-lg font-black font-mono"
                  style={{ color: pay2 >= pay1 ? '#00b894' : '#ff6b6b' }}
                  key={`${currentRound}-${pay2}`}
                  initial={{ scale: 1.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {pay2.toFixed(1)}
                </motion.div>
                <div className="text-[8px] text-[#e0e0ff]/30">round</div>
              </div>
              <div className="w-px h-6 bg-[#25253e]" />
              <div className="text-center">
                <div className="text-xs font-bold font-mono text-[#e0e0ff]/60">
                  {cum2.toFixed(1)}
                </div>
                <div className="text-[8px] text-[#e0e0ff]/30">total</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Additional players shown as compact row */}
        {players.length > 2 && (
          <div className="mt-3 pt-3 border-t border-[#25253e]/60 flex flex-wrap justify-center gap-3">
            {players.slice(2).map((p) => {
              const strat = round.strategies[p.id] ?? '?';
              const pay = round.payoffs[p.id] ?? 0;
              const cum = round.cumulativePayoffs[p.id] ?? 0;
              return (
                <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0a0a1a]/50 border border-[#25253e]/50">
                  <span className="text-base">{p.emoji}</span>
                  <div>
                    <div className="text-[10px] font-bold text-[#e0e0ff]">{p.name}</div>
                    <div className="text-[9px] text-[#a29bfe]">{strat}</div>
                  </div>
                  <div className="text-right ml-2">
                    <div className="text-[11px] font-bold font-mono text-[#e0e0ff]">{pay.toFixed(1)}</div>
                    <div className="text-[8px] text-[#e0e0ff]/30">{cum.toFixed(1)} total</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// SVG Line Chart - smooth payoff timeline
// ---------------------------------------------------------------------------

function PayoffLineChart({
  result,
}: {
  result: SimulationResult;
}) {
  const playerIds = result.analysis.players.map((p) => p.id);
  const nameOf = (id: string) => result.analysis.players.find((p) => p.id === id)?.name ?? id;

  const W = 700;
  const H = 180;
  const PAD = { top: 10, right: 16, bottom: 24, left: 40 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const { maxPayoff, minPayoff } = useMemo(() => {
    let max = 0;
    let min = Infinity;
    for (const round of result.rounds) {
      for (const pid of playerIds) {
        const v = round.payoffs[pid] ?? 0;
        if (v > max) max = v;
        if (v < min) min = v;
      }
    }
    return { maxPayoff: Math.max(max, 1), minPayoff: Math.min(min, 0) };
  }, [result.rounds, playerIds]);

  const range = maxPayoff - minPayoff || 1;

  const toX = useCallback((idx: number) => PAD.left + (idx / Math.max(result.rounds.length - 1, 1)) * chartW, [result.rounds.length, chartW]);
  const toY = useCallback((val: number) => PAD.top + chartH - ((val - minPayoff) / range) * chartH, [chartH, minPayoff, range]);

  // Build polyline points for each player
  const lines = useMemo(() => {
    return playerIds.map((pid, pIdx) => {
      const points = result.rounds.map((r, i) => `${toX(i)},${toY(r.payoffs[pid] ?? 0)}`).join(' ');
      const areaPoints =
        result.rounds.map((r, i) => `${toX(i)},${toY(r.payoffs[pid] ?? 0)}`).join(' ') +
        ` ${toX(result.rounds.length - 1)},${PAD.top + chartH} ${toX(0)},${PAD.top + chartH}`;
      return {
        pid,
        points,
        areaPoints,
        color: PLAYER_LINE_COLORS[pIdx % PLAYER_LINE_COLORS.length],
      };
    });
  }, [result.rounds, playerIds, toX, toY, chartH]);

  // Convergence line
  const convergenceX = result.convergence.converged && result.convergence.equilibriumRound
    ? toX(result.convergence.equilibriumRound - 1)
    : null;

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = range / 4;
    for (let i = 0; i <= 4; i++) {
      ticks.push(minPayoff + step * i);
    }
    return ticks;
  }, [minPayoff, range]);

  return (
    <motion.div
      className="rounded-2xl border border-[#25253e] bg-[#1a1a2e]/80 backdrop-blur-sm p-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <h3 className="text-xs font-bold text-[#a29bfe] mb-3 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
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

      {/* SVG Chart */}
      <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[500px]" preserveAspectRatio="xMidYMid meet">
          {/* Grid lines */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={PAD.left}
                y1={toY(tick)}
                x2={W - PAD.right}
                y2={toY(tick)}
                stroke="#25253e"
                strokeWidth="0.5"
              />
              <text
                x={PAD.left - 4}
                y={toY(tick) + 3}
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
          {result.rounds
            .filter((r) => r.round === 1 || r.round % Math.max(1, Math.ceil(result.rounds.length / 10)) === 0 || r.round === result.rounds.length)
            .map((r) => (
              <text
                key={r.round}
                x={toX(r.round - 1)}
                y={H - 4}
                textAnchor="middle"
                fill="#e0e0ff30"
                fontSize="8"
                fontFamily="monospace"
              >
                {r.round}
              </text>
            ))}

          {/* Area fills */}
          {lines.map((line) => (
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

          {/* Convergence line */}
          {convergenceX !== null && (
            <g>
              <line
                x1={convergenceX}
                y1={PAD.top}
                x2={convergenceX}
                y2={PAD.top + chartH}
                stroke="#ffd43b"
                strokeWidth="1"
                strokeDasharray="4,3"
                opacity={0.5}
              />
              <text
                x={convergenceX + 4}
                y={PAD.top + 10}
                fill="#ffd43b"
                fontSize="7"
                opacity={0.6}
              >
                eq
              </text>
            </g>
          )}

          {/* Lines */}
          {lines.map((line) => (
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

          {/* End dots */}
          {result.rounds.length > 0 && lines.map((line) => {
            const lastRound = result.rounds[result.rounds.length - 1];
            const val = lastRound.payoffs[line.pid] ?? 0;
            return (
              <motion.circle
                key={`dot-${line.pid}`}
                cx={toX(result.rounds.length - 1)}
                cy={toY(val)}
                r="3.5"
                fill={line.color}
                stroke="#1a1a2e"
                strokeWidth="1.5"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1, type: 'spring' }}
              />
            );
          })}
        </svg>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Cumulative Score Race - animated bar race chart
// ---------------------------------------------------------------------------

function CumulativeScoreRace({
  result,
  currentRound,
}: {
  result: SimulationResult;
  currentRound: number;
}) {
  const players = result.analysis.players;
  const round = result.rounds[Math.min(currentRound - 1, result.rounds.length - 1)];
  if (!round) return null;

  const scores = players.map((p, i) => ({
    ...p,
    score: round.cumulativePayoffs[p.id] ?? 0,
    color: PLAYER_LINE_COLORS[i % PLAYER_LINE_COLORS.length],
  }));

  const maxScore = Math.max(...scores.map((s) => s.score), 1);
  const sorted = [...scores].sort((a, b) => b.score - a.score);

  return (
    <motion.div
      className="rounded-2xl border border-[#25253e] bg-[#1a1a2e]/80 backdrop-blur-sm p-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      <h3 className="text-xs font-bold text-[#a29bfe] mb-3 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
        Score Race
      </h3>

      <div className="space-y-2">
        {sorted.map((player, rank) => {
          const pct = (player.score / maxScore) * 100;
          return (
            <motion.div
              key={player.id}
              className="flex items-center gap-3"
              layout
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {/* Rank badge */}
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black shrink-0"
                style={{
                  backgroundColor: rank === 0 ? '#ffd43b20' : '#25253e',
                  color: rank === 0 ? '#ffd43b' : '#e0e0ff40',
                  border: rank === 0 ? '1px solid #ffd43b30' : '1px solid transparent',
                }}
              >
                {rank + 1}
              </div>

              {/* Player info */}
              <div className="flex items-center gap-1.5 w-20 shrink-0">
                <span className="text-sm">{player.emoji}</span>
                <span className="text-[10px] text-[#e0e0ff]/60 truncate">{player.name}</span>
              </div>

              {/* Bar */}
              <div className="flex-1 h-5 bg-[#0a0a1a]/60 rounded-md overflow-hidden relative">
                <motion.div
                  className="h-full rounded-md relative"
                  style={{ backgroundColor: player.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(pct, 2)}%` }}
                  transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                >
                  {rank === 0 && (
                    <div
                      className="absolute inset-0 rounded-md"
                      style={{
                        background: `linear-gradient(90deg, transparent, ${player.color}40)`,
                      }}
                    />
                  )}
                </motion.div>
              </div>

              {/* Score */}
              <motion.span
                className="text-xs font-bold font-mono text-[#e0e0ff] w-14 text-right shrink-0"
                key={`${currentRound}-${player.id}`}
              >
                {player.score.toFixed(1)}
              </motion.span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Strategy Evolution (enhanced with frequency stacked bars)
// ---------------------------------------------------------------------------

function StrategyEvolution({
  result,
}: {
  result: SimulationResult;
}) {
  const playerIds = result.analysis.players.map((p) => p.id);
  const nameOf = (id: string) => result.analysis.players.find((p) => p.id === id)?.name ?? id;

  const allStrategies = useMemo(() => {
    const set = new Set<string>();
    for (const round of result.rounds) {
      for (const pid of playerIds) {
        if (round.strategies[pid]) set.add(round.strategies[pid]);
      }
    }
    return Array.from(set);
  }, [result.rounds, playerIds]);

  // Strategy frequency per round (rolling window of 5)
  const frequencyData = useMemo(() => {
    const window = 5;
    return result.rounds.map((_, rIdx) => {
      const start = Math.max(0, rIdx - window + 1);
      const windowRounds = result.rounds.slice(start, rIdx + 1);
      const counts: Record<string, number> = {};
      let total = 0;
      for (const r of windowRounds) {
        for (const pid of playerIds) {
          const s = r.strategies[pid];
          if (s) {
            counts[s] = (counts[s] || 0) + 1;
            total++;
          }
        }
      }
      const pcts: Record<string, number> = {};
      for (const s of allStrategies) {
        pcts[s] = total > 0 ? ((counts[s] || 0) / total) * 100 : 0;
      }
      return pcts;
    });
  }, [result.rounds, playerIds, allStrategies]);

  const BAR_W = Math.max(4, Math.min(12, Math.floor(600 / result.rounds.length)));

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [result]);

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

      {/* Per-player strategy timeline */}
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
                  const prevStrategy = rIdx > 0 ? result.rounds[rIdx - 1].strategies[pid] : strategy;
                  const changed = strategy !== prevStrategy;

                  return (
                    <motion.div
                      key={round.round}
                      className="group relative cursor-default"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2, delay: rIdx * 0.01 + pIdx * 0.05 }}
                    >
                      <div
                        className="rounded-sm transition-all"
                        style={{
                          width: BAR_W,
                          height: 14,
                          backgroundColor: color,
                          opacity: 0.8,
                          border: changed ? '1px solid #fff4' : '1px solid transparent',
                          boxShadow: changed ? `0 0 6px ${color}80` : 'none',
                        }}
                      />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-20">
                        <div className="bg-[#0a0a1a] border border-[#25253e] rounded px-2 py-1 text-[9px] text-[#e0e0ff] whitespace-nowrap shadow-lg">
                          R{round.round}: {strategy}
                          {changed && <span className="text-[#ffd43b] ml-1">(changed!)</span>}
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

      {/* Stacked frequency bars */}
      {allStrategies.length > 1 && (
        <div className="mt-4 pt-3 border-t border-[#25253e]/60">
          <div className="text-[10px] text-[#e0e0ff]/30 mb-2">Strategy Distribution Over Time</div>
          <div className="overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
            <div className="flex items-end gap-[1px] min-w-max" style={{ height: 40 }}>
              {frequencyData.map((data, rIdx) => (
                <div key={rIdx} className="relative group" style={{ width: BAR_W }}>
                  <div className="flex flex-col-reverse" style={{ height: 40 }}>
                    {allStrategies.map((s) => {
                      const pct = data[s] || 0;
                      const h = (pct / 100) * 40;
                      const color = getStrategyColor(s, allStrategies);
                      return (
                        <div
                          key={s}
                          style={{
                            height: h,
                            backgroundColor: color,
                            opacity: 0.7,
                          }}
                        />
                      );
                    })}
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-20">
                    <div className="bg-[#0a0a1a] border border-[#25253e] rounded px-2 py-1 text-[9px] text-[#e0e0ff] whitespace-nowrap shadow-lg">
                      R{rIdx + 1}: {allStrategies.map((s) => `${s} ${Math.round(data[s] || 0)}%`).join(', ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Final Stats (enhanced with radial win-rate gauges)
// ---------------------------------------------------------------------------

function FinalStats({
  result,
}: {
  result: SimulationResult;
}) {
  const playerIds = result.analysis.players.map((p) => p.id);
  const nameOf = (id: string) => result.analysis.players.find((p) => p.id === id)?.name ?? id;
  const emojiOf = (id: string) => result.analysis.players.find((p) => p.id === id)?.emoji ?? '?';
  const colorOf = (id: string) => result.analysis.players.find((p) => p.id === id)?.color ?? '#6c5ce7';

  const playerStats = useMemo(() => {
    return playerIds.map((pid) => {
      const totalPayoff = result.rounds[result.rounds.length - 1]?.cumulativePayoffs[pid] ?? 0;

      const freq: Record<string, number> = {};
      for (const round of result.rounds) {
        const s = round.strategies[pid];
        if (s) freq[s] = (freq[s] || 0) + 1;
      }
      const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
      const mostUsed = sorted[0]?.[0] ?? 'N/A';
      const mostUsedPct = sorted[0] ? Math.round((sorted[0][1] / result.rounds.length) * 100) : 0;

      let wins = 0;
      for (const round of result.rounds) {
        const myPayoff = round.payoffs[pid] ?? 0;
        const max = Math.max(...playerIds.map((id) => round.payoffs[id] ?? 0));
        if (myPayoff >= max) wins++;
      }
      const winRate = Math.round((wins / result.rounds.length) * 100);
      const avgPayoff = totalPayoff / result.rounds.length;
      const uniqueStrategies = Object.keys(freq).length;

      return { pid, totalPayoff, mostUsed, mostUsedPct, winRate, avgPayoff, uniqueStrategies };
    });
  }, [result, playerIds]);

  const bestPlayer = playerStats.reduce((a, b) => (a.totalPayoff > b.totalPayoff ? a : b));

  const RadialGauge = ({ value, color, size = 40 }: { value: number; color: string; size?: number }) => {
    const r = (size - 6) / 2;
    const circumference = 2 * Math.PI * r;
    const offset = circumference - (value / 100) * circumference;
    return (
      <svg width={size} height={size} className="block">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#25253e" strokeWidth="3" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, delay: 0.3 }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x={size / 2} y={size / 2 + 3} textAnchor="middle" fill="#e0e0ff" fontSize="9" fontWeight="bold" fontFamily="monospace">
          {value}%
        </text>
      </svg>
    );
  };

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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {playerStats.map((ps, i) => {
          const isBest = ps.pid === bestPlayer.pid;
          const pColor = colorOf(ps.pid);
          return (
            <motion.div
              key={ps.pid}
              className={`rounded-xl p-4 border transition-all ${isBest
                ? 'border-[#00b894]/40 bg-[#00b894]/5'
                : 'border-[#25253e] bg-[#0a0a1a]/50'
                }`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.08 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-base"
                    style={{ backgroundColor: `${pColor}20` }}
                  >
                    {emojiOf(ps.pid)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#e0e0ff]">{nameOf(ps.pid)}</div>
                    {isBest && (
                      <span className="text-[9px] text-[#00b894] font-medium flex items-center gap-0.5">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="#ffd43b" stroke="none">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        Top Performer
                      </span>
                    )}
                  </div>
                </div>
                <RadialGauge value={ps.winRate} color={ps.winRate >= 50 ? '#00b894' : '#ff6b6b'} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#e0e0ff]/40">Total Payoff</span>
                  <span className="text-sm font-black font-mono" style={{ color: pColor }}>
                    {ps.totalPayoff.toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#e0e0ff]/40">Avg / Round</span>
                  <span className="text-[10px] font-bold font-mono text-[#e0e0ff]/70">
                    {ps.avgPayoff.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#e0e0ff]/40">Favorite Strategy</span>
                  <span className="text-[10px] font-medium text-[#a29bfe]">
                    {ps.mostUsed} ({ps.mostUsedPct}%)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#e0e0ff]/40">Strategies Used</span>
                  <span className="text-[10px] font-mono text-[#e0e0ff]/60">
                    {ps.uniqueStrategies}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Convergence info */}
      <div
        className={`rounded-xl p-3 border flex items-center gap-3 ${result.convergence.converged
          ? 'border-[#00b894]/30 bg-[#00b894]/5'
          : 'border-[#ffd43b]/30 bg-[#ffd43b]/5'
          }`}
      >
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${result.convergence.converged
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
        <div>
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
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Convergence Celebration
// ---------------------------------------------------------------------------

function ConvergenceBurst() {
  const particles = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      id: i,
      angle: (i / 24) * 360,
      distance: 40 + Math.random() * 60,
      size: 3 + Math.random() * 4,
      color: STRATEGY_COLORS[i % STRATEGY_COLORS.length],
      delay: Math.random() * 0.3,
    }));
  }, []);

  return (
    <motion.div
      className="rounded-2xl border border-[#00b894]/30 bg-[#00b894]/5 backdrop-blur-sm p-6 relative overflow-hidden"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 12 }}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{ width: p.size, height: p.size, backgroundColor: p.color }}
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{
              x: Math.cos((p.angle * Math.PI) / 180) * p.distance,
              y: Math.sin((p.angle * Math.PI) / 180) * p.distance,
              opacity: 0,
            }}
            transition={{ duration: 1.2, delay: p.delay, ease: 'easeOut' }}
          />
        ))}
      </div>

      <div className="relative text-center">
        <motion.div
          className="text-2xl mb-2"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00b894" strokeWidth="2" className="mx-auto">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </motion.div>
        <div className="text-sm font-bold text-[#00b894]">Equilibrium Reached!</div>
        <div className="text-[10px] text-[#e0e0ff]/40 mt-1">
          The players have converged on stable strategies
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Insights Panel
// ---------------------------------------------------------------------------

function InsightsPanel({ insights }: { insights: string[] }) {
  const ICONS = [
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

  const handleRunSimulation = useCallback(() => {
    if (!analysis || isSimulating) return;
    setIsSimulating(true);
    setError(null);

    try {
      const result = runClientSimulation(analysis, simulationConfig);
      setSimulationResult(result);
      setDisplayedRounds(0);
      setIsPlaying(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setIsSimulating(false);
    }
  }, [analysis, simulationConfig, isSimulating, setIsSimulating, setError, setSimulationResult]);

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
            <button
              onClick={() => {
                setDisplayedRounds(0);
                setIsPlaying(true);
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

            <button
              onClick={() => {
                if (displayedRounds >= simulationResult.rounds.length) {
                  setDisplayedRounds(0);
                  setIsPlaying(true);
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

            <span className="text-xs font-mono text-[#a29bfe]">
              Round {displayedRounds}/{simulationResult.rounds.length}
            </span>

            <div className="hidden sm:block w-32 h-1.5 bg-[#25253e] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] rounded-full"
                animate={{
                  width: `${(displayedRounds / simulationResult.rounds.length) * 100}%`,
                }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-[#e0e0ff]/30 mr-1">Speed</span>
            {[0.5, 1, 2, 4].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-2 py-1 rounded-md text-[10px] font-mono font-medium transition-all ${playbackSpeed === speed
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

      {/* Results */}
      <AnimatePresence>
        {displayedResult && displayedResult.rounds.length > 0 && (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Battle Arena */}
            <BattleArena
              result={simulationResult!}
              currentRound={displayedRounds}
            />

            {/* Two-column: Line chart + Score race */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PayoffLineChart result={displayedResult} />
              <CumulativeScoreRace
                result={simulationResult!}
                currentRound={displayedRounds}
              />
            </div>

            {/* Strategy Evolution */}
            <StrategyEvolution result={displayedResult} />

            {/* Convergence celebration */}
            {playbackComplete && simulationResult!.convergence.converged && (
              <ConvergenceBurst />
            )}

            {/* Stats and insights */}
            {playbackComplete && (
              <motion.div
                className="grid grid-cols-1 lg:grid-cols-2 gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <FinalStats result={simulationResult!} />
                <InsightsPanel insights={simulationResult!.insights} />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
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
