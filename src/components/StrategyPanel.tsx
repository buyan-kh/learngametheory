'use client';

import { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { Strategy } from '@/lib/types';
import { ShieldIcon, LightningIcon, FireIcon, BrainIcon, BookIcon } from '@/components/icons';

const RISK_CONFIG: Record<string, { color: string; label: string; icon: ReactNode }> = {
  low: { color: '#51cf66', label: 'Low Risk', icon: <ShieldIcon /> },
  medium: { color: '#ffd43b', label: 'Med Risk', icon: <LightningIcon /> },
  high: { color: '#ff6b6b', label: 'High Risk', icon: <FireIcon /> },
};

const RISK_LEVELS: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];

function StrategyCard({ strategy, index }: { strategy: Strategy; index: number }) {
  const { analysis, editAnalysisStrategy, removeAnalysisStrategy } = useStore();
  const player = analysis?.players.find((p) => p.id === strategy.playerId);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(strategy.name);
  const [editDescription, setEditDescription] = useState(strategy.description);
  const [editRisk, setEditRisk] = useState<'low' | 'medium' | 'high'>(strategy.risk);
  const [editPayoff, setEditPayoff] = useState(strategy.expectedPayoff);
  const [isHovered, setIsHovered] = useState(false);

  if (!player) return null;

  const risk = RISK_CONFIG[strategy.risk];

  const startEditing = () => {
    setEditName(strategy.name);
    setEditDescription(strategy.description);
    setEditRisk(strategy.risk);
    setEditPayoff(strategy.expectedPayoff);
    setIsEditing(true);
  };

  const confirmEdit = () => {
    if (editName.trim()) {
      editAnalysisStrategy(strategy.playerId, strategy.name, {
        name: editName.trim(),
        description: editDescription.trim(),
        risk: editRisk,
        expectedPayoff: editPayoff,
      });
    }
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <motion.div
        className="p-4 rounded-xl border bg-[#1a1a2e] transition-colors"
        style={{ borderColor: player.color + '40' }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.08 }}
      >
        <div className="space-y-3">
          {/* Name input */}
          <div>
            <label className="text-[9px] uppercase tracking-wider opacity-40 block mb-0.5">
              Strategy Name
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full text-sm font-bold px-2 py-1 rounded border bg-[#0d0d20] outline-none"
              style={{ borderColor: player.color + '40', color: player.color }}
              autoFocus
            />
          </div>

          {/* Description textarea */}
          <div>
            <label className="text-[9px] uppercase tracking-wider opacity-40 block mb-0.5">
              Description
            </label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={2}
              className="w-full text-xs px-2 py-1 rounded border bg-[#0d0d20] outline-none resize-none opacity-80"
              style={{ borderColor: player.color + '20' }}
            />
          </div>

          {/* Risk toggle */}
          <div>
            <label className="text-[9px] uppercase tracking-wider opacity-40 block mb-1">
              Risk Level
            </label>
            <div className="flex gap-1">
              {RISK_LEVELS.map((level) => {
                const cfg = RISK_CONFIG[level];
                const isActive = editRisk === level;
                return (
                  <button
                    key={level}
                    onClick={() => setEditRisk(level)}
                    className="text-[10px] px-2 py-1 rounded-full font-bold transition-all"
                    style={{
                      backgroundColor: isActive ? cfg.color + '30' : '#25253e',
                      color: isActive ? cfg.color : '#ffffff60',
                      border: `1px solid ${isActive ? cfg.color + '60' : '#25253e'}`,
                    }}
                  >
                    {cfg.icon} {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payoff slider */}
          <div>
            <div className="flex items-center justify-between text-[9px] mb-1">
              <span className="uppercase tracking-wider opacity-40">Expected Payoff</span>
              <span className="font-bold" style={{ color: player.color }}>
                {editPayoff}/10
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={editPayoff}
              onChange={(e) => setEditPayoff(Number(e.target.value))}
              className="w-full h-2 accent-current cursor-pointer"
              style={{ color: player.color }}
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={cancelEdit}
              className="text-[10px] px-3 py-1 rounded opacity-50 hover:opacity-80 transition-opacity"
            >
              Cancel
            </button>
            <button
              onClick={confirmEdit}
              className="text-[10px] px-3 py-1 rounded font-bold transition-opacity"
              style={{
                backgroundColor: player.color + '20',
                color: player.color,
                opacity: editName.trim() ? 1 : 0.4,
              }}
              disabled={!editName.trim()}
            >
              Save
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="p-4 rounded-xl border border-[#25253e] bg-[#1a1a2e]/50 hover:bg-[#1a1a2e] transition-colors relative group"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Edit/Delete buttons - top right, visible on hover */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="absolute top-2 right-2 flex gap-1 z-10"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.1 }}
          >
            <button
              onClick={startEditing}
              className="p-1 rounded hover:bg-[#25253e] transition-colors"
              style={{ color: player.color }}
              title="Edit strategy"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
            </button>
            <button
              onClick={() => removeAnalysisStrategy(strategy.playerId, strategy.name)}
              className="p-1 rounded hover:bg-[#25253e] transition-colors text-[#ff6b6b]"
              title="Delete strategy"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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

function AddStrategyForm({ playerId, color, onClose }: { playerId: string; color: string; onClose: () => void }) {
  const { addAnalysisStrategy } = useStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [risk, setRisk] = useState<'low' | 'medium' | 'high'>('medium');
  const [payoff, setPayoff] = useState(5);

  const handleAdd = () => {
    if (name.trim()) {
      addAnalysisStrategy({
        playerId,
        name: name.trim(),
        description: description.trim() || `Custom strategy: ${name.trim()}`,
        risk,
        expectedPayoff: payoff,
      });
      onClose();
    }
  };

  return (
    <motion.div
      className="p-4 rounded-xl border bg-[#1a1a2e] space-y-3"
      style={{ borderColor: color + '40' }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div className="text-[10px] uppercase tracking-wider opacity-50 font-bold" style={{ color }}>
        New Strategy
      </div>

      {/* Name input */}
      <div>
        <label className="text-[9px] uppercase tracking-wider opacity-40 block mb-0.5">
          Strategy Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Aggressive Expansion"
          className="w-full text-sm font-bold px-2 py-1 rounded border bg-[#0d0d20] outline-none placeholder:opacity-30"
          style={{ borderColor: color + '40', color }}
          autoFocus
        />
      </div>

      {/* Description textarea */}
      <div>
        <label className="text-[9px] uppercase tracking-wider opacity-40 block mb-0.5">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Describe this strategy..."
          className="w-full text-xs px-2 py-1 rounded border bg-[#0d0d20] outline-none resize-none opacity-80 placeholder:opacity-30"
          style={{ borderColor: color + '20' }}
        />
      </div>

      {/* Risk toggle */}
      <div>
        <label className="text-[9px] uppercase tracking-wider opacity-40 block mb-1">
          Risk Level
        </label>
        <div className="flex gap-1">
          {RISK_LEVELS.map((level) => {
            const cfg = RISK_CONFIG[level];
            const isActive = risk === level;
            return (
              <button
                key={level}
                onClick={() => setRisk(level)}
                className="text-[10px] px-2 py-1 rounded-full font-bold transition-all"
                style={{
                  backgroundColor: isActive ? cfg.color + '30' : '#25253e',
                  color: isActive ? cfg.color : '#ffffff60',
                  border: `1px solid ${isActive ? cfg.color + '60' : '#25253e'}`,
                }}
              >
                {cfg.icon} {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Payoff slider */}
      <div>
        <div className="flex items-center justify-between text-[9px] mb-1">
          <span className="uppercase tracking-wider opacity-40">Expected Payoff</span>
          <span className="font-bold" style={{ color }}>
            {payoff}/10
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="10"
          step="0.5"
          value={payoff}
          onChange={(e) => setPayoff(Number(e.target.value))}
          className="w-full h-2 accent-current cursor-pointer"
          style={{ color }}
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 justify-end pt-1">
        <button
          onClick={onClose}
          className="text-[10px] px-3 py-1 rounded opacity-50 hover:opacity-80 transition-opacity"
        >
          Cancel
        </button>
        <button
          onClick={handleAdd}
          className="text-[10px] px-3 py-1 rounded font-bold transition-opacity"
          style={{
            backgroundColor: color + '20',
            color,
            opacity: name.trim() ? 1 : 0.4,
          }}
          disabled={!name.trim()}
        >
          Add Strategy
        </button>
      </div>
    </motion.div>
  );
}

export default function StrategyPanel() {
  const { analysis } = useStore();
  const [addingForPlayer, setAddingForPlayer] = useState<string | null>(null);

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
            <AnimatePresence mode="popLayout">
              {strategies.map((s, i) => (
                <StrategyCard key={`${s.playerId}-${s.name}`} strategy={s} index={i} />
              ))}
            </AnimatePresence>

            {/* Add strategy form or button */}
            <AnimatePresence mode="wait">
              {addingForPlayer === player.id ? (
                <AddStrategyForm
                  key="add-form"
                  playerId={player.id}
                  color={player.color}
                  onClose={() => setAddingForPlayer(null)}
                />
              ) : (
                <motion.button
                  key="add-button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setAddingForPlayer(player.id)}
                  className="w-full text-[10px] py-2 rounded-xl border border-dashed opacity-40 hover:opacity-70 transition-opacity"
                  style={{
                    borderColor: player.color + '40',
                    color: player.color,
                  }}
                >
                  + Add Strategy
                </motion.button>
              )}
            </AnimatePresence>
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
            <span className="text-lg"><BrainIcon /></span>
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
            <span className="text-lg"><BookIcon /></span>
            <span className="text-xs font-bold text-[#74c0fc]">Real-World Parallel</span>
          </div>
          <p className="text-xs opacity-80 leading-relaxed">{analysis.realWorldParallel}</p>
        </motion.div>
      )}
    </div>
  );
}
