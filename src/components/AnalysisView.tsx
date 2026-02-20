'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import GameBoard from './GameBoard';
import PayoffMatrix from './PayoffMatrix';
import OutcomePanel from './OutcomePanel';
import StrategyPanel from './StrategyPanel';
import PixelCharacter from './PixelCharacter';
import { GamepadIcon, ChartIcon, TargetIcon, BrainIcon, ScrollIcon, PlayersIcon } from '@/components/icons';

const TABS: { id: 'board' | 'matrix' | 'outcomes' | 'strategy'; label: string; icon: ReactNode }[] = [
  { id: 'board', label: 'Game Board', icon: <GamepadIcon /> },
  { id: 'matrix', label: 'Payoff Matrix', icon: <ChartIcon /> },
  { id: 'outcomes', label: 'Outcomes', icon: <TargetIcon /> },
  { id: 'strategy', label: 'Strategy', icon: <BrainIcon /> },
];

function GameTypeBadge() {
  const { analysis } = useStore();
  if (!analysis) return null;

  return (
    <motion.div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#6c5ce740] bg-[#6c5ce710]"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="w-2 h-2 rounded-full bg-[#6c5ce7] animate-pulse" />
      <span className="text-xs font-bold text-[#a29bfe]">{analysis.gameType}</span>
    </motion.div>
  );
}

function RulesPanel() {
  const { analysis } = useStore();
  if (!analysis) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-bold text-[#a29bfe] flex items-center gap-1.5">
        <ScrollIcon /> Rules of the Game
      </h4>
      {analysis.rules.map((rule, i) => (
        <motion.div
          key={i}
          className="flex items-start gap-2 text-xs opacity-80"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 0.8, x: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <span className="text-[#6c5ce7] font-mono text-[10px] mt-0.5 shrink-0">
            {String(i + 1).padStart(2, '0')}
          </span>
          <span>{rule}</span>
        </motion.div>
      ))}
    </div>
  );
}

function PlayersSidebar() {
  const { analysis, selectedPlayer, setSelectedPlayer } = useStore();
  if (!analysis) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold text-[#a29bfe] flex items-center gap-1.5">
        <PlayersIcon /> Players
      </h4>
      <div className="flex flex-wrap gap-3">
        {analysis.players.map((player) => (
          <PixelCharacter
            key={player.id}
            player={player}
            size={5}
            selected={selectedPlayer === player.id}
            onClick={() => setSelectedPlayer(selectedPlayer === player.id ? null : player.id)}
            showLabel
            animate={false}
          />
        ))}
      </div>
    </div>
  );
}

export default function AnalysisView() {
  const { analysis, activeTab, setActiveTab, setAnalysis, setInput, setAppMode, addComparisonScenario } = useStore();
  if (!analysis) return null;

  return (
    <motion.div
      className="w-full max-w-7xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <GameTypeBadge />
            <h2 className="text-2xl font-bold mt-2">{analysis.title}</h2>
            <p className="text-sm opacity-60 mt-1 max-w-2xl">{analysis.summary}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAppMode('simulate');
              }}
              className="text-xs px-3 py-1.5 rounded-full border border-[#00b89440] text-[#00b894] hover:bg-[#00b89410] transition-all flex items-center gap-1.5"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
              Simulate
            </button>
            <button
              onClick={() => {
                addComparisonScenario(analysis);
                setAppMode('compare');
              }}
              className="text-xs px-3 py-1.5 rounded-full border border-[#0984e340] text-[#0984e3] hover:bg-[#0984e310] transition-all flex items-center gap-1.5"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 3h5v5M8 3H3v5M3 16v5h5M21 16v5h-5" />
              </svg>
              Compare
            </button>
            <button
              onClick={() => {
                setAnalysis(null);
                setInput('');
              }}
              className="text-xs px-3 py-1.5 rounded-full border border-[#25253e] hover:border-[#6c5ce7] text-[#a29bfe] transition-all"
            >
              New Scenario
            </button>
          </div>
        </div>
        {analysis.gameTypeDescription && (
          <p className="text-xs opacity-40 italic">{analysis.gameTypeDescription}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <PlayersSidebar />
          <RulesPanel />
        </div>

        {/* Main content */}
        <div className="lg:col-span-3">
          {/* Tab bar */}
          <div className="flex gap-1 mb-4 p-1 bg-[#1a1a2e] rounded-xl">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === tab.id
                    ? 'bg-[#6c5ce7] text-white'
                    : 'text-[#a29bfe80] hover:text-[#a29bfe] hover:bg-[#25253e]'
                  }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="bg-[#1a1a2e]/30 rounded-xl border border-[#25253e] p-4">
            {activeTab === 'board' && <GameBoard />}
            {activeTab === 'matrix' && <PayoffMatrix />}
            {activeTab === 'outcomes' && <OutcomePanel />}
            {activeTab === 'strategy' && <StrategyPanel />}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
