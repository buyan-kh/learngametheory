'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OpenWorldPlayer } from '@/lib/types';

const PLAYER_TYPES: { value: OpenWorldPlayer['type']; label: string; emoji: string }[] = [
  { value: 'nation', label: 'Nation', emoji: '🏛️' },
  { value: 'corporation', label: 'Corporation', emoji: '🏢' },
  { value: 'individual', label: 'Individual', emoji: '👤' },
  { value: 'organization', label: 'Organization', emoji: '🌐' },
  { value: 'market', label: 'Market Force', emoji: '📊' },
  { value: 'custom', label: 'Custom', emoji: '⚡' },
];

const TRAIT_LABELS: { key: keyof OpenWorldPlayer['personalityTraits']; label: string; low: string; high: string }[] = [
  { key: 'aggression', label: 'Aggression', low: 'Peaceful', high: 'Aggressive' },
  { key: 'cooperation', label: 'Cooperation', low: 'Selfish', high: 'Cooperative' },
  { key: 'riskTolerance', label: 'Risk Tolerance', low: 'Risk-Averse', high: 'Risk-Seeking' },
  { key: 'rationality', label: 'Rationality', low: 'Emotional', high: 'Calculated' },
  { key: 'patience', label: 'Patience', low: 'Impulsive', high: 'Patient' },
];

