'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import type {
  OpenWorldPlayer,
  OpenWorldRelationship,
  OpenWorldRule,
  OpenWorldConfig,
  OpenWorldResult,
  OpenWorldPrediction,
} from '@/lib/types';
import {
  runOpenWorldSimulation,
  DEFAULT_OPEN_WORLD_CONFIG,
  createDefaultPlayer,
  createDefaultRelationship,
  createDefaultRule,
} from '@/lib/openWorldSim';
import PlayerBuilder from './openworld/PlayerBuilder';
import EventTimeline from './openworld/EventTimeline';
import RelationshipGraph from './openworld/RelationshipGraph';
import PredictionView from './openworld/PredictionView';
import WorldDashboard from './openworld/WorldDashboard';

// ---------------------------------------------------------------------------
// Phase types
// ---------------------------------------------------------------------------

type Phase = 'setup' | 'running' | 'results';

// ---------------------------------------------------------------------------
// Config slider
// ---------------------------------------------------------------------------

function ConfigSlider({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
  description,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (v: number) => void;
  description?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-[#a29bfe] font-medium">{label}</span>
        <span className="text-[10px] text-[#e0e0ff] font-mono bg-[#25253e] px-1.5 py-0.5 rounded">
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 accent-[#6c5ce7] cursor-pointer"
      />
      {description && (
        <p className="text-[9px] text-[#e0e0ff]/20 mt-0.5">{description}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function OpenWorldView() {
  const { analysis } = useStore();

  // --- State ---
  const [phase, setPhase] = useState<Phase>('setup');
  const [scenarioInput, setScenarioInput] = useState('');
  const [isLoadingSetup, setIsLoadingSetup] = useState(false);

  // Setup state
  const [players, setPlayers] = useState<OpenWorldPlayer[]>([
    createDefaultPlayer(0, 'Player A'),
    createDefaultPlayer(1, 'Player B'),
  ]);
  const [relationships, setRelationships] = useState<OpenWorldRelationship[]>([
    createDefaultRelationship('player_1', 'player_2'),
  ]);
  const [rules, setRules] = useState<OpenWorldRule[]>([]);
  const [config, setConfig] = useState<OpenWorldConfig>(DEFAULT_OPEN_WORLD_CONFIG);
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null);

  // Simulation state
  const [result, setResult] = useState<OpenWorldResult | null>(null);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(500);
  const playbackRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Results state
  const [activeTab, setActiveTab] = useState<'dashboard' | 'timeline' | 'relationships' | 'predictions'>('dashboard');
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<OpenWorldPrediction | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // --- AI-powered setup ---
  const handleAISetup = useCallback(async () => {
    if (!scenarioInput.trim()) return;
    setIsLoadingSetup(true);
    setSetupError(null);

    try {
      const res = await fetch('/api/openworld-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: scenarioInput }),
      });

      if (!res.ok) throw new Error('Failed to generate setup');
      const data = await res.json();
      const setup = data.setup;

      if (setup.players) setPlayers(setup.players);
      if (setup.relationships) setRelationships(setup.relationships);
      if (setup.rules) setRules(setup.rules);
      if (setup.suggestedConfig) {
        setConfig({
          ...DEFAULT_OPEN_WORLD_CONFIG,
          ...setup.suggestedConfig,
          turnSpeed: config.turnSpeed,
        });
      }
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setIsLoadingSetup(false);
    }
  }, [scenarioInput, config.turnSpeed]);

  // --- Import from current analysis ---
  const handleImportAnalysis = useCallback(() => {
    if (!analysis) return;

    const importedPlayers: OpenWorldPlayer[] = analysis.players.map((p, i) => ({
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      color: p.color,
      type: 'custom' as const,
      description: p.role,
      goals: [...p.goals],
      resources: [
        { name: 'Power', amount: 10, maxAmount: 20, regenerationRate: 0.5 },
        { name: 'Wealth', amount: 10, maxAmount: 20, regenerationRate: 0.5 },
      ],
      constraints: [],
      personalityTraits: {
        aggression: 0.5,
        cooperation: 0.5,
        riskTolerance: 0.5,
        rationality: 0.5,
        patience: 0.5,
      },
      alliances: [],
      rivals: [],
      position: {
        x: 300 + 200 * Math.cos((2 * Math.PI * i) / analysis.players.length),
        y: 250 + 150 * Math.sin((2 * Math.PI * i) / analysis.players.length),
      },
    }));

    const importedRels: OpenWorldRelationship[] = analysis.connections.map((c) => ({
      fromId: c.from,
      toId: c.to,
      type: c.type === 'cooperation' ? 'alliance' as const
        : c.type === 'competition' ? 'rivalry' as const
        : c.type === 'dependency' ? 'dependency' as const
        : 'trade' as const,
      strength: c.type === 'cooperation' ? c.strength
        : c.type === 'competition' ? -c.strength
        : c.strength * 0.5,
      history: [c.label],
    }));

    setPlayers(importedPlayers);
    setRelationships(importedRels);
    setScenarioInput(analysis.title);
  }, [analysis]);

  // --- Player management ---
  const addPlayer = useCallback(() => {
    const newPlayer = createDefaultPlayer(players.length);
    const newRels = players.map((p) => createDefaultRelationship(newPlayer.id, p.id));
    setPlayers([...players, newPlayer]);
    setRelationships([...relationships, ...newRels]);
  }, [players, relationships]);

  const updatePlayer = useCallback((index: number, updated: OpenWorldPlayer) => {
    const newPlayers = [...players];
    newPlayers[index] = updated;
    setPlayers(newPlayers);
  }, [players]);

  const removePlayer = useCallback((index: number) => {
    const removedId = players[index].id;
    setPlayers(players.filter((_, i) => i !== index));
    setRelationships(relationships.filter(
      (r) => r.fromId !== removedId && r.toId !== removedId,
    ));
  }, [players, relationships]);

  // --- Rule management ---
  const addRule = useCallback(() => {
    setRules([...rules, createDefaultRule()]);
  }, [rules]);

  const updateRule = useCallback((index: number, updates: Partial<OpenWorldRule>) => {
    const newRules = [...rules];
    newRules[index] = { ...newRules[index], ...updates };
    setRules(newRules);
  }, [rules]);

  const removeRule = useCallback((index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  }, [rules]);

  // --- Run simulation ---
  const runSimulation = useCallback(() => {
    if (players.length < 2) return;

    setPhase('running');
    setCurrentTurn(0);
    setPrediction(null);

    const simResult = runOpenWorldSimulation(players, relationships, rules, config);
    simResult.scenarioDescription = scenarioInput;
    setResult(simResult);

    // Start animated playback
    setIsRunning(true);
    let turn = 0;

    if (playbackRef.current) clearInterval(playbackRef.current);

    playbackRef.current = setInterval(() => {
      turn++;
      if (turn > simResult.turns.length) {
        if (playbackRef.current) clearInterval(playbackRef.current);
        setIsRunning(false);
        setPhase('results');
        return;
      }
      setCurrentTurn(turn);
    }, playbackSpeed);
  }, [players, relationships, rules, config, scenarioInput, playbackSpeed]);

  // --- Playback controls ---
  const pausePlayback = useCallback(() => {
    if (playbackRef.current) clearInterval(playbackRef.current);
    setIsRunning(false);
  }, []);

  const resumePlayback = useCallback(() => {
    if (!result) return;
    setIsRunning(true);

    let turn = currentTurn;
    playbackRef.current = setInterval(() => {
      turn++;
      if (turn > result.turns.length) {
        if (playbackRef.current) clearInterval(playbackRef.current);
        setIsRunning(false);
        setPhase('results');
        return;
      }
      setCurrentTurn(turn);
    }, playbackSpeed);
  }, [result, currentTurn, playbackSpeed]);

  const skipToEnd = useCallback(() => {
    if (!result) return;
    if (playbackRef.current) clearInterval(playbackRef.current);
    setIsRunning(false);
    setCurrentTurn(result.turns.length);
    setPhase('results');
  }, [result]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (playbackRef.current) clearInterval(playbackRef.current);
    };
  }, []);

  // --- AI Predictions ---
  const requestPrediction = useCallback(async () => {
    if (!result || result.turns.length === 0) return;
    setIsPredicting(true);

    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          players: result.players,
          relationships: result.relationships,
          turns: result.turns,
          config: result.config,
          scenarioDescription: result.scenarioDescription,
        }),
      });

      if (!res.ok) throw new Error('Prediction failed');
      const data = await res.json();
      setPrediction(data.prediction);
    } catch {
      // Silent fail
    } finally {
      setIsPredicting(false);
    }
  }, [result]);

  // --- Reset ---
  const resetSimulation = useCallback(() => {
    if (playbackRef.current) clearInterval(playbackRef.current);
    setPhase('setup');
    setResult(null);
    setCurrentTurn(0);
    setIsRunning(false);
    setPrediction(null);
  }, []);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span>🌍</span> Open World Simulation
          </h2>
          <p className="text-[10px] text-[#e0e0ff]/30 mt-0.5">
            Build complex multi-player scenarios with custom players, personalities, alliances, and let it play out
          </p>
        </div>
        {phase !== 'setup' && (
          <button
            onClick={resetSimulation}
            className="px-3 py-1.5 rounded-lg text-xs text-[#ff6b6b] border border-[#ff6b6b]/20 hover:bg-[#ff6b6b]/10 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* ================================================================== */}
      {/* SETUP PHASE */}
      {/* ================================================================== */}
      <AnimatePresence mode="wait">
        {phase === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* AI Scenario Input */}
            <div className="p-4 rounded-xl border border-[#6c5ce7]/20 bg-[#6c5ce7]/5">
              <label className="text-[10px] text-[#a29bfe] uppercase tracking-wider font-medium">
                Describe Your Scenario (AI will build the world)
              </label>
              <textarea
                value={scenarioInput}
                onChange={(e) => setScenarioInput(e.target.value)}
                rows={3}
                className="w-full mt-2 px-4 py-3 rounded-xl bg-[#0a0a1a] border border-[#25253e] text-sm text-[#e0e0ff] placeholder-[#e0e0ff]/20 focus:border-[#6c5ce7] focus:outline-none resize-none"
                placeholder="e.g., 'U.S. and Israel are collaborating to pressure Iran. Russia and China have their own interests. What happens to oil prices, regional alliances, and global trade?'&#10;&#10;Or: 'Software companies with heavy debt are facing AI disruption. Banks hold the loans. Startups are undercutting. When do defaults start?'"
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={handleAISetup}
                  disabled={isLoadingSetup || !scenarioInput.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-[#6c5ce7] text-white hover:bg-[#5a4bd6] disabled:opacity-30 transition-all"
                >
                  {isLoadingSetup ? 'Building world...' : 'Generate World with AI'}
                </button>
                {analysis && (
                  <button
                    onClick={handleImportAnalysis}
                    className="px-3 py-2 rounded-xl text-xs text-[#a29bfe] border border-[#6c5ce7]/20 hover:bg-[#6c5ce7]/10 transition-colors"
                  >
                    Import from Analysis
                  </button>
                )}
              </div>
              {setupError && (
                <p className="text-[10px] text-[#ff6b6b] mt-2">{setupError}</p>
              )}
            </div>

            {/* Players */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-[#a29bfe]">
                  Players ({players.length})
                </span>
                <button
                  onClick={addPlayer}
                  className="text-[10px] text-[#a29bfe] hover:text-white px-2 py-1 rounded-lg border border-[#6c5ce7]/20 hover:bg-[#6c5ce7]/10 transition-colors"
                >
                  + Add Player
                </button>
              </div>
              <div className="space-y-2">
                {players.map((player, i) => (
                  <PlayerBuilder
                    key={player.id}
                    player={player}
                    onChange={(updated) => updatePlayer(i, updated)}
                    onRemove={() => removePlayer(i)}
                    isExpanded={expandedPlayerId === player.id}
                    onToggle={() => setExpandedPlayerId(
                      expandedPlayerId === player.id ? null : player.id,
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Relationships Preview */}
            {players.length >= 2 && (
              <div>
                <span className="text-xs font-medium text-[#a29bfe] mb-3 block">Relationships</span>
                <div className="flex justify-center">
                  <RelationshipGraph
                    players={players}
                    relationships={relationships}
                    selectedPlayerId={selectedPlayer}
                    onSelectPlayer={setSelectedPlayer}
                  />
                </div>

                {/* Relationship editors */}
                <div className="space-y-1 mt-3">
                  {relationships.map((rel, i) => {
                    const fromP = players.find((p) => p.id === rel.fromId);
                    const toP = players.find((p) => p.id === rel.toId);
                    if (!fromP || !toP) return null;

                    return (
                      <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#0a0a1a]/30">
                        <span className="text-[10px]" style={{ color: fromP.color }}>{fromP.name}</span>
                        <span className="text-[9px] text-[#e0e0ff]/20">↔</span>
                        <span className="text-[10px]" style={{ color: toP.color }}>{toP.name}</span>
                        <select
                          value={rel.type}
                          onChange={(e) => {
                            const newRels = [...relationships];
                            newRels[i] = { ...newRels[i], type: e.target.value as OpenWorldRelationship['type'] };
                            setRelationships(newRels);
                          }}
                          className="text-[9px] bg-[#0a0a1a] border border-[#25253e] rounded px-1 py-0.5 text-[#e0e0ff] focus:outline-none"
                        >
                          <option value="alliance">Alliance</option>
                          <option value="rivalry">Rivalry</option>
                          <option value="trade">Trade</option>
                          <option value="dependency">Dependency</option>
                          <option value="threat">Threat</option>
                          <option value="neutral">Neutral</option>
                        </select>
                        <input
                          type="range"
                          min={-1}
                          max={1}
                          step={0.1}
                          value={rel.strength}
                          onChange={(e) => {
                            const newRels = [...relationships];
                            newRels[i] = { ...newRels[i], strength: parseFloat(e.target.value) };
                            setRelationships(newRels);
                          }}
                          className="flex-1 h-1 accent-[#6c5ce7]"
                        />
                        <span className="text-[9px] font-mono text-[#e0e0ff]/30 w-8 text-right">
                          {rel.strength > 0 ? '+' : ''}{rel.strength.toFixed(1)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Rules */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[#a29bfe]">Rules ({rules.length})</span>
                <button
                  onClick={addRule}
                  className="text-[10px] text-[#a29bfe] hover:text-white px-2 py-1 rounded-lg border border-[#6c5ce7]/20 hover:bg-[#6c5ce7]/10 transition-colors"
                >
                  + Add Rule
                </button>
              </div>
              <div className="space-y-2">
                {rules.map((rule, i) => (
                  <div key={rule.id} className="p-3 rounded-lg border border-[#25253e]/50 bg-[#0a0a1a]/30 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={rule.name}
                        onChange={(e) => updateRule(i, { name: e.target.value })}
                        className="flex-1 px-2 py-1 rounded bg-transparent border border-[#25253e] text-xs text-[#e0e0ff] focus:border-[#6c5ce7] focus:outline-none"
                        placeholder="Rule name"
                      />
                      <select
                        value={rule.type}
                        onChange={(e) => updateRule(i, { type: e.target.value as OpenWorldRule['type'] })}
                        className="text-[10px] bg-[#0a0a1a] border border-[#25253e] rounded px-1.5 py-1 text-[#e0e0ff] focus:outline-none"
                      >
                        <option value="constraint">Constraint</option>
                        <option value="trigger">Trigger</option>
                        <option value="modifier">Modifier</option>
                        <option value="victory">Victory</option>
                        <option value="elimination">Elimination</option>
                      </select>
                      <button onClick={() => removeRule(i)} className="text-[#ff6b6b]/40 hover:text-[#ff6b6b] text-xs">x</button>
                    </div>
                    <input
                      type="text"
                      value={rule.description}
                      onChange={(e) => updateRule(i, { description: e.target.value })}
                      className="w-full px-2 py-1 rounded bg-transparent border border-[#25253e] text-[10px] text-[#e0e0ff]/60 focus:border-[#6c5ce7] focus:outline-none"
                      placeholder="Description"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Configuration */}
            <div>
              <span className="text-xs font-medium text-[#a29bfe] mb-3 block">World Configuration</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 p-4 rounded-xl bg-[#0a0a1a]/30 border border-[#25253e]/50">
                <ConfigSlider
                  label="Total Turns" value={config.totalTurns} min={5} max={100} step={5}
                  displayValue={`${config.totalTurns}`}
                  onChange={(v) => setConfig({ ...config, totalTurns: v })}
                />
                <ConfigSlider
                  label="Playback Speed" value={playbackSpeed} min={100} max={2000} step={100}
                  displayValue={`${playbackSpeed}ms`}
                  onChange={setPlaybackSpeed}
                  description="Delay between turns during playback"
                />
                <ConfigSlider
                  label="Shock Frequency" value={config.shockFrequency} min={0} max={1} step={0.05}
                  displayValue={`${(config.shockFrequency * 100).toFixed(0)}%`}
                  onChange={(v) => setConfig({ ...config, shockFrequency: v })}
                  description="How often random world events occur"
                />
                <ConfigSlider
                  label="Alliance Flexibility" value={config.allianceFlexibility} min={0} max={1} step={0.05}
                  displayValue={`${(config.allianceFlexibility * 100).toFixed(0)}%`}
                  onChange={(v) => setConfig({ ...config, allianceFlexibility: v })}
                  description="How easily alliances shift"
                />
                <ConfigSlider
                  label="Resource Scarcity" value={config.resourceScarcity} min={0} max={1} step={0.05}
                  displayValue={`${(config.resourceScarcity * 100).toFixed(0)}%`}
                  onChange={(v) => setConfig({ ...config, resourceScarcity: v })}
                  description="How hard it is to regenerate resources"
                />
                <ConfigSlider
                  label="Diplomacy Weight" value={config.diplomacyWeight} min={0} max={1} step={0.05}
                  displayValue={`${(config.diplomacyWeight * 100).toFixed(0)}%`}
                  onChange={(v) => setConfig({ ...config, diplomacyWeight: v })}
                  description="How much diplomatic actions influence outcomes"
                />
                <ConfigSlider
                  label="Information Asymmetry" value={config.informationAsymmetry} min={0} max={1} step={0.05}
                  displayValue={`${(config.informationAsymmetry * 100).toFixed(0)}%`}
                  onChange={(v) => setConfig({ ...config, informationAsymmetry: v })}
                  description="0 = perfect info, 1 = fog of war"
                />
                <ConfigSlider
                  label="Elimination Threshold" value={config.eliminationThreshold} min={-50} max={0} step={5}
                  displayValue={`${config.eliminationThreshold}`}
                  onChange={(v) => setConfig({ ...config, eliminationThreshold: v })}
                  description="Payoff below which players get eliminated"
                />

                {/* Toggles */}
                <div className="flex items-center gap-4 col-span-full">
                  <label className="flex items-center gap-2 text-[10px] text-[#e0e0ff]/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.enableShocks}
                      onChange={(e) => setConfig({ ...config, enableShocks: e.target.checked })}
                      className="accent-[#6c5ce7]"
                    />
                    Enable Random Shocks
                  </label>
                  <label className="flex items-center gap-2 text-[10px] text-[#e0e0ff]/50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.eliminationEnabled}
                      onChange={(e) => setConfig({ ...config, eliminationEnabled: e.target.checked })}
                      className="accent-[#6c5ce7]"
                    />
                    Enable Elimination
                  </label>
                </div>
              </div>
            </div>

            {/* Launch Button */}
            <div className="flex justify-center pt-4">
              <motion.button
                onClick={runSimulation}
                disabled={players.length < 2}
                className="px-8 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] text-white shadow-lg shadow-[#6c5ce7]/20 hover:shadow-[#6c5ce7]/40 disabled:opacity-30 transition-all"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                Launch Simulation ({config.totalTurns} turns)
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ================================================================== */}
        {/* RUNNING / RESULTS PHASE */}
        {/* ================================================================== */}
        {(phase === 'running' || phase === 'results') && result && (
          <motion.div
            key="simulation"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Playback controls */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-[#25253e] bg-[#1a1a2e]/50">
              <div className="flex items-center gap-2">
                {isRunning ? (
                  <button onClick={pausePlayback} className="px-3 py-1.5 rounded-lg text-xs bg-[#fdcb6e]/20 text-[#fdcb6e] border border-[#fdcb6e]/20">
                    ⏸ Pause
                  </button>
                ) : currentTurn < result.turns.length ? (
                  <button onClick={resumePlayback} className="px-3 py-1.5 rounded-lg text-xs bg-[#00b894]/20 text-[#00b894] border border-[#00b894]/20">
                    ▶ Play
                  </button>
                ) : null}
                <button onClick={skipToEnd} className="px-3 py-1.5 rounded-lg text-xs text-[#e0e0ff]/40 border border-[#25253e] hover:text-[#e0e0ff]/70">
                  ⏭ Skip to End
                </button>
              </div>

              {/* Turn progress */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#e0e0ff]/40">
                  Turn <span className="font-mono text-[#a29bfe]">{currentTurn}</span> / {result.turns.length}
                </span>
                <div className="w-32 h-1.5 rounded-full bg-[#25253e] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-[#6c5ce7]"
                    animate={{ width: `${(currentTurn / result.turns.length) * 100}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
                {result.winner && (
                  <span className="text-[10px] text-[#fdcb6e] font-medium">
                    Winner: {players.find((p) => p.id === result.winner)?.name}!
                  </span>
                )}
              </div>
            </div>

            {/* Tab navigation */}
            <div className="flex items-center gap-1 rounded-xl bg-[#1a1a2e]/60 p-1 w-fit">
              {([
                { key: 'dashboard', label: 'Dashboard', icon: '📊' },
                { key: 'timeline', label: 'Timeline', icon: '📜' },
                { key: 'relationships', label: 'Relations', icon: '🕸️' },
                { key: 'predictions', label: 'AI Predictions', icon: '🔮' },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === tab.key ? 'text-[#e0e0ff]' : 'text-[#e0e0ff]/40 hover:text-[#e0e0ff]/70'
                  }`}
                >
                  {activeTab === tab.key && (
                    <motion.div
                      className="absolute inset-0 rounded-lg bg-[#6c5ce7]/20 border border-[#6c5ce7]/30"
                      layoutId="ow-active-tab"
                      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    />
                  )}
                  <span className="relative z-10">{tab.icon}</span>
                  <span className="relative z-10 hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Main content area */}
              <div className="lg:col-span-2">
                <AnimatePresence mode="wait">
                  {activeTab === 'dashboard' && (
                    <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <WorldDashboard
                        turns={result.turns}
                        players={result.players}
                        currentTurn={currentTurn}
                      />
                    </motion.div>
                  )}

                  {activeTab === 'timeline' && (
                    <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="h-[500px] rounded-xl border border-[#25253e] bg-[#0a0a1a]/30 overflow-hidden"
                    >
                      <EventTimeline
                        turns={result.turns.slice(0, currentTurn)}
                        players={result.players}
                        currentTurn={currentTurn}
                        onSelectTurn={setCurrentTurn}
                      />
                    </motion.div>
                  )}

                  {activeTab === 'relationships' && (
                    <motion.div key="relationships" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex flex-col items-center"
                    >
                      <RelationshipGraph
                        players={result.players}
                        relationships={result.relationships}
                        selectedPlayerId={selectedPlayer}
                        onSelectPlayer={setSelectedPlayer}
                      />
                      {/* Relationship details */}
                      <div className="w-full mt-4 space-y-1">
                        {result.relationships.map((rel, i) => {
                          const from = result.players.find((p) => p.id === rel.fromId);
                          const to = result.players.find((p) => p.id === rel.toId);
                          if (!from || !to) return null;
                          return (
                            <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0a0a1a]/30">
                              <span className="text-sm">{from.emoji}</span>
                              <span className="text-[10px]" style={{ color: from.color }}>{from.name}</span>
                              <div className="flex-1 h-1 rounded-full bg-[#25253e] overflow-hidden mx-2">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${(Math.abs(rel.strength)) * 100}%`,
                                    backgroundColor: rel.strength > 0 ? '#00b894' : '#ff6b6b',
                                    marginLeft: rel.strength < 0 ? 'auto' : undefined,
                                  }}
                                />
                              </div>
                              <span className="text-[10px]" style={{ color: to.color }}>{to.name}</span>
                              <span className="text-sm">{to.emoji}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                                rel.strength > 0 ? 'bg-[#00b894]/20 text-[#00b894]' : 'bg-[#ff6b6b]/20 text-[#ff6b6b]'
                              }`}>
                                {rel.type}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'predictions' && (
                    <motion.div key="predictions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <PredictionView
                        prediction={prediction}
                        players={result.players}
                        isLoading={isPredicting}
                        onRequestPrediction={requestPrediction}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Sidebar: Insights + Player Cards */}
              <div className="space-y-4">
                {/* Insights */}
                {phase === 'results' && result.insights.length > 0 && (
                  <div className="p-3 rounded-xl border border-[#25253e] bg-[#1a1a2e]/50">
                    <span className="text-[10px] text-[#a29bfe] uppercase tracking-wider font-medium">Insights</span>
                    <div className="space-y-2 mt-2">
                      {result.insights.map((insight, i) => (
                        <p key={i} className="text-[10px] text-[#e0e0ff]/40 leading-relaxed">
                          {insight}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Final narrative */}
                {phase === 'results' && (
                  <div className="p-3 rounded-xl border border-[#25253e] bg-[#1a1a2e]/50">
                    <span className="text-[10px] text-[#a29bfe] uppercase tracking-wider font-medium">Final Report</span>
                    <p className="text-xs text-[#e0e0ff]/40 mt-2 leading-relaxed">
                      {result.finalNarrative}
                    </p>
                  </div>
                )}

                {/* Mini relationship graph */}
                <div className="p-3 rounded-xl border border-[#25253e] bg-[#1a1a2e]/50">
                  <span className="text-[10px] text-[#a29bfe] uppercase tracking-wider font-medium">Player Map</span>
                  <div className="flex justify-center mt-2">
                    <RelationshipGraph
                      players={result.players}
                      relationships={result.relationships}
                      selectedPlayerId={selectedPlayer}
                      onSelectPlayer={setSelectedPlayer}
                      compact
                    />
                  </div>
                </div>

                {/* Player cards */}
                <div className="space-y-1">
                  {result.players.map((player) => {
                    const state = currentTurn > 0
                      ? result.turns[currentTurn - 1]?.playerStates[player.id]
                      : null;
                    return (
                      <button
                        key={player.id}
                        onClick={() => setSelectedPlayer(
                          selectedPlayer === player.id ? null : player.id,
                        )}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                          selectedPlayer === player.id
                            ? 'bg-[#6c5ce7]/10 border border-[#6c5ce7]/30'
                            : 'border border-transparent hover:bg-[#1a1a2e]/50'
                        } ${state?.status === 'eliminated' ? 'opacity-30' : ''}`}
                      >
                        <span className="text-lg">{player.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-medium block" style={{ color: player.color }}>
                            {player.name}
                          </span>
                          <span className="text-[9px] text-[#e0e0ff]/20 block truncate">
                            {state?.actionTaken ?? 'Waiting...'}
                          </span>
                        </div>
                        {state && (
                          <span className={`text-[10px] font-mono ${
                            state.cumulativePayoff >= 0 ? 'text-[#00b894]' : 'text-[#ff6b6b]'
                          }`}>
                            {state.cumulativePayoff >= 0 ? '+' : ''}{state.cumulativePayoff.toFixed(1)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
