'use client';

import { ReactNode, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { Outcome } from '@/lib/types';
import { TrophyIcon, SkullIcon, ScalesIcon, TargetIcon, ChartIcon } from '@/components/icons';

const OUTCOME_ICONS: Record<string, ReactNode> = {
  best: <TrophyIcon />,
  worst: <SkullIcon />,
  nash: <ScalesIcon />,
  pareto: <TargetIcon />,
  likely: <ChartIcon />,
};

const OUTCOME_COLORS: Record<string, string> = {
  best: '#51cf66',
  worst: '#ff6b6b',
  nash: '#ffd43b',
  pareto: '#74c0fc',
  likely: '#a29bfe',
};

const OUTCOME_LABELS: Record<string, string> = {
  best: 'Best',
  worst: 'Worst',
  nash: 'Nash',
  pareto: 'Pareto',
  likely: 'Likely',
};

const REQUIRED_TYPES = ['best', 'worst', 'nash', 'likely'] as const;

// ── Normalize likelihoods so they sum to 1.0 ──
function normalizeLikelihoods(outcomes: Outcome[]): Outcome[] {
  if (outcomes.length === 0) return outcomes;
  const sum = outcomes.reduce((s, o) => s + (Number.isFinite(o.likelihood) ? o.likelihood : 0), 0);
  if (sum === 0) {
    // All zero or invalid: distribute equally
    const equal = 1 / outcomes.length;
    return outcomes.map((o) => ({ ...o, likelihood: equal }));
  }
  if (Math.abs(sum - 1) < 0.05) return outcomes; // close enough
  return outcomes.map((o) => ({
    ...o,
    likelihood: Number.isFinite(o.likelihood) ? o.likelihood / sum : 0,
  }));
}

// ── Circular Likelihood Gauge ──
function LikelihoodGauge({ value, color }: { value: number; color: string }) {
  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const strokeDashoffset = circumference * (1 - clampedValue);

  return (
    <div className="relative w-8 h-8 flex-shrink-0">
      <svg viewBox="0 0 32 32" className="w-full h-full -rotate-90">
        <circle cx="16" cy="16" r={radius} fill="none" stroke="#25253e" strokeWidth="3" />
        <motion.circle
          cx="16" cy="16" r={radius} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, delay: 0.2 }}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[8px] font-bold"
        style={{ color }}
      >
        {Math.round(clampedValue * 100)}
      </span>
    </div>
  );
}

// ── Nash Equilibrium Star Badge ──
function NashBadge() {
  return (
    <motion.div
      className="absolute -top-2 -right-2 w-6 h-6"
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.3 }}
    >
      <svg viewBox="0 0 24 24" className="w-full h-full">
        <motion.path
          d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4l-6.4 4.8 2.4-7.2-6-4.8h7.6z"
          fill="#ffd43b"
          stroke="#ffd43b"
          strokeWidth="0.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        />
        <text x="12" y="13.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#0d0d1a">N</text>
      </svg>
    </motion.div>
  );
}

// ── Payoff Radar Chart ──
function PayoffRadar({
  outcome,
  players,
}: {
  outcome: Outcome;
  players: { id: string; name: string; emoji: string; color: string }[];
}) {
  if (players.length < 2) return null;

  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 42;
  const n = players.length;

  // Get angles for each axis
  const angles = players.map((_, i) => (2 * Math.PI * i) / n - Math.PI / 2);

  // Grid rings at 25%, 50%, 75%, 100%
  const rings = [0.25, 0.5, 0.75, 1.0];

  // Compute data points (payoff / 10 normalized)
  const dataPoints = players.map((p, i) => {
    const raw = outcome.payoffs[p.id] ?? 0;
    const normalized = Math.max(0, Math.min(1, raw / 10));
    const r = normalized * maxR;
    return {
      x: cx + r * Math.cos(angles[i]),
      y: cy + r * Math.sin(angles[i]),
      color: p.color,
      label: p.emoji,
      value: raw,
    };
  });

  const shapePath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + 'Z';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex justify-center mt-2"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid rings */}
        {rings.map((pct) => (
          <polygon
            key={pct}
            points={angles.map((a) => `${cx + maxR * pct * Math.cos(a)},${cy + maxR * pct * Math.sin(a)}`).join(' ')}
            fill="none"
            stroke="#25253e"
            strokeWidth="0.8"
          />
        ))}
        {/* Axis lines */}
        {angles.map((a, i) => (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={cx + maxR * Math.cos(a)} y2={cy + maxR * Math.sin(a)}
            stroke="#25253e"
            strokeWidth="0.6"
          />
        ))}
        {/* Data shape */}
        <motion.path
          d={shapePath}
          fill={OUTCOME_COLORS[outcome.type] || '#a29bfe'}
          fillOpacity={0.2}
          stroke={OUTCOME_COLORS[outcome.type] || '#a29bfe'}
          strokeWidth="1.5"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
        {/* Data points & labels */}
        {dataPoints.map((p, i) => (
          <g key={i}>
            <motion.circle
              cx={p.x} cy={p.y} r="3"
              fill={p.color}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4 + i * 0.1 }}
            />
            <text
              x={cx + (maxR + 14) * Math.cos(angles[i])}
              y={cy + (maxR + 14) * Math.sin(angles[i])}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="10"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    </motion.div>
  );
}

