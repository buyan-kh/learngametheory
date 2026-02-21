'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StrategyExplanation {
  name: string;
  shortDescription: string;
  howItWorks: string[];
  strengths: string[];
  weaknesses: string[];
  bestAgainst: string[];
  worstAgainst: string[];
  realWorldExample: string;
  famousGame: string;
  difficulty: 1 | 2 | 3;
  category: 'reactive' | 'historical' | 'random' | 'evolutionary' | 'optimal';
  color: string;
  icon: string;
}

interface StrategyExplainerProps {
  strategy: string;
  isOpen: boolean;
  onClose: () => void;
}

interface StrategyExplainerButtonProps {
  strategy: string;
}

// ---------------------------------------------------------------------------
// Strategy Data
// ---------------------------------------------------------------------------

export const STRATEGY_EXPLANATIONS: Record<string, StrategyExplanation> = {
  'tit-for-tat': {
    name: 'Tit-for-Tat',
    shortDescription: "Start nice, then copy what they did.",
    howItWorks: [
      'On the very first round, always cooperate — give the other player the benefit of the doubt.',
      "From round two onward, look at what the opponent did last round and do exactly that.",
      'If they cooperated, you cooperate. If they defected, you defect.',
      "This creates a mirror effect: good behavior is rewarded, bad behavior is punished immediately.",
    ],
    strengths: [
      'Extremely simple to understand and implement — no complex calculations needed.',
      'Encourages mutual cooperation: nice opponents are rewarded with ongoing cooperation.',
      'Quick to punish betrayal, which deters exploitation.',
    ],
    weaknesses: [
      'Can get stuck in retaliation loops — one defection leads to endless back-and-forth punishment.',
      'Vulnerable to noise: a single random mistake can spiral into prolonged conflict.',
      'Cannot forgive — once the opponent defects, it takes them cooperating first to break the cycle.',
    ],
    bestAgainst: ['adaptive', 'fictitious-play'],
    worstAgainst: ['random', 'greedy'],
    realWorldExample: 'Like a friend who treats you how you treat them. Be kind, and they are kind back. Be rude once, and they will be rude to you — until you make the first move to be nice again.',
    famousGame: "Prisoner's Dilemma — famously won Robert Axelrod's 1980 tournament against far more complex strategies.",
    difficulty: 1,
    category: 'reactive',
    color: '#6c5ce7',
    icon: 'mirror',
  },
  'random': {
    name: 'Random',
    shortDescription: 'Flip a coin every time.',
    howItWorks: [
      'Each round, look at all available strategies.',
      'Pick one completely at random with equal probability — no thinking, no memory.',
      'The choice is independent of what happened in any previous round.',
      "Repeat. There is no learning, no pattern, no plan.",
    ],
    strengths: [
      'Completely unpredictable — opponents cannot anticipate or exploit your moves.',
      'Useful as a baseline: any "smart" strategy should outperform random play over time.',
    ],
    weaknesses: [
      "Cannot exploit any patterns in opponent behavior — it doesn't even look.",
      "Performance is mediocre on average: you'll sometimes get lucky, but you can never systematically win.",
      'No ability to build cooperative relationships since moves are incoherent.',
    ],
    bestAgainst: ['tit-for-tat'],
    worstAgainst: ['best-response', 'fictitious-play'],
    realWorldExample: 'Like a tourist randomly picking restaurants in a new city. You might stumble onto a hidden gem, but you could just as easily walk into the worst place on the block.',
    famousGame: 'Used as a baseline comparison in virtually every game theory experiment. Also models "trembling hand" mistakes in formal game theory.',
    difficulty: 1,
    category: 'random',
    color: '#ffd43b',
    icon: 'dice',
  },
  'greedy': {
    name: 'Greedy',
    shortDescription: 'Always pick what worked best last time.',
    howItWorks: [
      'Play a random strategy on the very first round (no history yet).',
      'After each round, check which strategy gave you the highest payoff last time.',
      'Pick that best-performing strategy for the next round.',
      "If multiple strategies tied, pick among them. Never look further back than one round.",
    ],
    strengths: [
      'Quick to exploit a winning move — if something works, you keep doing it.',
      'Very low computational overhead: only needs to remember the last round.',
      'Strong in stable environments where the best move does not change often.',
    ],
    weaknesses: [
      'Extremely short-sighted: ignores all history beyond the last round.',
      'Easily trapped in local optima — a move that was good once might be terrible long-term.',
      'Predictable after a few rounds: opponents can anticipate and counter you.',
    ],
    bestAgainst: ['random'],
    worstAgainst: ['adaptive', 'best-response'],
    realWorldExample: 'Like a stock trader who keeps buying yesterday\'s winner. It works great in a bull market, but when conditions change, you are the last one to notice.',
    famousGame: "Common in one-shot games and auctions where players have limited information. Appears in many behavioral economics experiments on 'satisficing.'",
    difficulty: 1,
    category: 'reactive',
    color: '#e17055',
    icon: 'trophy',
  },
  'adaptive': {
    name: 'Adaptive',
    shortDescription: 'Try things, then lean toward what pays off.',
    howItWorks: [
      'Start by trying strategies roughly equally — explore the landscape.',
      'Track cumulative payoffs for each strategy over all rounds played.',
      'Weight future choices toward strategies that have historically paid off more.',
      'The learning rate controls how quickly you shift: high rate means fast adaptation, low rate means slow and cautious.',
      'This creates a natural explore-exploit balance that improves over time.',
    ],
    strengths: [
      'Balances exploration (trying new things) and exploitation (sticking with winners).',
      'Adapts to changing opponent behavior over time — not locked into one approach.',
      'Robust in complex, multi-player games where the best strategy is not obvious.',
    ],
    weaknesses: [
      'Slower to converge than simpler strategies — needs many rounds to figure out what works.',
      'Can be outpaced by fast-reacting strategies like best-response in short games.',
      'The learning rate parameter needs tuning; bad settings lead to poor performance.',
    ],
    bestAgainst: ['greedy', 'random'],
    worstAgainst: ['best-response', 'replicator-dynamics'],
    realWorldExample: 'Like a chef who experiments with recipes and refines favorites. Early on you try wild combinations, but over months you develop a menu of proven dishes — while still occasionally trying something new.',
    famousGame: 'Central to multi-armed bandit problems in machine learning and A/B testing. Models how people learn in repeated economic games.',
    difficulty: 2,
    category: 'historical',
    color: '#00b894',
    icon: 'scale',
  },
  'mixed': {
    name: 'Mixed',
    shortDescription: 'Everyone uses a different approach.',
    howItWorks: [
      'Assign a different algorithm to each player in the game (e.g., Player 1 uses Tit-for-Tat, Player 2 uses Greedy, Player 3 uses Adaptive).',
      'Each player follows their assigned algorithm independently every round.',
      'The combination creates emergent dynamics that no single strategy alone would produce.',
      'This simulates a realistic population where people think differently.',
    ],
    strengths: [
      'Models realistic scenarios: in the real world, not everyone uses the same strategy.',
      'Reveals how different approaches interact, creating richer and more interesting dynamics.',
      'Useful for testing whether a strategy is robust against diverse opponents.',
    ],
    weaknesses: [
      'Results depend heavily on which algorithms are assigned — different mixes give different outcomes.',
      'Harder to draw conclusions about any single strategy since behavior is a composite.',
      'Can be chaotic: with many different strategies interacting, patterns are less clear.',
    ],
    bestAgainst: ['greedy', 'random'],
    worstAgainst: ['best-response', 'fictitious-play'],
    realWorldExample: 'Like a company where each department has its own decision-making style. Marketing is aggressive, Engineering is cautious, Sales is adaptive. The company behavior is the composite of all these different approaches.',
    famousGame: 'Used in evolutionary game theory population models and agent-based simulations. Central to studying ecosystem dynamics and market competition.',
    difficulty: 2,
    category: 'historical',
    color: '#e84393',
    icon: 'people',
  },
  'best-response': {
    name: 'Best Response',
    shortDescription: 'Calculate the optimal counter-move.',
    howItWorks: [
      "Look at what every opponent did last round.",
      "For each of your available strategies, calculate the payoff you would get given those opponent moves.",
      "Pick the strategy with the highest expected payoff — the mathematically optimal counter-move.",
      "On the first round (no history), pick the strategy with the highest average payoff across all opponent possibilities.",
    ],
    strengths: [
      'Mathematically optimal given the information available — you always make the best move possible.',
      'Strong in simple, well-defined games where the payoff matrix is clear.',
      'Converges quickly to Nash equilibrium in many classical games.',
    ],
    weaknesses: [
      'Only reacts to the last round — can be slow to adapt if opponents change strategies gradually.',
      'Requires knowledge of the full payoff matrix, which is not always available in real life.',
      'Can oscillate forever in some games, never settling on a stable outcome.',
    ],
    bestAgainst: ['random', 'greedy', 'tit-for-tat'],
    worstAgainst: ['fictitious-play', 'replicator-dynamics'],
    realWorldExample: 'Like a chess player who calculates the best response to every move. You always play optimally given what your opponent just did — but you are not thinking about what they might do next.',
    famousGame: "The foundational concept in Nash Equilibrium theory. Every Nash equilibrium is a set of mutual best responses. Core to John Nash's 1950 work that won the Nobel Prize.",
    difficulty: 3,
    category: 'optimal',
    color: '#0984e3',
    icon: 'target',
  },
  'fictitious-play': {
    name: 'Fictitious Play',
    shortDescription: "Track everything they've ever done, respond to the pattern.",
    howItWorks: [
      "Keep a running count of how many times each opponent has played each strategy across all rounds.",
      "Convert these counts into frequency distributions — like building a probability profile of each opponent.",
      "Calculate your expected payoff for each of your strategies against those frequency distributions.",
      "Pick the strategy with the highest expected payoff against the opponents' historical patterns.",
      "As more rounds are played, your model of the opponents becomes increasingly accurate.",
    ],
    strengths: [
      'Uses all available history, not just the last round — builds a comprehensive opponent model.',
      'Proven to converge to Nash equilibrium in many important game classes.',
      'Robust against opponents who use consistent or slowly-changing strategies.',
    ],
    weaknesses: [
      'Slow to respond to sudden strategy changes — old history dilutes new signals.',
      'Computationally more expensive than simpler strategies as history grows.',
      'Assumes opponents have a fixed (or slowly changing) mixed strategy, which is not always true.',
    ],
    bestAgainst: ['tit-for-tat', 'greedy', 'adaptive'],
    worstAgainst: ['random', 'replicator-dynamics'],
    realWorldExample: 'Like a poker player who memorizes every hand you have ever played. They know you bluff 30% of the time, fold to big raises 60% of the time, and they use all of that to calculate the perfect counter-strategy.',
    famousGame: "Invented by George W. Brown in 1951 for solving zero-sum games. One of the earliest algorithms in computational game theory. Foundational for modern AI game-playing systems.",
    difficulty: 3,
    category: 'historical',
    color: '#00cec9',
    icon: 'brain',
  },
  'replicator-dynamics': {
    name: 'Replicator Dynamics',
    shortDescription: 'Successful strategies grow, failing ones shrink.',
    howItWorks: [
      "Start with a probability distribution over all available strategies (initially equal weights).",
      "Each round, select a strategy according to the current probability distribution.",
      "After the round, compare each strategy's payoff to the average payoff across all strategies.",
      "Strategies that performed above average get increased probability; below-average ones shrink.",
      "Over many rounds, the distribution evolves: winning strategies dominate, losers go extinct.",
    ],
    strengths: [
      'Models natural selection mathematically — the most elegant evolutionary approach.',
      'Does not require knowledge of the payoff matrix; only observed payoffs matter.',
      'Can find evolutionarily stable strategies that are robust against invasion by mutants.',
    ],
    weaknesses: [
      'Can converge to suboptimal outcomes if the initial distribution is unlucky.',
      'Slow to adapt: probability changes are gradual, so convergence takes many rounds.',
      'May eliminate strategies that are occasionally useful, reducing long-term flexibility.',
    ],
    bestAgainst: ['adaptive', 'mixed', 'greedy'],
    worstAgainst: ['best-response', 'fictitious-play'],
    realWorldExample: 'Like species evolution — successful traits spread through the population while unsuccessful ones die out. Resistance to antibiotics spreading in bacteria is replicator dynamics in action.',
    famousGame: "Central to evolutionary game theory, developed by Taylor and Jonker (1978). Models biological evolution, cultural transmission, and the spread of social norms. Famous for analyzing the Hawk-Dove game.",
    difficulty: 3,
    category: 'evolutionary',
    color: '#a29bfe',
    icon: 'dna',
  },
};

