'use client';

import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { Outcome } from '@/lib/types';

const OUTCOME_ICONS: Record<string, string> = {
  best: '🏆',
  worst: '💀',
  nash: '⚖️',
  pareto: '🎯',
  likely: '📊',
};

const OUTCOME_COLORS: Record<string, string> = {
  best: '#51cf66',
  worst: '#ff6b6b',
  nash: '#ffd43b',
  pareto: '#74c0fc',
  likely: '#a29bfe',
};

function OutcomeCard({ outcome, index }: { outcome: Outcome; index: number }) {
  const { analysis, selectedOutcome, setSelectedOutcome } = useStore();
  const isSelected = selectedOutcome === outcome.id;
  const color = OUTCOME_COLORS[outcome.type] || '#a29bfe';

  return (
    <motion.div
      className={`relative p-4 rounded-xl border cursor-pointer transition-all ${
        isSelected
          ? 'border-opacity-100'
          : 'border-opacity-30 hover:border-opacity-60'
      }`}
      style={{
        borderColor: color,
        backgroundColor: isSelected ? color + '10' : 'transparent',
      }}
      onClick={() => setSelectedOutcome(isSelected ? null : outcome.id)}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.02 }}
    >
      {/* Type badge */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{OUTCOME_ICONS[outcome.type]}</span>
          <div>
            <span
              className="text-[10px] uppercase tracking-wider font-bold"
              style={{ color }}
            >
              {outcome.type} outcome
            </span>
            <h4 className="text-sm font-bold">{outcome.label}</h4>
          </div>
        </div>
        {/* Likelihood gauge */}
        <div className="text-right">
          <div className="text-lg font-bold" style={{ color }}>
            {Math.round(outcome.likelihood * 100)}%
          </div>
          <div className="text-[10px] opacity-50">likelihood</div>
        </div>
      </div>

      <p className="text-xs opacity-70 mb-3">{outcome.description}</p>

      {/* Payoff bars */}
      {isSelected && analysis && (
        <motion.div
          className="space-y-2 mt-2 pt-2 border-t border-[#25253e]"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
        >
          <span className="text-[10px] uppercase tracking-wider opacity-50">
            Payoffs
          </span>
          {analysis.players.map((player) => (
            <div key={player.id} className="flex items-center gap-2">
              <span className="text-xs w-20 truncate" style={{ color: player.color }}>
                {player.emoji} {player.name}
              </span>
              <div className="flex-1 h-3 bg-[#25253e] rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: player.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(outcome.payoffs[player.id] ?? 0) * 10}%` }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                />
              </div>
              <span className="text-xs font-bold w-6 text-right">
                {outcome.payoffs[player.id] ?? 0}
              </span>
            </div>
          ))}
        </motion.div>
      )}

      {/* Likelihood bar at bottom */}
      <div className="mt-3 h-1 bg-[#25253e] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${outcome.likelihood * 100}%` }}
          transition={{ duration: 0.8, delay: index * 0.1 }}
        />
      </div>
    </motion.div>
  );
}

export default function OutcomePanel() {
  const { analysis } = useStore();
  if (!analysis) return null;

  // Sort: likely first, then by likelihood
  const sorted = [...analysis.outcomes].sort((a, b) => {
    const typeOrder = { likely: 0, nash: 1, best: 2, pareto: 3, worst: 4 };
    return (typeOrder[a.type] ?? 5) - (typeOrder[b.type] ?? 5) || b.likelihood - a.likelihood;
  });

  return (
    <div className="space-y-3">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-[#a29bfe]">Possible Outcomes</h3>
        <p className="text-[10px] opacity-50 mt-1">
          Click an outcome to see detailed payoffs for each player
        </p>
      </div>
      {sorted.map((outcome, i) => (
        <OutcomeCard key={outcome.id} outcome={outcome} index={i} />
      ))}
    </div>
  );
}
