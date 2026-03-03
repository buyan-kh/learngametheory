'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { OpenWorldTurnState, OpenWorldPlayer } from '@/lib/types';

interface Props {
  turns: OpenWorldTurnState[];
  players: OpenWorldPlayer[];
  currentTurn: number;
}

export default function WorldDashboard({ turns, players, currentTurn }: Props) {
  const currentState = turns[currentTurn - 1] ?? null;

  // Compute leaderboard
  const leaderboard = useMemo(() => {
    if (!currentState) return [];
    return Object.entries(currentState.playerStates)
      .map(([id, state]) => ({
        id,
        name: players.find((p) => p.id === id)?.name ?? id,
        emoji: players.find((p) => p.id === id)?.emoji ?? '?',
        color: players.find((p) => p.id === id)?.color ?? '#a29bfe',
        score: state.cumulativePayoff,
        status: state.status,
        action: state.actionTaken,
      }))
      .sort((a, b) => b.score - a.score);
  }, [currentState, players]);

  // Compute chart data points for payoff trajectories
  const chartData = useMemo(() => {
    const data: Record<string, number[]> = {};
    for (const p of players) data[p.id] = [];
    for (const turn of turns.slice(0, currentTurn)) {
      for (const p of players) {
        data[p.id].push(turn.playerStates[p.id]?.cumulativePayoff ?? 0);
      }
    }
    return data;
  }, [turns, currentTurn, players]);

  // SVG chart dimensions
  const chartW = 360;
  const chartH = 120;
  const padding = 20;

  const allValues = Object.values(chartData).flat();
  const minVal = allValues.length > 0 ? Math.min(...allValues, 0) : 0;
  const maxVal = allValues.length > 0 ? Math.max(...allValues, 1) : 1;
  const range = maxVal - minVal || 1;

  const toX = (i: number, total: number) =>
    padding + (i / Math.max(total - 1, 1)) * (chartW - 2 * padding);
  const toY = (v: number) =>
    chartH - padding - ((v - minVal) / range) * (chartH - 2 * padding);

  if (turns.length === 0) {
    return (
      <div className="text-center text-[#e0e0ff]/20 text-xs py-8">
        Waiting for simulation data...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* World State Meters */}
      {currentState && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Tension', value: currentState.worldState.tension, color: '#ff6b6b' },
            { label: 'Cooperation', value: currentState.worldState.cooperation, color: '#00b894' },
            { label: 'Volatility', value: currentState.worldState.volatility, color: '#fdcb6e' },
          ].map((meter) => (
            <div key={meter.label} className="p-2 rounded-lg bg-[#0a0a1a]/50 border border-[#25253e]/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] text-[#e0e0ff]/40">{meter.label}</span>
                <span className="text-[9px] font-mono" style={{ color: meter.color }}>
                  {(meter.value * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#25253e] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: meter.color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${meter.value * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payoff Trajectory Chart */}
      <div className="p-2 rounded-xl bg-[#0a0a1a]/30 border border-[#25253e]/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-[#a29bfe] font-medium">Payoff Trajectories</span>
          <span className="text-[9px] text-[#e0e0ff]/20">Turn {currentTurn} / {turns.length}</span>
        </div>
        <svg width={chartW} height={chartH} className="w-full" viewBox={`0 0 ${chartW} ${chartH}`}>
          {/* Zero line */}
          <line
            x1={padding} y1={toY(0)} x2={chartW - padding} y2={toY(0)}
            stroke="#25253e" strokeWidth={0.5} strokeDasharray="3,3"
          />

          {/* Player lines */}
          {players.map((player) => {
            const points = chartData[player.id] ?? [];
            if (points.length < 2) return null;

            const pathD = points
              .map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i, points.length)} ${toY(v)}`)
              .join(' ');

            return (
              <path
                key={player.id}
                d={pathD}
                fill="none"
                stroke={player.color}
                strokeWidth={1.5}
                opacity={0.7}
              />
            );
          })}

          {/* End dots */}
          {players.map((player) => {
            const points = chartData[player.id] ?? [];
            if (points.length === 0) return null;
            const lastVal = points[points.length - 1];
            return (
              <circle
                key={player.id}
                cx={toX(points.length - 1, points.length)}
                cy={toY(lastVal)}
                r={3}
                fill={player.color}
              />
            );
          })}
        </svg>
      </div>

      {/* Leaderboard */}
      <div>
        <span className="text-[10px] text-[#a29bfe] font-medium">Leaderboard</span>
        <div className="space-y-1 mt-1.5">
          {leaderboard.map((entry, i) => (
            <div
              key={entry.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${
                entry.status === 'eliminated' ? 'opacity-30' : ''
              } ${entry.status === 'won' ? 'bg-[#fdcb6e]/10 border border-[#fdcb6e]/20' : ''}`}
            >
              <span className="text-[10px] text-[#e0e0ff]/20 w-4 font-mono">{i + 1}</span>
              <span className="text-sm">{entry.emoji}</span>
              <span className="text-[10px] font-medium flex-1" style={{ color: entry.color }}>
                {entry.name}
                {entry.status === 'eliminated' && (
                  <span className="text-[#ff6b6b] ml-1">(eliminated)</span>
                )}
                {entry.status === 'won' && (
                  <span className="text-[#fdcb6e] ml-1">(winner!)</span>
                )}
              </span>
              <span className={`text-[10px] font-mono ${
                entry.score >= 0 ? 'text-[#00b894]' : 'text-[#ff6b6b]'
              }`}>
                {entry.score >= 0 ? '+' : ''}{entry.score.toFixed(1)}
              </span>
              <span className="text-[9px] text-[#e0e0ff]/20 max-w-[80px] truncate" title={entry.action}>
                {entry.action}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Current Turn Narrative */}
      {currentState && (
        <div className="p-3 rounded-xl bg-[#1a1a2e]/50 border border-[#25253e]/50">
          <span className="text-[10px] text-[#a29bfe] font-medium">Turn {currentTurn} Summary</span>
          <p className="text-xs text-[#e0e0ff]/40 mt-1.5 leading-relaxed">
            {currentState.narrative}
          </p>
        </div>
      )}
    </div>
  );
}
