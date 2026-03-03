'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { OpenWorldTurnState, OpenWorldPlayer } from '@/lib/types';

const CATEGORY_COLORS: Record<string, string> = {
  aggressive: '#ff6b6b',
  cooperative: '#00b894',
  defensive: '#74b9ff',
  economic: '#fdcb6e',
  diplomatic: '#a29bfe',
  deceptive: '#e84393',
};

const CATEGORY_ICONS: Record<string, string> = {
  aggressive: '⚔️',
  cooperative: '🤝',
  defensive: '🛡️',
  economic: '💰',
  diplomatic: '🕊️',
  deceptive: '🗡️',
};

interface Props {
  turns: OpenWorldTurnState[];
  players: OpenWorldPlayer[];
  currentTurn: number;
  onSelectTurn: (turn: number) => void;
}

export default function EventTimeline({ turns, players, currentTurn, onSelectTurn }: Props) {
  const [expandedTurn, setExpandedTurn] = useState<number | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id;
  const colorOf = (id: string) => players.find((p) => p.id === id)?.color ?? '#a29bfe';
  const emojiOf = (id: string) => players.find((p) => p.id === id)?.emoji ?? '?';

  // Auto-scroll to latest turn
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [turns.length]);

  const filteredTurns = turns.map((turn) => ({
    ...turn,
    events: filter
      ? turn.events.filter((e) => e.action.category === filter)
      : turn.events,
  }));

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex items-center gap-1 p-2 border-b border-[#25253e]/50 flex-shrink-0">
        <button
          onClick={() => setFilter(null)}
          className={`px-2 py-0.5 rounded text-[9px] transition-colors ${
            !filter ? 'bg-[#6c5ce7]/20 text-[#a29bfe]' : 'text-[#e0e0ff]/30 hover:text-[#e0e0ff]/60'
          }`}
        >
          All
        </button>
        {Object.entries(CATEGORY_ICONS).map(([cat, icon]) => (
          <button
            key={cat}
            onClick={() => setFilter(filter === cat ? null : cat)}
            className={`px-1.5 py-0.5 rounded text-[9px] transition-colors ${
              filter === cat
                ? 'bg-[#6c5ce7]/20 text-[#a29bfe]'
                : 'text-[#e0e0ff]/30 hover:text-[#e0e0ff]/60'
            }`}
            title={cat}
          >
            {icon}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1 min-h-0">
        {filteredTurns.map((turn) => {
          const isActive = turn.turn === currentTurn;
          const isExpanded = expandedTurn === turn.turn;
          const hasShocks = turn.shocksTriggered.length > 0;

          return (
            <div key={turn.turn}>
              {/* Turn header */}
              <button
                onClick={() => {
                  setExpandedTurn(isExpanded ? null : turn.turn);
                  onSelectTurn(turn.turn);
                }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                  isActive
                    ? 'bg-[#6c5ce7]/15 border border-[#6c5ce7]/30'
                    : 'hover:bg-[#1a1a2e]/50 border border-transparent'
                }`}
              >
                {/* Turn number */}
                <span className={`text-[10px] font-mono w-6 text-center ${
                  isActive ? 'text-[#a29bfe]' : 'text-[#e0e0ff]/20'
                }`}>
                  {turn.turn}
                </span>

                {/* Mini event icons */}
                <div className="flex items-center gap-0.5 flex-1 min-w-0">
                  {turn.events.slice(0, 6).map((event, i) => (
                    <span
                      key={i}
                      className="inline-block w-3 h-3 rounded-sm text-[8px] text-center leading-3"
                      style={{ backgroundColor: CATEGORY_COLORS[event.action.category] + '30' }}
                      title={`${nameOf(event.playerId)}: ${event.action.name}`}
                    >
                      {emojiOf(event.playerId)}
                    </span>
                  ))}
                  {turn.events.length > 6 && (
                    <span className="text-[9px] text-[#e0e0ff]/20">+{turn.events.length - 6}</span>
                  )}
                </div>

                {/* Shock indicator */}
                {hasShocks && (
                  <span className="text-[10px]" title="External shock">⚡</span>
                )}

                {/* Tension bar */}
                <div className="w-8 h-1.5 rounded-full bg-[#25253e] overflow-hidden" title={`Tension: ${(turn.worldState.tension * 100).toFixed(0)}%`}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${turn.worldState.tension * 100}%`,
                      backgroundColor: turn.worldState.tension > 0.6 ? '#ff6b6b' : turn.worldState.tension > 0.3 ? '#fdcb6e' : '#00b894',
                    }}
                  />
                </div>
              </button>

              {/* Expanded events */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-8 space-y-1 py-1">
                      {/* Narrative */}
                      <p className="text-[10px] text-[#e0e0ff]/40 italic px-2 py-1">
                        {turn.narrative}
                      </p>

                      {/* Events */}
                      {turn.events.map((event, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 px-2 py-1 rounded-lg"
                          style={{ backgroundColor: CATEGORY_COLORS[event.action.category] + '08' }}
                        >
                          <span className="text-[10px] mt-0.5">
                            {CATEGORY_ICONS[event.action.category]}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] font-medium" style={{ color: colorOf(event.playerId) }}>
                                {nameOf(event.playerId)}
                              </span>
                              {event.targetPlayerId && (
                                <>
                                  <span className="text-[9px] text-[#e0e0ff]/20">→</span>
                                  <span className="text-[10px]" style={{ color: colorOf(event.targetPlayerId) }}>
                                    {nameOf(event.targetPlayerId)}
                                  </span>
                                </>
                              )}
                              <span className={`text-[9px] px-1 rounded ${
                                event.succeeded
                                  ? 'bg-[#00b894]/20 text-[#00b894]'
                                  : 'bg-[#ff6b6b]/20 text-[#ff6b6b]'
                              }`}>
                                {event.succeeded ? 'Success' : 'Failed'}
                              </span>
                            </div>
                            <p className="text-[9px] text-[#e0e0ff]/30 mt-0.5">
                              {event.narrativeDetail}
                            </p>
                          </div>
                        </div>
                      ))}

                      {/* World state */}
                      <div className="flex items-center gap-3 px-2 pt-1">
                        <span className="text-[9px] text-[#e0e0ff]/20">
                          Tension: {(turn.worldState.tension * 100).toFixed(0)}%
                        </span>
                        <span className="text-[9px] text-[#e0e0ff]/20">
                          Cooperation: {(turn.worldState.cooperation * 100).toFixed(0)}%
                        </span>
                        <span className="text-[9px] text-[#e0e0ff]/20">
                          Volatility: {(turn.worldState.volatility * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {turns.length === 0 && (
          <div className="text-center text-[#e0e0ff]/20 text-xs py-8">
            No events yet. Run the simulation to see the timeline.
          </div>
        )}
      </div>
    </div>
  );
}