// ── Outcome Summary Bar ──
function OutcomeSummaryBar({ outcomes }: { outcomes: Outcome[] }) {
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of outcomes) {
      counts[o.type] = (counts[o.type] || 0) + 1;
    }
    return counts;
  }, [outcomes]);

  const total = outcomes.length;
  if (total === 0) return null;

  const types = Object.keys(typeCounts);

  return (
    <div className="mb-4">
      {/* Segmented bar */}
      <div className="flex h-2 rounded-full overflow-hidden bg-[#25253e]">
        {types.map((type) => (
          <motion.div
            key={type}
            className="h-full"
            style={{ backgroundColor: OUTCOME_COLORS[type] || '#a29bfe' }}
            initial={{ width: 0 }}
            animate={{ width: `${(typeCounts[type] / total) * 100}%` }}
            transition={{ duration: 0.6, delay: 0.1 }}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2">
        {types.map((type) => (
          <div key={type} className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: OUTCOME_COLORS[type] || '#a29bfe' }}
            />
            <span className="text-[10px] opacity-60">
              {OUTCOME_LABELS[type] || type} ({typeCounts[type]})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Missing Type Warning ──
function MissingTypesWarning({ outcomes }: { outcomes: Outcome[] }) {
  const presentTypes = new Set(outcomes.map((o) => o.type));
  const missing = REQUIRED_TYPES.filter((t) => !presentTypes.has(t));
  if (missing.length === 0) return null;

  return (
    <motion.div
      className="mb-3 p-2 rounded-lg border border-[#ffd43b30] bg-[#ffd43b08] text-[10px] text-[#ffd43b] opacity-80"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 0.8, y: 0 }}
    >
      Missing outcome types: {missing.map((t) => OUTCOME_LABELS[t] || t).join(', ')}
    </motion.div>
  );
}

// ── Empty State ──
function EmptyOutcomes() {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-10 opacity-40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.4 }}
    >
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mb-3 opacity-50">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
        <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="text-xs">No outcomes to display</span>
    </motion.div>
  );
}