// ---------------------------------------------------------------------------
// Category & Difficulty Helpers
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<StrategyExplanation['category'], string> = {
  reactive: 'Reactive',
  historical: 'Historical',
  random: 'Random',
  evolutionary: 'Evolutionary',
  optimal: 'Optimal',
};

const CATEGORY_COLORS: Record<StrategyExplanation['category'], string> = {
  reactive: '#ffd43b',
  historical: '#74b9ff',
  random: '#fdcb6e',
  evolutionary: '#a29bfe',
  optimal: '#55efc4',
};

// ---------------------------------------------------------------------------
// SVG Icons for the component
// ---------------------------------------------------------------------------

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#51cf66" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XMarkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function StepIcon({ step }: { step: number }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="11" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <text x="12" y="16" textAnchor="middle" fill="currentColor" fontSize="12" fontWeight="bold">
        {step}
      </text>
    </svg>
  );
}

function UpArrowIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#51cf66" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function DownArrowIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" opacity="0.2">
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
    </svg>
  );
}

function BookSmallIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

// Strategy-specific header icons
function StrategyHeaderIcon({ icon, color }: { icon: string; color: string }) {
  const props = { width: 32, height: 32, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (icon) {
    case 'mirror':
      return (
        <svg {...props}>
          <path d="M12 3v18" strokeDasharray="2 2" opacity="0.4" />
          <path d="M7 8c-1 1-1 3 0 4s3 1 4 0" />
          <path d="M17 8c1 1 1 3 0 4s-3 1-4 0" />
          <circle cx="8" cy="7" r="1.5" fill={color} fillOpacity="0.3" />
          <circle cx="16" cy="7" r="1.5" fill={color} fillOpacity="0.3" />
        </svg>
      );
    case 'dice':
      return (
        <svg {...props}>
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="8" cy="8" r="1.2" fill={color} />
          <circle cx="12" cy="12" r="1.2" fill={color} />
          <circle cx="16" cy="16" r="1.2" fill={color} />
          <circle cx="16" cy="8" r="1.2" fill={color} />
          <circle cx="8" cy="16" r="1.2" fill={color} />
        </svg>
      );
    case 'trophy':
      return (
        <svg {...props}>
          <path d="M7 4h10v5c0 3-2 5-5 5s-5-2-5-5V4z" />
          <path d="M7 6c-2 0-3 1-3 3s1 3 3 3" />
          <path d="M17 6c2 0 3 1 3 3s-1 3-3 3" />
          <path d="M12 14v3" />
          <path d="M9 19h6" />
        </svg>
      );
    case 'scale':
      return (
        <svg {...props}>
          <path d="M12 3v18" />
          <path d="M4 7h16" />
          <path d="M4 7l3 7H1l3-7z" fill={color} fillOpacity="0.15" />
          <path d="M20 7l3 7h-6l3-7z" fill={color} fillOpacity="0.15" />
          <path d="M10 21h4" />
        </svg>
      );
    case 'people':
      return (
        <svg {...props}>
          <circle cx="8" cy="7" r="2.5" />
          <path d="M3 19c0-3 2.2-5 5-5s5 2 5 5" />
          <circle cx="16" cy="8" r="2" />
          <path d="M13 19c0-2.5 1.5-4 3-4s3 1.5 3 4" />
        </svg>
      );
    case 'target':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5.5" />
          <circle cx="12" cy="12" r="2" fill={color} />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" opacity="0.4" />
        </svg>
      );
    case 'brain':
      return (
        <svg {...props}>
          <path d="M12 4c-2 0-4 1-5 3s-1 4 0 6c.5 1 1 2 1.5 2.5L10 20h4l1.5-4.5c.5-.5 1-1.5 1.5-2.5 1-2 1-4 0-6s-3-3-5-3z" />
          <path d="M12 5v4" strokeWidth="1.2" />
          <path d="M9 8c1 1 2 1 3 0" strokeWidth="1.2" />
          <path d="M12 9c1 1 2 1 3 0" strokeWidth="1.2" />
        </svg>
      );
    case 'dna':
      return (
        <svg {...props}>
          <path d="M7 4c0 3 2 5 5 5s5 2 5 5-2 5-5 5-5 2-5 5" />
          <path d="M17 4c0 3-2 5-5 5s-5 2-5 5 2 5 5 5 5 2 5 5" />
          <path d="M7 9h10" opacity="0.4" />
          <path d="M7 15h10" opacity="0.4" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

// ---------------------------------------------------------------------------
// Difficulty Dots
// ---------------------------------------------------------------------------

function DifficultyDots({ level, color }: { level: 1 | 2 | 3; color: string }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map((dot) => (
        <div
          key={dot}
          className="w-2 h-2 rounded-full transition-colors"
          style={{
            backgroundColor: dot <= level ? color : '#25253e',
            boxShadow: dot <= level ? `0 0 4px ${color}40` : 'none',
          }}
        />
      ))}
      <span className="text-[9px] ml-1 opacity-50 uppercase tracking-wider">
        {level === 1 ? 'Easy' : level === 2 ? 'Medium' : 'Hard'}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Matchup Badge
// ---------------------------------------------------------------------------

function MatchupBadge({ strategy, type }: { strategy: string; type: 'best' | 'worst' }) {
  const explanation = STRATEGY_EXPLANATIONS[strategy];
  if (!explanation) return null;

  const color = type === 'best' ? '#51cf66' : '#ff6b6b';

  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
      style={{
        backgroundColor: color + '15',
        color,
        border: `1px solid ${color}25`,
      }}
    >
      {type === 'best' ? <UpArrowIcon /> : <DownArrowIcon />}
      {explanation.name}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Component: StrategyExplainer
// ---------------------------------------------------------------------------

export function StrategyExplainer({ strategy, isOpen, onClose }: StrategyExplainerProps) {
  const explanation = STRATEGY_EXPLANATIONS[strategy];

  if (!explanation) return null;

  const { name, shortDescription, howItWorks, strengths, weaknesses, bestAgainst, worstAgainst, realWorldExample, famousGame, difficulty, category, color, icon } = explanation;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel — slides in from the right */}
          <motion.div
            className="fixed top-0 right-0 z-50 h-full w-full max-w-lg overflow-y-auto"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="min-h-full bg-[#0d0d20]/95 backdrop-blur-lg border-l border-[#25253e] p-6 pb-12">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[#25253e] transition-colors opacity-60 hover:opacity-100"
              >
                <CloseIcon />
              </button>

              {/* Header */}
              <motion.div
                className="mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-start gap-4 mb-3">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: color + '15', border: `1px solid ${color}30` }}
                  >
                    <StrategyHeaderIcon icon={icon} color={color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold mb-1" style={{ color }}>{name}</h2>
                    <p className="text-sm opacity-70">{shortDescription}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className="text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: CATEGORY_COLORS[category] + '15',
                      color: CATEGORY_COLORS[category],
                      border: `1px solid ${CATEGORY_COLORS[category]}30`,
                    }}
                  >
                    {CATEGORY_LABELS[category]}
                  </span>
                  <DifficultyDots level={difficulty} color={color} />
                </div>
              </motion.div>

              {/* Divider */}
              <div className="h-px bg-[#25253e] mb-6" />

              {/* How It Works */}
              <motion.div
                className="mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3 opacity-50">How It Works</h3>
                <div className="space-y-3">
                  {howItWorks.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5" style={{ color }}>
                        <StepIcon step={i + 1} />
                      </div>
                      <p className="text-sm leading-relaxed opacity-80">{step}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Divider */}
              <div className="h-px bg-[#25253e] mb-6" />

              {/* Strengths & Weaknesses */}
              <motion.div
                className="mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3 opacity-50">Strengths & Weaknesses</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Strengths */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#51cf66]">Strengths</div>
                    {strengths.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="flex-shrink-0 mt-0.5"><CheckIcon /></div>
                        <p className="text-xs leading-relaxed opacity-75">{item}</p>
                      </div>
                    ))}
                  </div>

                  {/* Weaknesses */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#ff6b6b]">Weaknesses</div>
                    {weaknesses.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="flex-shrink-0 mt-0.5"><XMarkIcon /></div>
                        <p className="text-xs leading-relaxed opacity-75">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* Divider */}
              <div className="h-px bg-[#25253e] mb-6" />

              {/* Best / Worst Matchups */}
              <motion.div
                className="mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3 opacity-50">Matchups</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#51cf66] mb-2">Strong Against</div>
                    <div className="flex flex-wrap gap-1.5">
                      {bestAgainst.map((s) => (
                        <MatchupBadge key={s} strategy={s} type="best" />
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#ff6b6b] mb-2">Weak Against</div>
                    <div className="flex flex-wrap gap-1.5">
                      {worstAgainst.map((s) => (
                        <MatchupBadge key={s} strategy={s} type="worst" />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Divider */}
              <div className="h-px bg-[#25253e] mb-6" />

              {/* Real World Example */}
              <motion.div
                className="mb-6"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3 opacity-50">Real World Analogy</h3>
                <div
                  className="p-4 rounded-xl relative"
                  style={{
                    backgroundColor: color + '08',
                    border: `1px solid ${color}20`,
                  }}
                >
                  <div className="absolute top-3 left-3" style={{ color }}>
                    <QuoteIcon />
                  </div>
                  <p className="text-sm leading-relaxed opacity-85 pl-6 pt-1">{realWorldExample}</p>
                </div>
              </motion.div>

              {/* Famous Game */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <h3 className="text-xs font-bold uppercase tracking-wider mb-3 opacity-50">In the Literature</h3>
                <div className="flex items-start gap-2 p-3 rounded-xl bg-[#1a1a2e]/50 border border-[#25253e]">
                  <div className="flex-shrink-0 mt-0.5 opacity-50">
                    <BookSmallIcon />
                  </div>
                  <p className="text-xs leading-relaxed opacity-70">{famousGame}</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// StrategyExplainerButton — self-contained button that opens the explainer
// ---------------------------------------------------------------------------

export function StrategyExplainerButton({ strategy }: StrategyExplainerButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const explanation = STRATEGY_EXPLANATIONS[strategy];
  if (!explanation) return null;

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full transition-all hover:scale-110"
        style={{
          backgroundColor: explanation.color + '15',
          color: explanation.color,
          border: `1px solid ${explanation.color}30`,
        }}
        title={`Learn about ${explanation.name}`}
      >
        <QuestionIcon />
      </button>
      <StrategyExplainer
        strategy={strategy}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
