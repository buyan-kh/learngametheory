'use client';

import { motion } from 'framer-motion';
import type { OpenWorldPrediction, OpenWorldPlayer } from '@/lib/types';

interface Props {
  prediction: OpenWorldPrediction | null;
  players: OpenWorldPlayer[];
  isLoading: boolean;
  onRequestPrediction: () => void;
}

export default function PredictionView({ prediction, players, isLoading, onRequestPrediction }: Props) {
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id;
  const colorOf = (id: string) => players.find((p) => p.id === id)?.color ?? '#a29bfe';
  const emojiOf = (id: string) => players.find((p) => p.id === id)?.emoji ?? '?';

  if (!prediction && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <div className="text-3xl">🔮</div>
        <p className="text-xs text-[#e0e0ff]/40 text-center max-w-[200px]">
          Run the simulation first, then request an AI prediction of what happens next.
        </p>
        <button
          onClick={onRequestPrediction}
          className="px-4 py-2 rounded-xl text-xs font-medium bg-[#6c5ce7]/20 text-[#a29bfe] border border-[#6c5ce7]/30 hover:bg-[#6c5ce7]/30 transition-colors"
        >
          Generate Prediction
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <motion.div
          className="text-3xl"
          animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          🔮
        </motion.div>
        <p className="text-xs text-[#a29bfe] animate-pulse">Analyzing strategic landscape...</p>
      </div>
    );
  }

  if (!prediction) return null;

  return (
    <div className="space-y-4 p-1">
      {/* Confidence badge */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#a29bfe] uppercase tracking-wider font-medium">AI Strategic Forecast</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
          prediction.confidenceLevel > 0.7
            ? 'bg-[#00b894]/20 text-[#00b894]'
            : prediction.confidenceLevel > 0.4
            ? 'bg-[#fdcb6e]/20 text-[#fdcb6e]'
            : 'bg-[#ff6b6b]/20 text-[#ff6b6b]'
        }`}>
          {Math.round(prediction.confidenceLevel * 100)}% confidence
        </span>
      </div>

      {/* Timeline predictions */}
      <div className="space-y-3">
        {/* Short term */}
        <div className="p-3 rounded-xl bg-[#00b894]/5 border border-[#00b894]/20">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px]">⏱️</span>
            <span className="text-[10px] font-medium text-[#00b894]">Short-Term (1-3 turns)</span>
          </div>
          <p className="text-xs text-[#e0e0ff]/60 leading-relaxed">{prediction.shortTerm}</p>
        </div>

        {/* Medium term */}
        <div className="p-3 rounded-xl bg-[#fdcb6e]/5 border border-[#fdcb6e]/20">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px]">📅</span>
            <span className="text-[10px] font-medium text-[#fdcb6e]">Medium-Term (5-10 turns)</span>
          </div>
          <p className="text-xs text-[#e0e0ff]/60 leading-relaxed">{prediction.mediumTerm}</p>
        </div>

        {/* Long term */}
        <div className="p-3 rounded-xl bg-[#6c5ce7]/5 border border-[#6c5ce7]/20">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px]">🎯</span>
            <span className="text-[10px] font-medium text-[#a29bfe]">End-Game</span>
          </div>
          <p className="text-xs text-[#e0e0ff]/60 leading-relaxed">{prediction.longTerm}</p>
        </div>
      </div>

      {/* Most likely outcome */}
      <div className="p-3 rounded-xl bg-[#1a1a2e] border border-[#25253e]">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px]">📊</span>
          <span className="text-[10px] font-medium text-[#e0e0ff]/70">Most Likely Outcome</span>
        </div>
        <p className="text-xs text-[#e0e0ff]/50 leading-relaxed">{prediction.mostLikelyOutcome}</p>
      </div>

      {/* Wildcard */}
      <div className="p-3 rounded-xl bg-[#e84393]/5 border border-[#e84393]/20">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[10px]">🃏</span>
          <span className="text-[10px] font-medium text-[#e84393]">Wildcard Scenario</span>
        </div>
        <p className="text-xs text-[#e0e0ff]/50 leading-relaxed">{prediction.wildcardScenario}</p>
      </div>

      {/* Per-player predictions */}
      <div>
        <span className="text-[10px] text-[#a29bfe] uppercase tracking-wider font-medium">Player Predictions</span>
        <div className="space-y-2 mt-2">
          {Object.entries(prediction.playerPredictions).map(([pid, pred]) => (
            <div
              key={pid}
              className="p-2 rounded-lg border border-[#25253e]/50"
              style={{ borderColor: colorOf(pid) + '30' }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">{emojiOf(pid)}</span>
                <span className="text-[10px] font-medium" style={{ color: colorOf(pid) }}>
                  {nameOf(pid)}
                </span>
                <div className="flex-1" />
                {/* Survival */}
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                  pred.survivalProbability > 0.7
                    ? 'bg-[#00b894]/20 text-[#00b894]'
                    : pred.survivalProbability > 0.4
                    ? 'bg-[#fdcb6e]/20 text-[#fdcb6e]'
                    : 'bg-[#ff6b6b]/20 text-[#ff6b6b]'
                }`}>
                  {Math.round(pred.survivalProbability * 100)}% survival
                </span>
                {/* Threat */}
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                  pred.threatLevel > 0.7
                    ? 'bg-[#ff6b6b]/20 text-[#ff6b6b]'
                    : pred.threatLevel > 0.4
                    ? 'bg-[#fdcb6e]/20 text-[#fdcb6e]'
                    : 'bg-[#00b894]/20 text-[#00b894]'
                }`}>
                  {pred.threatLevel > 0.7 ? 'High' : pred.threatLevel > 0.4 ? 'Medium' : 'Low'} threat
                </span>
              </div>
              <p className="text-[10px] text-[#e0e0ff]/40">{pred.likelyStrategy}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Refresh button */}
      <button
        onClick={onRequestPrediction}
        className="w-full py-2 rounded-xl text-[10px] font-medium text-[#a29bfe] border border-[#6c5ce7]/20 hover:bg-[#6c5ce7]/10 transition-colors"
      >
        Regenerate Prediction
      </button>
    </div>
  );
}
