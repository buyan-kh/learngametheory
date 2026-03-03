'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  VillageConfig, VillageZone, VillageVillager, VillageTurnSnapshot,
  VillageResult, DEFAULT_VILLAGE_CONFIG,
} from '@/lib/villageTypes';
import { SocialGraph } from '@/lib/villageSim';
import { generateVillage } from '@/lib/villageGen';
import { runVillageSimulation } from '@/lib/villageSim';
import VillageMap from '@/components/village/VillageMap';
import VillageDashboard from '@/components/village/VillageDashboard';
import VillageTimeline from '@/components/village/VillageTimeline';
import VillageNetwork from '@/components/village/VillageNetwork';

type Phase = 'setup' | 'preview' | 'simulating' | 'results';
type ResultTab = 'map' | 'dashboard' | 'timeline' | 'network';

function ConfigSlider({ label, value, min, max, step, onChange, suffix }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; suffix?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span className="text-[#e0e0ff]/60">{label}</span>
        <span className="text-[#a29bfe] font-mono">{value}{suffix}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#6c5ce7] h-1.5 bg-[#25253e] rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#6c5ce7]
          [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#a29bfe]
          [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(108,92,231,0.5)]"
      />
    </div>
  );
}

export default function VillageView() {
  const [phase, setPhase] = useState<Phase>('setup');
  const [config, setConfig] = useState<VillageConfig>({ ...DEFAULT_VILLAGE_CONFIG });
  const [zones, setZones] = useState<VillageZone[]>([]);
  const [villagers, setVillagers] = useState<VillageVillager[]>([]);
  const [graph, setGraph] = useState<SocialGraph | null>(null);
  const [result, setResult] = useState<VillageResult | null>(null);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [progressTurn, setProgressTurn] = useState(0);
  const [activeTab, setActiveTab] = useState<ResultTab>('map');
  const [isPlaying, setIsPlaying] = useState(false);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateConfig = useCallback((updates: Partial<VillageConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const handleGenerate = useCallback(() => {
    const { zones: z, villagers: v, graph: g } = generateVillage(config);
    setZones(z);
    setVillagers(v);
    setGraph(g);
    setPhase('preview');
  }, [config]);

  const handleSimulate = useCallback(async () => {
    if (!graph) return;
    setPhase('simulating');
    setProgressTurn(0);

    // Deep-clone zones and villagers so simulation can mutate them
    const simZones: VillageZone[] = JSON.parse(JSON.stringify(zones));
    const simVillagers: VillageVillager[] = JSON.parse(JSON.stringify(villagers));

    const res = await runVillageSimulation(
      config, simZones, simVillagers, graph,
      (turn) => setProgressTurn(turn + 1),
    );

    setResult(res);
    setCurrentTurn(0);
    setPhase('results');
  }, [config, zones, villagers, graph]);

  const handleReset = useCallback(() => {
    setPhase('setup');
    setZones([]);
    setVillagers([]);
    setGraph(null);
    setResult(null);
    setCurrentTurn(0);
    if (playRef.current) clearInterval(playRef.current);
    setIsPlaying(false);
  }, []);

  const togglePlayback = useCallback(() => {
    if (!result) return;
    if (isPlaying) {
      if (playRef.current) clearInterval(playRef.current);
      playRef.current = null;
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      playRef.current = setInterval(() => {
        setCurrentTurn(prev => {
          if (prev >= result.turns.length - 1) {
            if (playRef.current) clearInterval(playRef.current);
            playRef.current = null;
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, config.turnSpeed);
    }
  }, [isPlaying, result, config.turnSpeed]);

  // Archetype counts for preview
  const archetypeCounts: Record<string, number> = {};
  for (const v of villagers) {
    archetypeCounts[v.archetype] = (archetypeCounts[v.archetype] || 0) + 1;
  }

  const currentSnapshot = result?.turns[currentTurn];
  const resultTabs: { key: ResultTab; label: string }[] = [
    { key: 'map', label: 'Zone Map' },
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'timeline', label: 'Timeline' },
    { key: 'network', label: 'Network' },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Title */}
      <motion.div
        className="text-center mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-lg font-bold bg-gradient-to-r from-[#00b894] to-[#00cec9] bg-clip-text text-transparent">
          Village Simulation
        </h2>
        <p className="text-[10px] text-[#e0e0ff]/40 mt-1">
          Simulate up to 500+ villagers with zone-based interactions
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {/* ── Setup Phase ────────────────────────────────────────────── */}
        {phase === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="max-w-2xl mx-auto"
          >
            <div className="rounded-2xl border border-[#25253e] bg-[#1a1a2e]/50 p-6">
              <h3 className="text-sm font-bold text-[#e0e0ff] mb-4">Configure Village</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ConfigSlider label="Population" value={config.populationSize}
                  min={50} max={1000} step={10} onChange={v => updateConfig({ populationSize: v })} />
                <ConfigSlider label="Zones" value={config.zoneCount}
                  min={4} max={12} step={1} onChange={v => updateConfig({ zoneCount: v })} />
                <ConfigSlider label="Turns" value={config.totalTurns}
                  min={10} max={100} step={5} onChange={v => updateConfig({ totalTurns: v })} />
                <ConfigSlider label="Turn Speed" value={config.turnSpeed}
                  min={50} max={1000} step={50} onChange={v => updateConfig({ turnSpeed: v })} suffix="ms" />
                <ConfigSlider label="Connections/Person" value={config.connectionsPerPerson}
                  min={3} max={20} step={1} onChange={v => updateConfig({ connectionsPerPerson: v })} />
                <ConfigSlider label="Disaster Frequency" value={config.disasterFrequency}
                  min={0} max={0.5} step={0.05} onChange={v => updateConfig({ disasterFrequency: v })} />
                <ConfigSlider label="Scarcity" value={config.scarcity}
                  min={0} max={1} step={0.1} onChange={v => updateConfig({ scarcity: v })} />
                <ConfigSlider label="Conflict Tendency" value={config.conflictTendency}
                  min={0} max={1} step={0.1} onChange={v => updateConfig({ conflictTendency: v })} />
              </div>

              <div className="mt-4 flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-[#e0e0ff]/60 cursor-pointer">
                  <input
                    type="checkbox" checked={config.migrationEnabled}
                    onChange={e => updateConfig({ migrationEnabled: e.target.checked })}
                    className="accent-[#6c5ce7]"
                  />
                  Enable Migration
                </label>
              </div>

              <motion.button
                onClick={handleGenerate}
                className="mt-6 w-full py-3 rounded-xl font-bold text-sm text-white
                  bg-gradient-to-r from-[#00b894] to-[#00cec9] hover:brightness-110 transition"
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              >
                Generate Village
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── Preview Phase ──────────────────────────────────────────── */}
        {phase === 'preview' && (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="max-w-4xl mx-auto"
          >
            <div className="rounded-2xl border border-[#25253e] bg-[#1a1a2e]/50 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-[#e0e0ff]">
                  Village Generated — {villagers.length} villagers in {zones.length} zones
                </h3>
                <button onClick={handleReset} className="text-xs text-[#e0e0ff]/40 hover:text-[#e0e0ff]/70">
                  Reconfigure
                </button>
              </div>

              {/* Zone overview */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-4">
                {zones.map(z => {
                  const pop = villagers.filter(v => v.zoneId === z.id).length;
                  return (
                    <div key={z.id} className="rounded-lg border border-[#25253e]/60 bg-[#0a0a1a]/50 p-2">
                      <div className="text-[10px] font-bold text-[#a29bfe]">{z.name}</div>
                      <div className="text-[9px] text-[#e0e0ff]/40">{z.type} — {pop} people</div>
                      <div className="flex gap-2 mt-1 text-[8px] text-[#e0e0ff]/30">
                        <span>Food: {Math.round(z.food)}</span>
                        <span>Safety: {Math.round(z.safety)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Archetype distribution */}
              <div className="flex flex-wrap gap-2 mb-4">
                {Object.entries(archetypeCounts).sort((a, b) => b[1] - a[1]).map(([arch, count]) => (
                  <span key={arch} className="px-2 py-0.5 rounded-full text-[9px] bg-[#25253e]/60 text-[#e0e0ff]/60">
                    {arch}: {count}
                  </span>
                ))}
              </div>

              <div className="flex gap-3">
                <motion.button
                  onClick={handleSimulate}
                  className="flex-1 py-3 rounded-xl font-bold text-sm text-white
                    bg-gradient-to-r from-[#00b894] to-[#00cec9] hover:brightness-110 transition"
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                >
                  Run Simulation ({config.totalTurns} turns)
                </motion.button>
                <motion.button
                  onClick={handleGenerate}
                  className="px-4 py-3 rounded-xl font-bold text-sm text-[#a29bfe]
                    bg-[#6c5ce7]/10 border border-[#6c5ce7]/20 hover:bg-[#6c5ce7]/20 transition"
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                >
                  Regenerate
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Simulating Phase ───────────────────────────────────────── */}
        {phase === 'simulating' && (
          <motion.div
            key="simulating"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="max-w-md mx-auto text-center"
          >
            <div className="rounded-2xl border border-[#25253e] bg-[#1a1a2e]/50 p-8">
              <div className="text-sm font-bold text-[#e0e0ff] mb-2">Simulating Village...</div>
              <div className="text-xs text-[#e0e0ff]/40 mb-4">
                Turn {progressTurn} / {config.totalTurns}
              </div>
              <div className="w-full h-2 rounded-full bg-[#25253e] overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#00b894] to-[#00cec9] rounded-full"
                  style={{ width: `${(progressTurn / config.totalTurns) * 100}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <p className="text-[9px] text-[#e0e0ff]/30 mt-3">
                Processing {config.populationSize} villagers per turn...
              </p>
            </div>
          </motion.div>
        )}

        {/* ── Results Phase ──────────────────────────────────────────── */}
        {phase === 'results' && result && currentSnapshot && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            {/* Playback controls */}
            <div className="flex items-center gap-3 mb-4 rounded-xl border border-[#25253e] bg-[#1a1a2e]/50 p-3">
              <button
                onClick={togglePlayback}
                className="w-8 h-8 rounded-lg bg-[#00b894]/20 text-[#00b894] flex items-center justify-center hover:bg-[#00b894]/30 text-sm"
              >
                {isPlaying ? '\u23F8' : '\u25B6'}
              </button>
              <input
                type="range" min={0} max={result.turns.length - 1} value={currentTurn}
                onChange={e => {
                  if (isPlaying) togglePlayback();
                  setCurrentTurn(Number(e.target.value));
                }}
                className="flex-1 accent-[#00b894] h-1.5 bg-[#25253e] rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#00b894]"
              />
              <span className="text-xs text-[#e0e0ff]/60 font-mono min-w-[80px] text-right">
                Turn {currentTurn + 1} / {result.turns.length}
              </span>
              <button onClick={handleReset} className="text-xs text-[#e0e0ff]/40 hover:text-[#e0e0ff]/70 ml-2">
                New Sim
              </button>
            </div>

            {/* Global stats bar */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
              {[
                { label: 'Population', value: currentSnapshot.population, color: '#6c5ce7' },
                { label: 'Avg Mood', value: `${Math.round(currentSnapshot.avgMood)}%`, color: '#ffd43b' },
                { label: 'Avg Health', value: `${Math.round(currentSnapshot.avgHealth)}%`, color: '#00b894' },
                { label: 'Tension', value: `${Math.round(currentSnapshot.tension * 100)}%`, color: '#ff6b6b' },
                { label: 'Prosperity', value: `${Math.round(currentSnapshot.prosperity * 100)}%`, color: '#00cec9' },
                { label: 'Cohesion', value: `${Math.round(currentSnapshot.cohesion * 100)}%`, color: '#a29bfe' },
              ].map(stat => (
                <div key={stat.label} className="rounded-lg border border-[#25253e]/60 bg-[#0a0a1a]/50 p-2 text-center">
                  <div className="text-[9px] text-[#e0e0ff]/40">{stat.label}</div>
                  <div className="text-sm font-bold" style={{ color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Result tabs */}
            <div className="flex gap-1 mb-4 rounded-xl bg-[#1a1a2e]/60 p-1 w-fit">
              {resultTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'bg-[#00b894]/20 text-[#00cec9] border border-[#00b894]/30'
                      : 'text-[#e0e0ff]/40 hover:text-[#e0e0ff]/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              {activeTab === 'map' && (
                <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <VillageMap zones={result.zones} snapshot={currentSnapshot} />
                </motion.div>
              )}
              {activeTab === 'dashboard' && (
                <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <VillageDashboard turns={result.turns} currentTurn={currentTurn} config={result.config} />
                </motion.div>
              )}
              {activeTab === 'timeline' && (
                <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <VillageTimeline turns={result.turns} currentTurn={currentTurn} />
                </motion.div>
              )}
              {activeTab === 'network' && (
                <motion.div key="network" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <VillageNetwork zones={result.zones} snapshot={currentSnapshot} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Final narrative (show on last turn) */}
            {currentTurn === result.turns.length - 1 && (
              <motion.div
                className="mt-6 rounded-2xl border border-[#25253e] bg-[#1a1a2e]/50 p-5"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              >
                <h3 className="text-sm font-bold text-[#00b894] mb-2">Simulation Summary</h3>
                <p className="text-xs text-[#e0e0ff]/70 leading-relaxed">{result.finalNarrative}</p>
                {result.insights.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {result.insights.map((insight, i) => (
                      <div key={i} className="flex items-start gap-2 text-[10px] text-[#e0e0ff]/50">
                        <span className="text-[#ffd43b] mt-0.5">*</span>
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
