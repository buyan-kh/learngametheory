'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import { getUserScenarios, deleteScenario } from '@/lib/supabase-db';
import { Scenario } from '@/lib/types';
import { useStore } from '@/lib/store';
import Header from '@/components/Header';
import PixelCharacter from '@/components/PixelCharacter';

export default function HistoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { setAnalysis, setInput, setAppMode, addComparisonScenario } = useStore();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      const data = await getUserScenarios(user.id);
      if (!cancelled) {
        setScenarios(data);
        setLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [user]);

  const handleLoad = useCallback(
    (s: Scenario) => {
      setAnalysis(s.analysis);
      setInput(s.input);
      setAppMode('analyze');
      router.push('/');
    },
    [setAnalysis, setInput, setAppMode, router]
  );

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    const ok = await deleteScenario(id);
    if (ok) {
      setScenarios((prev) => prev.filter((s) => s.id !== id));
    }
    setDeletingId(null);
  }, []);

  const handleCompare = useCallback(
    (s: Scenario) => {
      addComparisonScenario(s.analysis);
      setAppMode('compare');
      router.push('/');
    },
    [addComparisonScenario, setAppMode, router]
  );

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#6c5ce7] rounded-full opacity-[0.03] blur-3xl" />
      </div>

      <Header />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span>📂</span> Analysis History
            </h1>
            <p className="text-xs opacity-40 mt-1">
              Your saved game theory analyses
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-xs px-4 py-2 rounded-xl border border-[#25253e] hover:border-[#6c5ce7] text-[#a29bfe] transition-all"
          >
            Back to Lab
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <motion.div
              className="w-8 h-8 rounded-full border-2 border-[#6c5ce7] border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
            <span className="text-xs opacity-40">Loading your scenarios...</span>
          </div>
        ) : scenarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <span className="text-5xl opacity-30">📭</span>
            <p className="text-sm opacity-40">No saved scenarios yet.</p>
            <button
              onClick={() => router.push('/')}
              className="text-xs px-4 py-2 rounded-xl bg-[#6c5ce7] hover:bg-[#5a4bd6] text-white font-medium transition-colors"
            >
              Analyze Your First Scenario
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {scenarios.map((scenario, i) => (
                <motion.div
                  key={scenario.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05 }}
                  className="group relative rounded-xl border border-[#25253e] bg-[#1a1a2e]/50 hover:border-[#6c5ce7]/40 p-4 cursor-pointer transition-all"
                  onClick={() => handleLoad(scenario)}
                >
                  {/* Mini pixel characters */}
                  <div className="flex gap-1.5 mb-3">
                    {scenario.analysis.players.slice(0, 4).map((player) => (
                      <PixelCharacter
                        key={player.id}
                        player={player}
                        size={3}
                        animate={false}
                      />
                    ))}
                    {scenario.analysis.players.length > 4 && (
                      <span className="text-[10px] opacity-30 self-end">
                        +{scenario.analysis.players.length - 4}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-bold truncate pr-8">
                    {scenario.analysis.title}
                  </h3>

                  {/* Game type + date */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-[#6c5ce740] bg-[#6c5ce710] text-[#a29bfe]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6c5ce7]" />
                      {scenario.analysis.gameType}
                    </span>
                    <span className="text-[10px] opacity-30">
                      {formatDate(scenario.created_at)}
                    </span>
                  </div>

                  {/* Input preview */}
                  <p className="text-[11px] opacity-40 mt-2 leading-relaxed line-clamp-2">
                    {scenario.input}
                  </p>

                  {/* Stats row */}
                  <div className="flex items-center gap-3 mt-3 text-[10px] opacity-30">
                    <span>{scenario.analysis.players.length} players</span>
                    <span>{scenario.analysis.outcomes.length} outcomes</span>
                    <span>{scenario.analysis.strategies.length} strategies</span>
                  </div>

                  {/* Action buttons */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCompare(scenario);
                      }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-xs hover:bg-[#25253e] transition-colors"
                      title="Compare"
                    >
                      &#x2696;&#xFE0F;
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(scenario.id);
                      }}
                      disabled={deletingId === scenario.id}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-xs hover:bg-[#ff6b6b20] text-[#ff6b6b] transition-colors disabled:opacity-30"
                      title="Delete"
                    >
                      {deletingId === scenario.id ? (
                        <motion.span
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
                        >
                          &#x23F3;
                        </motion.span>
                      ) : (
                        '&#x1F5D1;&#xFE0F;'
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  );
}