// ── Outcome Card ──
function OutcomeCard({
  outcome,
  index,
  isMostLikely,
  total,
}: {
  outcome: Outcome;
  index: number;
  isMostLikely: boolean;
  total: number;
}) {
  const { analysis, selectedOutcome, setSelectedOutcome } = useStore();
  const isSelected = selectedOutcome === outcome.id;
  const color = OUTCOME_COLORS[outcome.type] || '#a29bfe';
  const isNash = outcome.type === 'nash';

  // Alternate slide direction: even from left, odd from right
  const slideX = index % 2 === 0 ? -30 : 30;

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, x: slideX }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 200, damping: 20 }}
    >
      {/* Nash dotted connector line */}
      {isNash && index > 0 && (
        <motion.div
          className="absolute -top-3 left-6 w-px h-3 border-l border-dashed"
          style={{ borderColor: '#ffd43b60' }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: index * 0.08 + 0.3 }}
        />
      )}

      <motion.div
        className={`relative p-4 rounded-xl border cursor-pointer transition-colors ${
          isSelected ? 'border-opacity-100' : 'border-opacity-30 hover:border-opacity-60'
        }`}
        style={{
          borderColor: color,
          backgroundColor: isSelected ? color + '10' : 'transparent',
          boxShadow: isMostLikely ? `0 0 16px ${color}20` : undefined,
        }}
        onClick={() => setSelectedOutcome(isSelected ? null : outcome.id)}
        whileHover={{ scale: 1.02 }}
        layout
      >
        {/* Pulse glow on most likely */}
        {isMostLikely && (
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{ border: `1px solid ${color}` }}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Nash star badge */}
        {isNash && <NashBadge />}

        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg flex-shrink-0">{OUTCOME_ICONS[outcome.type]}</span>
            <div className="min-w-0">
              <span
                className="text-[10px] uppercase tracking-wider font-bold"
                style={{ color }}
              >
                {outcome.type} outcome
              </span>
              <h4 className="text-sm font-bold truncate">{outcome.label}</h4>
            </div>
          </div>
          {/* Circular gauge replaces plain percentage */}
          <div className="flex flex-col items-center flex-shrink-0">
            <LikelihoodGauge value={outcome.likelihood} color={color} />
            <div className="text-[9px] opacity-40 mt-0.5">likely</div>
          </div>
        </div>

        <p className="text-xs opacity-70 mb-3">{outcome.description}</p>

        {/* Expanded: Payoff bars + Radar chart */}
        <AnimatePresence>
          {isSelected && analysis && (
            <motion.div
              className="mt-2 pt-2 border-t border-[#25253e]"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Radar chart */}
              {analysis.players.length >= 2 && (
                <PayoffRadar outcome={outcome} players={analysis.players} />
              )}

              {/* Payoff bars */}
              <div className="space-y-2 mt-3">
                <span className="text-[10px] uppercase tracking-wider opacity-50">
                  Payoffs
                </span>
                {analysis.players.map((player) => {
                  const payoff = outcome.payoffs[player.id] ?? 0;
                  const safePayoff = Number.isFinite(payoff) ? payoff : 0;
                  return (
                    <div key={player.id} className="flex items-center gap-2">
                      <span className="text-xs w-20 truncate" style={{ color: player.color }}>
                        {player.emoji} {player.name}
                      </span>
                      <div className="flex-1 h-3 bg-[#25253e] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: player.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(0, Math.min(100, safePayoff * 10))}%` }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                        />
                      </div>
                      <span className="text-xs font-bold w-6 text-right">
                        {safePayoff}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Likelihood bar at bottom */}
        <div className="mt-3 h-1 bg-[#25253e] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(0, Math.min(100, outcome.likelihood * 100))}%` }}
            transition={{ duration: 0.8, delay: index * 0.08 }}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Component ──
export default function OutcomePanel() {
  const { analysis } = useStore();
  if (!analysis) return null;

  // Normalize likelihoods
  const normalized = normalizeLikelihoods(analysis.outcomes);

  // Sort: likely first, then by likelihood (safe against NaN)
  const sorted = [...normalized].sort((a, b) => {
    const typeOrder: Record<string, number> = { likely: 0, nash: 1, best: 2, pareto: 3, worst: 4 };
    const orderDiff = (typeOrder[a.type] ?? 5) - (typeOrder[b.type] ?? 5);
    if (orderDiff !== 0) return orderDiff;
    const aL = Number.isFinite(a.likelihood) ? a.likelihood : 0;
    const bL = Number.isFinite(b.likelihood) ? b.likelihood : 0;
    return bL - aL;
  });

  // Find most likely outcome
  const mostLikelyId = sorted.length > 0
    ? sorted.reduce((best, o) => {
        const oL = Number.isFinite(o.likelihood) ? o.likelihood : 0;
        const bL = Number.isFinite(best.likelihood) ? best.likelihood : 0;
        return oL > bL ? o : best;
      }).id
    : null;

  return (
    <div className="space-y-3">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-[#a29bfe]">Possible Outcomes</h3>
        <p className="text-[10px] opacity-50 mt-1">
          Click an outcome to see detailed payoffs for each player
        </p>
      </div>

      {sorted.length === 0 ? (
        <EmptyOutcomes />
      ) : (
        <>
          <MissingTypesWarning outcomes={sorted} />
          <OutcomeSummaryBar outcomes={sorted} />
          {sorted.map((outcome, i) => (
            <OutcomeCard
              key={outcome.id}
              outcome={outcome}
              index={i}
              isMostLikely={outcome.id === mostLikelyId}
              total={sorted.length}
            />
          ))}
        </>
      )}
    </div>
  );
}
