'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import Header from '@/components/Header';
import AuthModal from '@/components/AuthModal';
import ScenarioInput from '@/components/ScenarioInput';
import AnalysisView from '@/components/AnalysisView';
import LoadingAnimation from '@/components/LoadingAnimation';
import SavedScenarios, { SaveButton } from '@/components/SavedScenarios';
import SimulationView from '@/components/SimulationView';
import ComparisonView from '@/components/ComparisonView';

function PixelDecor({ x, y, color, delay }: { x: string; y: string; color: string; delay: number }) {
  return (
    <motion.div
      className="absolute w-2 h-2 pixel-art opacity-20"
      style={{ left: x, top: y, backgroundColor: color }}
      animate={{ y: [0, -10, 0], opacity: [0.1, 0.3, 0.1] }}
      transition={{ duration: 4, repeat: Infinity, delay, ease: 'easeInOut' }}
    />
  );
}

function AnalyzeMode() {
  const { analysis, isAnalyzing, error, setError } = useStore();

  return (
    <>
      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="max-w-3xl mx-auto mb-6 p-3 rounded-xl border border-[#ff6b6b30] bg-[#ff6b6b08] flex items-center justify-between"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <span className="text-xs text-[#ff6b6b]">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-[#ff6b6b] hover:text-white text-xs ml-4"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <AnimatePresence mode="wait">
        {!analysis && !isAnalyzing && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ScenarioInput />

            {/* Feature callouts */}
            <div className="max-w-3xl mx-auto mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { icon: '👥', title: 'Identify Players', desc: 'See who is involved as pixel characters you can drag around' },
                { icon: '📊', title: 'Payoff Matrix', desc: 'Visual payoff matrix with Nash equilibrium analysis' },
                { icon: '🧠', title: 'Strategy Guide', desc: 'Get strategy recommendations and outcome predictions' },
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  className="p-4 rounded-xl border border-[#25253e] bg-[#1a1a2e]/30"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                >
                  <span className="text-2xl">{feature.icon}</span>
                  <h3 className="text-xs font-bold mt-2 text-[#a29bfe]">{feature.title}</h3>
                  <p className="text-[10px] opacity-50 mt-1">{feature.desc}</p>
                </motion.div>
              ))}
            </div>

            <motion.p
              className="text-center text-[10px] opacity-20 mt-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.2 }}
              transition={{ delay: 0.8 }}
            >
              Press Cmd/Ctrl + Enter to analyze
            </motion.p>
          </motion.div>
        )}

        {isAnalyzing && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LoadingAnimation />
          </motion.div>
        )}

        {analysis && !isAnalyzing && (
          <motion.div
            key="analysis"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="mb-8">
              <div className="flex items-center gap-3 max-w-3xl mx-auto">
                <div className="flex-1">
                  <ScenarioInput />
                </div>
                <SaveButton />
              </div>
            </div>
            <AnalysisView />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function Home() {
  const { appMode, showAuthModal } = useStore();

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none">
        <PixelDecor x="10%" y="20%" color="#6c5ce7" delay={0} />
        <PixelDecor x="80%" y="15%" color="#00b894" delay={0.5} />
        <PixelDecor x="20%" y="70%" color="#e17055" delay={1} />
        <PixelDecor x="90%" y="60%" color="#0984e3" delay={1.5} />
        <PixelDecor x="50%" y="85%" color="#ffd43b" delay={2} />
        <PixelDecor x="5%" y="50%" color="#a29bfe" delay={2.5} />
        <PixelDecor x="70%" y="40%" color="#ff7675" delay={3} />
        <PixelDecor x="40%" y="10%" color="#00cec9" delay={3.5} />
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#6c5ce7] rounded-full opacity-[0.03] blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#00b894] rounded-full opacity-[0.03] blur-3xl" />
      </div>

      {/* Header */}
      <Header />

      {/* Auth Modal */}
      {showAuthModal && <AuthModal />}

      {/* Saved Scenarios Panel */}
      <SavedScenarios />

      <div className="relative z-10 px-6 py-8">
        {/* Mode content */}
        <AnimatePresence mode="wait">
          {appMode === 'analyze' && (
            <motion.div
              key="analyze"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <AnalyzeMode />
            </motion.div>
          )}

          {appMode === 'simulate' && (
            <motion.div
              key="simulate"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <SimulationView />
            </motion.div>
          )}

          {appMode === 'compare' && (
            <motion.div
              key="compare"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <ComparisonView />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
