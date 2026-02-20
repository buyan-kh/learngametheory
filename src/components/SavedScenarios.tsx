'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import { useStore } from '@/lib/store';
import { getUserScenarios, deleteScenario, saveScenario } from '@/lib/supabase-db';
import { Scenario, GameAnalysis } from '@/lib/types';

// ---------------------------------------------------------------------------
// SavedScenarios -- slide-in panel from the right
// ---------------------------------------------------------------------------

export default function SavedScenarios() {
  const { user } = useAuth();
  const {
    savedScenarios,
    setSavedScenarios,
    removeSavedScenario,
    showSavedPanel,
    setShowSavedPanel,
    setAnalysis,
    setInput,
    addComparisonScenario,
  } = useStore();

  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch saved scenarios when the panel opens and user is logged in
  useEffect(() => {
    if (!showSavedPanel || !user) return;

    let cancelled = false;

    const fetchScenarios = async () => {
      setIsLoading(true);
      const scenarios = await getUserScenarios(user.id);
      if (!cancelled) {
        setSavedScenarios(scenarios);
        setIsLoading(false);
      }
    };

    fetchScenarios();

    return () => {
      cancelled = true;
    };
  }, [showSavedPanel, user, setSavedScenarios]);

  // Load a scenario into the editor
  const handleLoad = useCallback(
    (scenario: Scenario) => {
      setAnalysis(scenario.analysis);
      setInput(scenario.input);
      setShowSavedPanel(false);
    },
    [setAnalysis, setInput, setShowSavedPanel],
  );

  // Delete a scenario
  const handleDelete = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setDeletingId(id);
      const ok = await deleteScenario(id);
      if (ok) {
        removeSavedScenario(id);
      }
      setDeletingId(null);
    },
    [removeSavedScenario],
  );

  // Add to comparison mode
  const handleCompare = useCallback(
    (e: React.MouseEvent, analysis: GameAnalysis) => {
      e.stopPropagation();
      addComparisonScenario(analysis);
    },
    [addComparisonScenario],
  );

  // Format a date string nicely
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <AnimatePresence>
      {showSavedPanel && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSavedPanel(false)}
          />

          {/* Panel */}
          <motion.aside
            className="fixed top-0 right-0 z-50 h-full w-[300px] bg-[var(--surface)] border-l border-[var(--surface-light)] flex flex-col shadow-2xl"
            initial={{ x: 300 }}
            animate={{ x: 0 }}
            exit={{ x: 300 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--surface-light)]">
              <h3 className="text-sm font-bold text-[var(--accent-light)] flex items-center gap-2">
                <span>📂</span> Saved Scenarios
              </h3>
              <button
                onClick={() => setShowSavedPanel(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--accent-light)] hover:bg-[var(--surface-light)] transition-colors text-sm"
                aria-label="Close saved scenarios panel"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {!user ? (
                /* Not signed in */
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                  <span className="text-3xl opacity-40">🔒</span>
                  <p className="text-xs text-[var(--foreground)] opacity-50">
                    Sign in to save and access your scenarios
                  </p>
                </div>
              ) : isLoading ? (
                /* Loading state */
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <motion.div
                    className="w-6 h-6 rounded-full border-2 border-[var(--accent)] border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  <span className="text-xs text-[var(--accent-light)] opacity-60">
                    Loading scenarios...
                  </span>
                </div>
              ) : savedScenarios.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                  <span className="text-3xl opacity-40">📭</span>
                  <p className="text-xs text-[var(--foreground)] opacity-50">
                    No saved scenarios yet. Analyze a scenario and save it!
                  </p>
                </div>
              ) : (
                /* Scenario cards */
                savedScenarios.map((scenario) => (
                  <motion.div
                    key={scenario.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    className="group relative rounded-lg border border-[var(--surface-light)] bg-[var(--background)] hover:border-[var(--accent)] p-3 cursor-pointer transition-colors"
                    onClick={() => handleLoad(scenario)}
                  >
                    {/* Title */}
                    <h4 className="text-xs font-bold text-[var(--foreground)] truncate pr-14">
                      {scenario.analysis.title}
                    </h4>

                    {/* Game type badge + date */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border border-[#6c5ce740] bg-[#6c5ce710] text-[var(--accent-light)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                        {scenario.analysis.gameType}
                      </span>
                      <span className="text-[10px] text-[var(--foreground)] opacity-30">
                        {formatDate(scenario.created_at)}
                      </span>
                    </div>

                    {/* Truncated input */}
                    <p className="text-[10px] text-[var(--foreground)] opacity-40 mt-1.5 leading-relaxed line-clamp-2">
                      {scenario.input.length > 80
                        ? scenario.input.slice(0, 80) + '...'
                        : scenario.input}
                    </p>

                    {/* Action buttons */}
                    <div className="absolute top-2.5 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleCompare(e, scenario.analysis)}
                        className="w-6 h-6 flex items-center justify-center rounded text-[10px] hover:bg-[var(--surface-light)] transition-colors"
                        title="Add to Compare"
                        aria-label="Add to compare"
                      >
                        &#x2696;&#xFE0F;
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, scenario.id)}
                        disabled={deletingId === scenario.id}
                        className="w-6 h-6 flex items-center justify-center rounded text-[10px] hover:bg-[#ff6b6b20] text-[var(--danger)] transition-colors disabled:opacity-30"
                        title="Delete scenario"
                        aria-label="Delete scenario"
                      >
                        {deletingId === scenario.id ? (
                          <motion.span
                            animate={{ rotate: 360 }}
                            transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
                            className="inline-block"
                          >
                            ⏳
                          </motion.span>
                        ) : (
                          '🗑️'
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// SaveButton -- standalone button to save the current analysis
// ---------------------------------------------------------------------------

export function SaveButton() {
  const { user } = useAuth();
  const { input, analysis, addToHistory, addSavedScenario } = useStore();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!user || !analysis || saving) return;

    setSaving(true);
    const scenario = await saveScenario(user.id, input, analysis);
    setSaving(false);

    if (scenario) {
      addSavedScenario(scenario);
      addToHistory(input, analysis);

      // Brief "Saved!" flash
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  };

  const disabled = !user || !analysis;

  return (
    <div className="relative group">
      <motion.button
        onClick={handleSave}
        disabled={disabled || saving}
        className={`relative flex items-center justify-center w-9 h-9 rounded-lg border transition-all text-sm ${
          saved
            ? 'border-[var(--success)] bg-[#51cf6620] text-[var(--success)]'
            : disabled
              ? 'border-[var(--surface-light)] bg-[var(--surface)] text-[var(--foreground)] opacity-40 cursor-not-allowed'
              : 'border-[var(--surface-light)] bg-[var(--surface)] text-[var(--accent-light)] hover:border-[var(--accent)] hover:bg-[#6c5ce710]'
        }`}
        whileTap={!disabled ? { scale: 0.9 } : undefined}
        aria-label={disabled ? 'Sign in to save' : 'Save scenario'}
      >
        <AnimatePresence mode="wait">
          {saving ? (
            <motion.span
              key="spinner"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="inline-block"
            >
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                className="inline-block text-xs"
              >
                ⏳
              </motion.span>
            </motion.span>
          ) : saved ? (
            <motion.span
              key="check"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="text-xs"
            >
              ✓
            </motion.span>
          ) : (
            <motion.span
              key="save"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="text-xs"
            >
              💾
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Saved confirmation toast */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.9 }}
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-[var(--success)] bg-[#51cf6620] border border-[var(--success)] px-2 py-0.5 rounded-full"
          >
            Saved!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tooltip for disabled state */}
      {!user && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-[var(--foreground)] opacity-0 group-hover:opacity-60 transition-opacity bg-[var(--surface)] border border-[var(--surface-light)] px-2 py-0.5 rounded-full pointer-events-none">
          Sign in to save
        </div>
      )}
    </div>
  );
}