interface Props {
  player: OpenWorldPlayer;
  onChange: (updated: OpenWorldPlayer) => void;
  onRemove: () => void;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function PlayerBuilder({ player, onChange, onRemove, isExpanded, onToggle }: Props) {
  const [newGoal, setNewGoal] = useState('');
  const [newConstraint, setNewConstraint] = useState('');

  const updateTrait = (key: keyof OpenWorldPlayer['personalityTraits'], value: number) => {
    onChange({
      ...player,
      personalityTraits: { ...player.personalityTraits, [key]: value },
    });
  };

  const addGoal = () => {
    if (!newGoal.trim()) return;
    onChange({ ...player, goals: [...player.goals, newGoal.trim()] });
    setNewGoal('');
  };

  const removeGoal = (index: number) => {
    onChange({ ...player, goals: player.goals.filter((_, i) => i !== index) });
  };

  const addConstraint = () => {
    if (!newConstraint.trim()) return;
    onChange({ ...player, constraints: [...player.constraints, newConstraint.trim()] });
    setNewConstraint('');
  };

  const removeConstraint = (index: number) => {
    onChange({ ...player, constraints: player.constraints.filter((_, i) => i !== index) });
  };

  const updateResource = (index: number, field: string, value: number) => {
    const newResources = [...player.resources];
    newResources[index] = { ...newResources[index], [field]: value };
    onChange({ ...player, resources: newResources });
  };

  const addResource = () => {
    onChange({
      ...player,
      resources: [
        ...player.resources,
        { name: 'New Resource', amount: 10, maxAmount: 20, regenerationRate: 0.5 },
      ],
    });
  };

  const removeResource = (index: number) => {
    onChange({ ...player, resources: player.resources.filter((_, i) => i !== index) });
  };

  return (
    <motion.div
      className="border border-[#25253e] rounded-xl overflow-hidden"
      style={{ borderColor: player.color + '40' }}
      layout
    >
      {/* Header - always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 hover:bg-[#1a1a2e]/50 transition-colors"
      >
        <span className="text-xl">{player.emoji}</span>
        <div className="flex-1 text-left">
          <span className="text-sm font-medium" style={{ color: player.color }}>
            {player.name || 'Unnamed Player'}
          </span>
          <span className="text-[10px] text-[#e0e0ff]/30 ml-2">{player.type}</span>
        </div>
        <svg
          className={`w-4 h-4 text-[#e0e0ff]/30 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="text-[#ff6b6b]/40 hover:text-[#ff6b6b] text-xs px-2"
        >
          Remove
        </button>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-4 border-t border-[#25253e]/50">
              {/* Basic info */}
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-[10px] text-[#a29bfe] uppercase tracking-wider">Name</label>
                  <input
                    type="text"
                    value={player.name}
                    onChange={(e) => onChange({ ...player, name: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg bg-[#0a0a1a] border border-[#25253e] text-sm text-[#e0e0ff] focus:border-[#6c5ce7] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#a29bfe] uppercase tracking-wider">Emoji</label>
                  <input
                    type="text"
                    value={player.emoji}
                    onChange={(e) => onChange({ ...player, emoji: e.target.value })}
                    className="w-full mt-1 px-3 py-1.5 rounded-lg bg-[#0a0a1a] border border-[#25253e] text-sm text-[#e0e0ff] focus:border-[#6c5ce7] focus:outline-none"
                    maxLength={4}
                  />
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="text-[10px] text-[#a29bfe] uppercase tracking-wider">Type</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {PLAYER_TYPES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => onChange({ ...player, type: t.value })}
                      className={`px-2 py-1 rounded-lg text-[10px] border transition-colors ${
                        player.type === t.value
                          ? 'border-[#6c5ce7] bg-[#6c5ce7]/20 text-[#a29bfe]'
                          : 'border-[#25253e] text-[#e0e0ff]/40 hover:border-[#6c5ce7]/50'
                      }`}
                    >
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] text-[#a29bfe] uppercase tracking-wider">Description</label>
                <textarea
                  value={player.description}
                  onChange={(e) => onChange({ ...player, description: e.target.value })}
                  rows={2}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg bg-[#0a0a1a] border border-[#25253e] text-xs text-[#e0e0ff] focus:border-[#6c5ce7] focus:outline-none resize-none"
                  placeholder="Who is this player? What do they want?"
                />
              </div>

              {/* Goals */}
              <div>
                <label className="text-[10px] text-[#a29bfe] uppercase tracking-wider">Goals</label>
                <div className="space-y-1 mt-1">
                  {player.goals.map((goal, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-[#e0e0ff]/60 flex-1">{goal}</span>
                      <button onClick={() => removeGoal(i)} className="text-[#ff6b6b]/40 hover:text-[#ff6b6b] text-[10px]">
                        x
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newGoal}
                      onChange={(e) => setNewGoal(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addGoal()}
                      className="flex-1 px-2 py-1 rounded bg-[#0a0a1a] border border-[#25253e] text-[10px] text-[#e0e0ff] focus:border-[#6c5ce7] focus:outline-none"
                      placeholder="Add a goal..."
                    />
                    <button onClick={addGoal} className="text-[10px] text-[#a29bfe] hover:text-white">+ Add</button>
                  </div>
                </div>
              </div>

              {/* Personality Traits */}
              <div>
                <label className="text-[10px] text-[#a29bfe] uppercase tracking-wider">Personality Traits</label>
                <div className="space-y-2 mt-2">
                  {TRAIT_LABELS.map((trait) => (
                    <div key={trait.key}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] text-[#e0e0ff]/50">{trait.label}</span>
                        <span className="text-[10px] text-[#e0e0ff]/30 font-mono">
                          {player.personalityTraits[trait.key].toFixed(1)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-[#e0e0ff]/20 w-14 text-right">{trait.low}</span>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={player.personalityTraits[trait.key]}
                          onChange={(e) => updateTrait(trait.key, parseFloat(e.target.value))}
                          className="flex-1 h-1 accent-[#6c5ce7]"
                        />
                        <span className="text-[9px] text-[#e0e0ff]/20 w-14">{trait.high}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resources */}
              <div>
                <label className="text-[10px] text-[#a29bfe] uppercase tracking-wider">Resources</label>
                <div className="space-y-2 mt-1">
                  {player.resources.map((res, i) => (
                    <div key={i} className="p-2 rounded-lg bg-[#0a0a1a]/50 border border-[#25253e]/50 space-y-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={res.name}
                          onChange={(e) => {
                            const newRes = [...player.resources];
                            newRes[i] = { ...newRes[i], name: e.target.value };
                            onChange({ ...player, resources: newRes });
                          }}
                          className="flex-1 px-2 py-0.5 rounded bg-transparent border border-[#25253e] text-[10px] text-[#e0e0ff] focus:border-[#6c5ce7] focus:outline-none"
                        />
                        <button onClick={() => removeResource(i)} className="text-[#ff6b6b]/40 hover:text-[#ff6b6b] text-[10px]">x</button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-[9px] text-[#e0e0ff]/20">Amount</span>
                          <input type="number" value={res.amount} onChange={(e) => updateResource(i, 'amount', +e.target.value)}
                            className="w-full px-1 py-0.5 rounded bg-[#0a0a1a] border border-[#25253e] text-[10px] text-[#e0e0ff] focus:outline-none" />
                        </div>
                        <div>
                          <span className="text-[9px] text-[#e0e0ff]/20">Max</span>
                          <input type="number" value={res.maxAmount} onChange={(e) => updateResource(i, 'maxAmount', +e.target.value)}
                            className="w-full px-1 py-0.5 rounded bg-[#0a0a1a] border border-[#25253e] text-[10px] text-[#e0e0ff] focus:outline-none" />
                        </div>
                        <div>
                          <span className="text-[9px] text-[#e0e0ff]/20">Regen</span>
                          <input type="number" step={0.1} value={res.regenerationRate} onChange={(e) => updateResource(i, 'regenerationRate', +e.target.value)}
                            className="w-full px-1 py-0.5 rounded bg-[#0a0a1a] border border-[#25253e] text-[10px] text-[#e0e0ff] focus:outline-none" />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button onClick={addResource} className="text-[10px] text-[#a29bfe] hover:text-white">+ Add Resource</button>
                </div>
              </div>

              {/* Constraints */}
              <div>
                <label className="text-[10px] text-[#a29bfe] uppercase tracking-wider">Constraints</label>
                <div className="space-y-1 mt-1">
                  {player.constraints.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-[#e0e0ff]/60 flex-1">{c}</span>
                      <button onClick={() => removeConstraint(i)} className="text-[#ff6b6b]/40 hover:text-[#ff6b6b] text-[10px]">x</button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newConstraint}
                      onChange={(e) => setNewConstraint(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addConstraint()}
                      className="flex-1 px-2 py-1 rounded bg-[#0a0a1a] border border-[#25253e] text-[10px] text-[#e0e0ff] focus:border-[#6c5ce7] focus:outline-none"
                      placeholder="Add a constraint..."
                    />
                    <button onClick={addConstraint} className="text-[10px] text-[#a29bfe] hover:text-white">+ Add</button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
