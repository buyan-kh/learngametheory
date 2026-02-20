'use client';

import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import { Strategy } from '@/lib/types';

const RISK_CONFIG = {
  low: { color: '#51cf66', label: 'Low Risk', icon: '🛡️' },
  medium: { color: '#ffd43b', label: 'Med Risk', icon: '⚡' },
  high: { color: '#ff6b6b', label: 'High Risk', icon: '🔥' },
};

function StrategyCard({ strategy, index }: { strategy: Strategy; index: number }) {
  const { analysis } = useStore();
  const player = analysis?.players.find((p) => p.id === strategy.playerId);
  if (!player) return null;

  const risk = RISK_CONFIG[strategy.risk];

  return (
    <motion.div
      className="p-4 rounded-xl border border-[#25253e] bg-[#1a1a2e]/50 hover:bg-[#1a1a2e] transition-colors"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
            style={{ backgroundColor: player.color + '30', color: player.color }}
          >
            {player.emoji}
          </div>
          <div>
            <div className="text-[10px] opacity-50" style={{ color: player.color }}>
              {player.name}
            </div>
            <h4 className="text-sm font-bold">{strategy.name}</h4>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
            style={{ backgroundColor: risk.color + '20', color: risk.color }}
          >
            {risk.icon} {risk.label}
          </span>
        </div>
      </div>

      <p className="text-xs opacity-70 mb-3">{strategy.description}</p>

      {/* Expected payoff bar */}
      <div>
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="opacity-50">Expected Payoff</span>
          <span className="font-bold" style={{ color: player.color }}>
            {strategy.expectedPayoff}/10
          </span>
        </div>
        <div className="h-2 bg-[#25253e] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              backgroundColor: player.color,
              boxShadow: `0 0 8px ${player.color}60`,
            }}
            initial={{ width: 0 }}
            animate={{ width: `${strategy.expectedPayoff * 10}%` }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default function StrategyPanel() {
  const { analysis } = useStore();
  if (!analysis) return null;

  // Group strategies by player
  const byPlayer = analysis.players.map((player) => ({
    player,
    strategies: analysis.strategies.filter((s) => s.playerId === player.id),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-[#a29bfe]">Strategy Analysis</h3>
        <p className="text-[10px] opacity-50 mt-1">
          Available strategies for each player with risk assessment and expected payoffs
        </p>
      </div>

      {byPlayer.map(({ player, strategies }) => (
        <div key={player.id}>
          <div
            className="text-xs font-bold mb-2 flex items-center gap-1.5"
            style={{ color: player.color }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: player.color }}
            />
            {player.emoji} {player.name}&apos;s Strategies
          </div>
          <div className="space-y-2">
            {strategies.map((s, i) => (
              <StrategyCard key={i} strategy={s} index={i} />
            ))}
          </div>
        </div>
      ))}

      {/* Recommendation box */}
      {analysis.recommendation && (
        <motion.div
          className="p-4 rounded-xl border border-[#6c5ce730] bg-[#6c5ce708]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🧠</span>
            <span className="text-xs font-bold text-[#a29bfe]">Game Theorist&apos;s Recommendation</span>
          </div>
          <p className="text-xs opacity-80 leading-relaxed">{analysis.recommendation}</p>
        </motion.div>
      )}

      {/* Real world parallel */}
      {analysis.realWorldParallel && (
        <motion.div
          className="p-4 rounded-xl border border-[#25253e] bg-[#1a1a2e]/30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">📚</span>
            <span className="text-xs font-bold text-[#74c0fc]">Real-World Parallel</span>
          </div>
          <p className="text-xs opacity-80 leading-relaxed">{analysis.realWorldParallel}</p>
        </motion.div>
      )}
    </div>
  );
}
