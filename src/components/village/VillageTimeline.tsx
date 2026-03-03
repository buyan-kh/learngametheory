'use client';

import { useState } from 'react';
import { VillageTurnSnapshot, VillageEvent } from '@/lib/villageTypes';

const EVENT_STYLES: Record<string, { emoji: string; color: string }> = {
  conflict:  { emoji: '\u2694\uFE0F', color: '#ff7675' },
  theft:     { emoji: '\uD83D\uDC7E', color: '#e17055' },
  disaster:  { emoji: '\uD83D\uDD25', color: '#ff6b6b' },
  epidemic:  { emoji: '\uD83E\uDDA0', color: '#a855f7' },
  festival:  { emoji: '\uD83C\uDF89', color: '#ffd43b' },
  harvest:   { emoji: '\uD83C\uDF3E', color: '#00b894' },
  death:     { emoji: '\uD83D\uDC80', color: '#636e72' },
  migration: { emoji: '\uD83D\uDEB6', color: '#0984e3' },
  trade:     { emoji: '\uD83E\uDD1D', color: '#00cec9' },
  action:    { emoji: '\u26A1', color: '#a29bfe' },
};

type FilterType = 'all' | 'conflict' | 'disaster' | 'positive' | 'death';

export default function VillageTimeline({ turns, currentTurn }: {
  turns: VillageTurnSnapshot[];
  currentTurn: number;
}) {
  const [filter, setFilter] = useState<FilterType>('all');

  // Gather all events up to current turn
  const allEvents: VillageEvent[] = [];
  for (let t = 0; t <= currentTurn; t++) {
    const turn = turns[t];
    if (turn) allEvents.push(...turn.events);
  }

  // Filter
  const filtered = allEvents.filter(e => {
    if (filter === 'all') return e.significance >= 7;
    if (filter === 'conflict') return e.type === 'conflict' || e.type === 'theft';
    if (filter === 'disaster') return e.type === 'disaster' || e.type === 'epidemic';
    if (filter === 'positive') return e.type === 'festival' || e.type === 'harvest';
    if (filter === 'death') return e.type === 'death';
    return true;
  });

  // Show most recent first
  const reversed = [...filtered].reverse();

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All Major' },
    { key: 'conflict', label: 'Conflicts' },
    { key: 'disaster', label: 'Disasters' },
    { key: 'positive', label: 'Positive' },
    { key: 'death', label: 'Deaths' },
  ];

  return (
    <div className="rounded-2xl border border-[#25253e] bg-[#1a1a2e]/50 p-4">
      {/* Filter buttons */}
      <div className="flex gap-1 mb-4">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-2 py-1 rounded-md text-[9px] font-medium transition-colors ${
              filter === f.key
                ? 'bg-[#00b894]/20 text-[#00cec9] border border-[#00b894]/30'
                : 'text-[#e0e0ff]/40 border border-transparent hover:text-[#e0e0ff]/60'
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-[9px] text-[#e0e0ff]/30 self-center">
          {filtered.length} events
        </span>
      </div>

      {/* Event list */}
      <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
        {reversed.length === 0 && (
          <div className="text-center text-[10px] text-[#e0e0ff]/30 py-8">
            No events matching this filter yet.
          </div>
        )}
        {reversed.map((event, i) => {
          const style = EVENT_STYLES[event.type] || EVENT_STYLES.action;
          return (
            <div
              key={`${event.turn}-${i}`}
              className="flex items-start gap-2 rounded-lg border border-[#25253e]/40 bg-[#0a0a1a]/40 p-2"
            >
              <span className="text-sm mt-0.5 shrink-0">{style.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-[#e0e0ff]/70 leading-relaxed">
                  {event.description}
                </div>
                <div className="flex gap-2 mt-0.5 text-[8px] text-[#e0e0ff]/30">
                  <span>Turn {event.turn + 1}</span>
                  <span style={{ color: style.color }}>{event.type}</span>
                  {event.significance >= 9 && (
                    <span className="text-[#ff6b6b]">Critical</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
