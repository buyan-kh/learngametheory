'use client';

import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';

function PayoffBadge({ value, color, max = 10 }: { value: number; color: string; max?: number }) {
  const pct = (value / max) * 100;
  const bgOpacity = Math.round(pct * 0.4 + 10);
  return (
    <span
      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold"
      style={{
        backgroundColor: color + Math.round(bgOpacity * 2.55).toString(16).padStart(2, '0'),
        color: color,
        boxShadow: pct > 60 ? `0 0 8px ${color}40` : undefined,
      }}
    >
      {value}
    </span>
  );
}

export default function PayoffMatrix() {
  const { analysis } = useStore();
  if (!analysis) return null;

  const { players, payoffMatrix } = analysis;
  if (players.length < 2 || !payoffMatrix.length) return null;

  // Get unique strategies for first two players
  const p1 = players[0];
  const p2 = players[1];
  const p1Strategies = [...new Set(payoffMatrix.map((c) => c.strategies[p1.id]))].filter(Boolean);
  const p2Strategies = [...new Set(payoffMatrix.map((c) => c.strategies[p2.id]))].filter(Boolean);

  return (
    <motion.div
      className="overflow-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="mb-4">
        <h3 className="text-sm font-bold text-[#a29bfe]">Payoff Matrix</h3>
        <p className="text-[10px] opacity-50 mt-1">
          Numbers represent payoff values (0-10) for each player in each strategy combination
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 border border-[#25253e] bg-[#1a1a2e]">
                <div className="flex items-center gap-1">
                  <span style={{ color: p1.color }}>{p1.emoji} {p1.name}</span>
                  <span className="opacity-30">vs</span>
                  <span style={{ color: p2.color }}>{p2.emoji} {p2.name}</span>
                </div>
              </th>
              {p2Strategies.map((s, i) => (
                <th
                  key={i}
                  className="p-2 border border-[#25253e] text-xs font-medium"
                  style={{ color: p2.color, backgroundColor: p2.color + '10' }}
                >
                  {s}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {p1Strategies.map((s1, i) => (
              <tr key={i}>
                <td
                  className="p-2 border border-[#25253e] text-xs font-medium"
                  style={{ color: p1.color, backgroundColor: p1.color + '10' }}
                >
                  {s1}
                </td>
                {p2Strategies.map((s2, j) => {
                  const cell = payoffMatrix.find(
                    (c) => c.strategies[p1.id] === s1 && c.strategies[p2.id] === s2
                  );
                  return (
                    <td
                      key={j}
                      className="p-2 border border-[#25253e] bg-[#0d0d20]"
                    >
                      {cell ? (
                        <div className="flex items-center justify-center gap-2">
                          <PayoffBadge value={cell.payoffs[p1.id] ?? 0} color={p1.color} />
                          <span className="text-[10px] opacity-30">,</span>
                          <PayoffBadge value={cell.payoffs[p2.id] ?? 0} color={p2.color} />
                        </div>
                      ) : (
                        <span className="text-xs opacity-30">-</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Nash Equilibrium callout */}
      {analysis.nashEquilibrium && (
        <div className="mt-4 p-3 rounded-lg border border-[#ffd43b30] bg-[#ffd43b08]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-[#ffd43b]" />
            <span className="text-xs font-bold text-[#ffd43b]">Nash Equilibrium</span>
          </div>
          <p className="text-xs opacity-70">{analysis.nashEquilibrium}</p>
        </div>
      )}

      {analysis.dominantStrategy && (
        <div className="mt-2 p-3 rounded-lg border border-[#74c0fc30] bg-[#74c0fc08]">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-[#74c0fc]" />
            <span className="text-xs font-bold text-[#74c0fc]">Dominant Strategy</span>
          </div>
          <p className="text-xs opacity-70">{analysis.dominantStrategy}</p>
        </div>
      )}
    </motion.div>
  );
}
