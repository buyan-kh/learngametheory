'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import { getUserScenarios, deleteScenario } from '@/lib/supabase-db';
import { Scenario, GameAnalysis } from '@/lib/types';
import { useStore } from '@/lib/store';
import Header from '@/components/Header';
import PixelCharacter from '@/components/PixelCharacter';
import { OpenFolderIcon, EmptyBoxIcon, ScalesIcon, TrashIcon } from '@/components/icons';

export default function HistoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { setAnalysis, setInput, setAppMode, addComparisonScenario, analysisHistory } = useStore();
  const [savedScenarios, setSavedScenarios] = useState<Scenario[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch Supabase-saved scenarios when signed in
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchSaved = async () => {
      setLoadingSaved(true);
      const data = await getUserScenarios(user.id);
      if (!cancelled) {
        setSavedScenarios(data);
        setLoadingSaved(false);
      }
    };

    fetchSaved();
    return () => { cancelled = true; };
  }, [user]);

  const handleLoadScenario = useCallback(
    (s: Scenario) => {
      setAnalysis(s.analysis);
      setInput(s.input);
      setAppMode('analyze');
      router.push('/');
    },
    [setAnalysis, setInput, setAppMode, router]
  );

  const handleLoadSession = useCallback(
    (entry: { input: string; analysis: GameAnalysis }) => {
      setAnalysis(entry.analysis);
      setInput(entry.input);
      setAppMode('analyze');
      router.push('/');
    },
    [setAnalysis, setInput, setAppMode, router]
  );

  const handleDelete = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    const ok = await deleteScenario(id);
    if (ok) {
      setSavedScenarios((prev) => prev.filter((s) => s.id !== id));
    }
    setDeletingId(null);
  }, []);

  const handleCompareScenario = useCallback(
    (e: React.MouseEvent, analysis: GameAnalysis) => {
      e.stopPropagation();
      addComparisonScenario(analysis);
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

  const hasSessionHistory = analysisHistory.length > 0;
  const hasSavedScenarios = savedScenarios.length > 0;
  const isEmpty = !hasSessionHistory && !hasSavedScenarios && !loadingSaved;

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#6c5ce7] rounded-full opacity-[0.03] blur-3xl" />
      </div>

      <Header />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <OpenFolderIcon /> Analysis History
            </h1>
            <p className="text-xs opacity-40 mt-1">
              Your game theory analyses from this session{user ? ' and saved scenarios' : ''}
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="text-xs px-4 py-2 rounded-xl border border-[#25253e] hover:border-[#6c5ce7] text-[#a29bfe] transition-all"
          >
            Back to Lab
          </button>
        </div>

        {/* Empty state */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <span className="text-5xl opacity-30"><EmptyBoxIcon size="1.5em" /></span>
            <p className="text-sm opacity-40">No analyses yet.</p>
            <p className="text-xs opacity-30 max-w-xs">
              Go back to the lab and analyze a scenario — it will appear here automatically.
            </p>
            <button
              onClick={() => router.push('/')}
              className="text-xs px-4 py-2 rounded-xl bg-[#6c5ce7] hover:bg-[#5a4bd6] text-white font-medium transition-colors"
            >
              Analyze Your First Scenario
            </button>
          </div>
        )}

        {/* Session history */}
        {hasSessionHistory && (
          <div className="mb-10">
            <h2 className="text-xs font-bold text-[#a29bfe] mb-4 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              This Session
              <span className="text-[10px] font-normal text-[#e0e0ff]/30 ml-1">
                ({analysisHistory.length} {analysisHistory.length === 1 ? 'analysis' : 'analyses'})
              </span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {[...analysisHistory].reverse().map((entry, i) => (
                  <motion.div
                    key={`session-${i}`}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                    className="group relative rounded-xl border border-[#25253e] bg-[#1a1a2e]/50 hover:border-[#6c5ce7]/40 p-4 cursor-pointer transition-all"
                    onClick={() => handleLoadSession(entry)}
                  >
                    {/* Mini pixel characters */}
                    <div className="flex gap-1.5 mb-3">
                      {entry.analysis.players.slice(0, 4).map((player) => (
                        <PixelCharacter
                          key={player.id}
                          player={player}
                          size={3}
                          animate={false}
                        />
                      ))}
                      {entry.analysis.players.length > 4 && (
                        <span className="text-[10px] opacity-30 self-end">
                          +{entry.analysis.players.length - 4}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-bold truncate pr-8">
                      {entry.analysis.title}
                    </h3>

                    {/* Game type badge */}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-[#6c5ce740] bg-[#6c5ce710] text-[#a29bfe]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#6c5ce7]" />
                        {entry.analysis.gameType}
                      </span>
                      <span className="text-[10px] opacity-30">this session</span>
                    </div>

                    {/* Input preview */}
                    <p className="text-[11px] opacity-40 mt-2 leading-relaxed line-clamp-2">
                      {entry.input}
                    </p>

                    {/* Stats row */}
                    <div className="flex items-center gap-3 mt-3 text-[10px] opacity-30">
                      <span>{entry.analysis.players.length} players</span>
                      <span>{entry.analysis.outcomes.length} outcomes</span>
                      <span>{entry.analysis.strategies.length} strategies</span>
                    </div>

                    {/* Compare button */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleCompareScenario(e, entry.analysis)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-xs hover:bg-[#25253e] transition-colors"
                        title="Compare"
                      >
                        <ScalesIcon />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Supabase-saved scenarios */}
        {user && (
          <div>
            <h2 className="text-xs font-bold text-[#a29bfe] mb-4 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
              </svg>
              Saved to Cloud
              {!loadingSaved && (
                <span className="text-[10px] font-normal text-[#e0e0ff]/30 ml-1">
                  ({savedScenarios.length} {savedScenarios.length === 1 ? 'scenario' : 'scenarios'})
                </span>
              )}
            </h2>

            {loadingSaved ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <motion.div
                  className="w-8 h-8 rounded-full border-2 border-[#6c5ce7] border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                />
                <span className="text-xs opacity-40">Loading saved scenarios...</span>
              </div>
            ) : savedScenarios.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs opacity-30">No cloud-saved scenarios yet. Use the save button after analyzing a scenario.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence>
                  {savedScenarios.map((scenario, i) => (
                    <motion.div
                      key={scenario.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.05 }}
                      className="group relative rounded-xl border border-[#25253e] bg-[#1a1a2e]/50 hover:border-[#6c5ce7]/40 p-4 cursor-pointer transition-all"
                      onClick={() => handleLoadScenario(scenario)}
                    >
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

                      <h3 className="text-sm font-bold truncate pr-8">
                        {scenario.analysis.title}
                      </h3>

                      <div className="flex items-center gap-2 mt-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-[#6c5ce740] bg-[#6c5ce710] text-[#a29bfe]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#6c5ce7]" />
                          {scenario.analysis.gameType}
                        </span>
                        <span className="text-[10px] opacity-30">
                          {formatDate(scenario.created_at)}
                        </span>
                      </div>

                      <p className="text-[11px] opacity-40 mt-2 leading-relaxed line-clamp-2">
                        {scenario.input}
                      </p>

                      <div className="flex items-center gap-3 mt-3 text-[10px] opacity-30">
                        <span>{scenario.analysis.players.length} players</span>
                        <span>{scenario.analysis.outcomes.length} outcomes</span>
                        <span>{scenario.analysis.strategies.length} strategies</span>
                      </div>

                      <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleCompareScenario(e, scenario.analysis)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-xs hover:bg-[#25253e] transition-colors"
                          title="Compare"
                        >
                          <ScalesIcon />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, scenario.id)}
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
                            <TrashIcon />
                          )}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* Sign-in nudge when not authenticated and no session history */}
        {!user && !hasSessionHistory && !isEmpty && (
          <div className="text-center py-8 mt-4 rounded-xl border border-[#25253e] bg-[#1a1a2e]/30">
            <p className="text-xs opacity-40">Sign in to save scenarios to the cloud and access them across sessions.</p>
          </div>
        )}
      </div>
    </main>
  );
}
