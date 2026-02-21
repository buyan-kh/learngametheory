'use client';

import { useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SimulationResult, SimulationRound } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RoundCommentaryProps {
  result: SimulationResult;
  currentRound: number; // 1-indexed, which round we're displaying up to
}

type CommentaryColor = 'green' | 'red' | 'yellow' | 'blue';

interface CommentaryEntry {
  round: number;
  text: string;
  color: CommentaryColor;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Look up player name + emoji by ID */
function playerTag(result: SimulationResult, playerId: string): string {
  const p = result.analysis.players.find((pl) => pl.id === playerId);
  if (!p) return playerId;
  return `${p.emoji} ${p.name}`;
}

/** Get just the player name by ID */
function playerName(result: SimulationResult, playerId: string): string {
  const p = result.analysis.players.find((pl) => pl.id === playerId);
  return p?.name ?? playerId;
}

/** Get just the player emoji by ID */
function playerEmoji(result: SimulationResult, playerId: string): string {
  const p = result.analysis.players.find((pl) => pl.id === playerId);
  return p?.emoji ?? '';
}

/** Get all player IDs in a stable order */
function playerIds(result: SimulationResult): string[] {
  return result.analysis.players.map((p) => p.id);
}

/** Leader by cumulative payoffs */
function getLeader(round: SimulationRound, ids: string[]): { id: string; margin: number } | null {
  if (ids.length < 2) return null;
  let bestId = ids[0];
  let bestPayoff = round.cumulativePayoffs[ids[0]] ?? 0;
  for (let i = 1; i < ids.length; i++) {
    const p = round.cumulativePayoffs[ids[i]] ?? 0;
    if (p > bestPayoff) {
      bestId = ids[i];
      bestPayoff = p;
    }
  }
  // Find runner-up
  let runnerUp = -Infinity;
  for (const id of ids) {
    if (id !== bestId) {
      runnerUp = Math.max(runnerUp, round.cumulativePayoffs[id] ?? 0);
    }
  }
  return { id: bestId, margin: bestPayoff - runnerUp };
}

// ---------------------------------------------------------------------------
// Commentary generation
// ---------------------------------------------------------------------------

function generateCommentary(result: SimulationResult, roundIndex: number): CommentaryEntry | null {
  const round = result.rounds[roundIndex];
  if (!round) return null;

  const ids = playerIds(result);
  const prev = roundIndex > 0 ? result.rounds[roundIndex - 1] : null;
  const roundNum = round.round;

  // Collect candidate commentary lines with priority
  const candidates: { text: string; color: CommentaryColor; priority: number }[] = [];

  // ---- 1. Strategy switch detection ----
  if (prev) {
    for (const id of ids) {
      const oldStrat = prev.strategies[id];
      const newStrat = round.strategies[id];
      if (oldStrat && newStrat && oldStrat !== newStrat) {
        const tag = playerTag(result, id);
        const templates = [
          `${tag} just switched from ${oldStrat} to ${newStrat} -- a bold move!`,
          `Plot twist! ${tag} abandons ${oldStrat} and pivots to ${newStrat}.`,
          `${tag} shakes things up, moving from ${oldStrat} to ${newStrat}. What prompted this change?`,
          `After playing ${oldStrat}, ${tag} switches gears to ${newStrat}. The pressure is showing!`,
        ];
        candidates.push({
          text: templates[roundIndex % templates.length],
          color: 'yellow',
          priority: 5,
        });
      }
    }
  }

  // ---- 2. Big payoff gap ----
  if (ids.length >= 2) {
    const payoffs = ids.map((id) => ({ id, payoff: round.payoffs[id] ?? 0 }));
    payoffs.sort((a, b) => b.payoff - a.payoff);
    const best = payoffs[0];
    const worst = payoffs[payoffs.length - 1];
    if (worst.payoff > 0 && best.payoff >= 2 * worst.payoff) {
      const templates = [
        `This round was brutal for ${playerTag(result, worst.id)} -- scoring only ${worst.payoff.toFixed(1)} while ${playerTag(result, best.id)} raked in ${best.payoff.toFixed(1)}.`,
        `${playerTag(result, best.id)} dominated this round with ${best.payoff.toFixed(1)} points. ${playerTag(result, worst.id)} managed just ${worst.payoff.toFixed(1)}.`,
        `A lopsided round! ${playerTag(result, best.id)} earns ${best.payoff.toFixed(1)}, leaving ${playerTag(result, worst.id)} in the dust with ${worst.payoff.toFixed(1)}.`,
      ];
      candidates.push({
        text: templates[roundIndex % templates.length],
        color: 'red',
        priority: 4,
      });
    } else if (worst.payoff === 0 && best.payoff > 0) {
      candidates.push({
        text: `Ouch! ${playerTag(result, worst.id)} scores nothing this round while ${playerTag(result, best.id)} picks up ${best.payoff.toFixed(1)}.`,
        color: 'red',
        priority: 4,
      });
    }
  }

  // ---- 3. Lead change ----
  if (prev && ids.length >= 2) {
    const prevLeader = getLeader(prev, ids);
    const currLeader = getLeader(round, ids);
    if (prevLeader && currLeader && prevLeader.id !== currLeader.id) {
      const templates = [
        `The tide is turning -- ${playerTag(result, currLeader.id)} just took the lead from ${playerTag(result, prevLeader.id)}!`,
        `Lead change! ${playerTag(result, currLeader.id)} overtakes ${playerTag(result, prevLeader.id)}. The competition heats up!`,
        `${playerTag(result, currLeader.id)} surges ahead! ${playerTag(result, prevLeader.id)} loses the top spot for the first time in a while.`,
      ];
      candidates.push({
        text: templates[roundIndex % templates.length],
        color: 'red',
        priority: 8,
      });
    }
  }

  // ---- 4. Streak detection ----
  for (const id of ids) {
    const currentStrat = round.strategies[id];
    let streak = 1;
    for (let i = roundIndex - 1; i >= 0; i--) {
      if (result.rounds[i].strategies[id] === currentStrat) {
        streak++;
      } else {
        break;
      }
    }
    if (streak === 5) {
      candidates.push({
        text: `${playerTag(result, id)} has played ${currentStrat} for 5 rounds straight. That's commitment!`,
        color: 'blue',
        priority: 3,
      });
    } else if (streak === 10) {
      candidates.push({
        text: `${playerTag(result, id)} is locked in -- 10 consecutive rounds of ${currentStrat}! Will anyone break the pattern?`,
        color: 'yellow',
        priority: 4,
      });
    }
  }

  // ---- 5. Convergence (all players same strategy for N rounds) ----
  if (ids.length >= 2) {
    const allSameThisRound = ids.every((id) => round.strategies[id] === round.strategies[ids[0]]);
    if (allSameThisRound) {
      let convergenceStreak = 1;
      for (let i = roundIndex - 1; i >= 0; i--) {
        const r = result.rounds[i];
        const allSame = ids.every((id) => r.strategies[id] === round.strategies[ids[0]]);
        if (allSame) convergenceStreak++;
        else break;
      }
      if (convergenceStreak === 3) {
        candidates.push({
          text: `Both players have now settled into ${round.strategies[ids[0]]} for 3 rounds. An equilibrium may be forming!`,
          color: 'green',
          priority: 6,
        });
      } else if (convergenceStreak === 5) {
        candidates.push({
          text: `Five rounds of harmony -- everyone playing ${round.strategies[ids[0]]}. This looks like a stable equilibrium.`,
          color: 'green',
          priority: 7,
        });
      }
    }
  }

  // ---- 6. Comeback detection ----
  if (roundIndex >= 4 && ids.length >= 2) {
    const midpoint = Math.floor(roundIndex / 2);
    const midRound = result.rounds[midpoint];
    if (midRound) {
      const midLeader = getLeader(midRound, ids);
      const currLeader = getLeader(round, ids);
      if (midLeader && currLeader && midLeader.id !== currLeader.id) {
        const midMargin = midLeader.margin;
        if (midMargin > 5) {
          const templates = [
            `What a comeback! ${playerTag(result, currLeader.id)} trailed by ${midMargin.toFixed(1)} points at the midpoint but has now taken the lead!`,
            `Despite trailing by ${midMargin.toFixed(1)} points earlier, ${playerTag(result, currLeader.id)} has clawed back and is now on top!`,
          ];
          candidates.push({
            text: templates[roundIndex % templates.length],
            color: 'green',
            priority: 7,
          });
        }
      }
      // Closing the gap
      if (midLeader && currLeader && midLeader.id === currLeader.id) {
        const currMargin = currLeader.margin;
        if (midLeader.margin > 5 && currMargin < midLeader.margin * 0.4) {
          const trailing = ids.find((id) => id !== currLeader.id) ?? ids[1];
          candidates.push({
            text: `${playerTag(result, trailing)} is mounting a comeback! The gap has shrunk from ${midLeader.margin.toFixed(1)} to just ${currMargin.toFixed(1)}.`,
            color: 'yellow',
            priority: 5,
          });
        }
      }
    }
  }

  // ---- 7. Mutual cooperation / defection patterns ----
  if (ids.length >= 2) {
    const strats = ids.map((id) => (round.strategies[id] ?? '').toLowerCase());
    const allCooperate = strats.every(
      (s) => s.includes('cooperat') || s.includes('collab') || s.includes('share') || s.includes('peace')
    );
    const allDefect = strats.every(
      (s) => s.includes('defect') || s.includes('betray') || s.includes('cheat') || s.includes('compet') || s.includes('aggress')
    );
    if (allCooperate) {
      const templates = [
        `Mutual cooperation this round! Everyone chose to work together. Trust is building.`,
        `A beautiful moment of cooperation -- all players choosing the collaborative path.`,
        `Teamwork makes the dream work! All players cooperated this round.`,
      ];
      candidates.push({
        text: templates[roundIndex % templates.length],
        color: 'green',
        priority: 2,
      });
    }
    if (allDefect) {
      const templates = [
        `Mutual defection! No one is willing to cooperate. A grim standoff.`,
        `Everyone chose to defect. Trust has completely broken down.`,
        `It's a war of all against all -- mutual defection across the board.`,
      ];
      candidates.push({
        text: templates[roundIndex % templates.length],
        color: 'red',
        priority: 3,
      });
    }
  }

  // ---- 8. Early exploration vs late exploitation ----
  const totalRounds = result.rounds.length;
  if (roundIndex === 2) {
    const uniqueStrats = new Set<string>();
    for (let i = 0; i <= roundIndex; i++) {
      for (const id of ids) {
        uniqueStrats.add(`${id}-${result.rounds[i].strategies[id]}`);
      }
    }
    if (uniqueStrats.size > ids.length * 2) {
      candidates.push({
        text: `Early game exploration underway -- players are testing different strategies to find what works.`,
        color: 'blue',
        priority: 2,
      });
    }
  }
  if (roundIndex === totalRounds - 1 && totalRounds > 5) {
    // Final round summary
    const leader = getLeader(round, ids);
    if (leader) {
      candidates.push({
        text: `Final round! ${playerTag(result, leader.id)} finishes on top with a margin of ${leader.margin.toFixed(1)} points. What a game!`,
        color: 'green',
        priority: 9,
      });
    }
  }
  if (totalRounds > 10 && roundIndex === Math.floor(totalRounds * 0.75)) {
    candidates.push({
      text: `We're entering the late game now. Strategies should be crystallizing as players exploit what they've learned.`,
      color: 'blue',
      priority: 2,
    });
  }

  // ---- 9. Opening round ----
  if (roundIndex === 0) {
    const stratList = ids.map((id) => `${playerTag(result, id)} opens with ${round.strategies[id]}`);
    candidates.push({
      text: `And we're off! ${stratList.join(', and ')}. Let the games begin!`,
      color: 'blue',
      priority: 10,
    });
  }

  // ---- 10. Tied game ----
  if (ids.length >= 2 && roundIndex > 0) {
    const cumPayoffs = ids.map((id) => round.cumulativePayoffs[id] ?? 0);
    const allTied = cumPayoffs.every((p) => Math.abs(p - cumPayoffs[0]) < 0.01);
    if (allTied && cumPayoffs[0] > 0) {
      candidates.push({
        text: `Dead heat! Both players are perfectly tied at ${cumPayoffs[0].toFixed(1)} points. Every round matters now.`,
        color: 'yellow',
        priority: 6,
      });
    }
  }

  // ---- 11. Convergence detected (from simulation result) ----
  if (
    result.convergence.converged &&
    result.convergence.equilibriumRound !== null &&
    roundIndex === result.convergence.equilibriumRound - 1
  ) {
    candidates.push({
      text: `Equilibrium reached! The strategies have converged. Game theory in action -- this is a Nash equilibrium forming before our eyes.`,
      color: 'green',
      priority: 9,
    });
  }

  // Pick highest priority candidate
  if (candidates.length === 0) {
    // Fallback: generic round summary
    const leader = getLeader(round, ids);
    if (leader && roundIndex > 0) {
      const leaderPayoff = (round.cumulativePayoffs[leader.id] ?? 0).toFixed(1);
      const stratInfo = ids
        .map((id) => `${playerEmoji(result, id)} ${round.strategies[id]}`)
        .join(' vs ');
      return {
        round: roundNum,
        text: `${stratInfo}. ${playerName(result, leader.id)} leads with ${leaderPayoff} total.`,
        color: 'blue',
      };
    }
    return null;
  }

  candidates.sort((a, b) => b.priority - a.priority);
  return {
    round: roundNum,
    text: candidates[0].text,
    color: candidates[0].color,
  };
}

// ---------------------------------------------------------------------------
// Color indicator map
// ---------------------------------------------------------------------------

const COLOR_MAP: Record<CommentaryColor, { bg: string; border: string; glow: string }> = {
  green: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', glow: 'shadow-emerald-500/20' },
  red: { bg: 'bg-red-500/20', border: 'border-red-500/40', glow: 'shadow-red-500/20' },
  yellow: { bg: 'bg-amber-400/20', border: 'border-amber-400/40', glow: 'shadow-amber-400/20' },
  blue: { bg: 'bg-blue-400/20', border: 'border-blue-400/40', glow: 'shadow-blue-400/20' },
};

const DOT_COLOR: Record<CommentaryColor, string> = {
  green: 'bg-emerald-400',
  red: 'bg-red-400',
  yellow: 'bg-amber-400',
  blue: 'bg-blue-400',
};

// ---------------------------------------------------------------------------
// Broadcast Icon (SVG microphone)
// ---------------------------------------------------------------------------

function BroadcastIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Microphone body */}
      <rect x="9" y="2" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.8" />
      {/* Stand arc */}
      <path
        d="M5 11c0 3.87 3.13 7 7 7s7-3.13 7-7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Stand */}
      <path d="M12 18v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 21h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* Sound waves */}
      <path
        d="M19 5c1 1.5 1.5 3.5 1.5 6s-.5 4.5-1.5 6"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.5"
      />
      <path
        d="M5 5c-1 1.5-1.5 3.5-1.5 6s.5 4.5 1.5 6"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RoundCommentary({ result, currentRound }: RoundCommentaryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Generate commentary for all rounds up to currentRound
  const entries = useMemo(() => {
    const out: CommentaryEntry[] = [];
    const limit = Math.min(currentRound, result.rounds.length);
    for (let i = 0; i < limit; i++) {
      const entry = generateCommentary(result, i);
      if (entry) out.push(entry);
    }
    return out;
  }, [result, currentRound]);

  // Auto-scroll to bottom when new entries appear
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, [entries.length]);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#25253e] bg-[#1a1a2e]/80 backdrop-blur-sm p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-purple-400">
          <BroadcastIcon size={20} />
        </span>
        <h3 className="text-sm font-bold text-white/90 tracking-wide uppercase">
          Live Commentary
        </h3>
        <span className="ml-auto text-[10px] font-mono text-white/30">
          Round {currentRound}/{result.rounds.length}
        </span>
      </div>

      {/* Scrollable log */}
      <div
        ref={scrollRef}
        className="max-h-[300px] overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
      >
        <AnimatePresence initial={false}>
          {entries.map((entry, idx) => {
            const isRecent = idx >= entries.length - 3;
            const colors = COLOR_MAP[entry.color];
            const dot = DOT_COLOR[entry.color];

            return (
              <motion.div
                key={`round-${entry.round}`}
                initial={{ opacity: 0, x: -30 }}
                animate={{
                  opacity: isRecent ? 1 : 0.5,
                  x: 0,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 25,
                  opacity: { duration: 0.3 },
                }}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-xl transition-opacity duration-300 ${
                  isRecent ? `${colors.bg} border ${colors.border}` : 'bg-transparent'
                }`}
              >
                {/* Round number badge */}
                <div className="flex-shrink-0 mt-0.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isRecent
                        ? 'bg-white/10 text-white/90 shadow-md ' + colors.glow
                        : 'bg-white/5 text-white/40'
                    }`}
                  >
                    {entry.round}
                  </div>
                </div>

                {/* Commentary text */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs leading-relaxed ${
                      isRecent ? 'text-white/85' : 'text-white/40'
                    }`}
                  >
                    {entry.text}
                  </p>
                </div>

                {/* Color indicator dot */}
                <div className="flex-shrink-0 mt-1.5">
                  <div
                    className={`w-2 h-2 rounded-full ${dot} ${
                      isRecent ? 'opacity-80' : 'opacity-30'
                    }`}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
