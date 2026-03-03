'use client';

import { useState } from 'react';
import { VillageZone, VillageTurnSnapshot } from '@/lib/villageTypes';

type Metric = 'population' | 'mood' | 'health' | 'food' | 'wealth' | 'safety' | 'infrastructure';

const METRIC_CONFIG: Record<Metric, { label: string; color: string; max: number }> = {
  population: { label: 'Population', color: '#6c5ce7', max: 80 },
  mood:       { label: 'Avg Mood', color: '#ffd43b', max: 100 },
  health:     { label: 'Avg Health', color: '#00b894', max: 100 },
  food:       { label: 'Food', color: '#e17055', max: 200 },
  wealth:     { label: 'Wealth', color: '#0984e3', max: 300 },
  safety:     { label: 'Safety', color: '#ff7675', max: 100 },
  infrastructure: { label: 'Infrastructure', color: '#a29bfe', max: 100 },
};

const ZONE_TYPE_EMOJI: Record<string, string> = {
  farmland: '\uD83C\uDF3E', market: '\uD83C\uDFEA', workshop: '\uD83D\uDD28',
  temple: '\u26EA', barracks: '\uD83D\uDEE1\uFE0F', manor: '\uD83C\uDFF0',
  residential: '\uD83C\uDFE0', outskirts: '\uD83C\uDF32',
};

function getMetricValue(stat: VillageTurnSnapshot['zoneStats'][string], metric: Metric): number {
  switch (metric) {
    case 'population': return stat.population;
    case 'mood': return stat.avgMood;
    case 'health': return stat.avgHealth;
    case 'food': return stat.food;
    case 'wealth': return stat.wealth;
    case 'safety': return stat.safety;
    case 'infrastructure': return stat.infrastructure;
  }
}

export default function VillageMap({ zones, snapshot }: {
  zones: VillageZone[];
  snapshot: VillageTurnSnapshot;
}) {
  const [metric, setMetric] = useState<Metric>('population');
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const config = METRIC_CONFIG[metric];

  // Compute grid dimensions
  const maxX = Math.max(...zones.map(z => z.x));
  const maxY = Math.max(...zones.map(z => z.y));
  const cellW = 160;
  const cellH = 100;
  const pad = 10;
  const svgW = (maxX + 1) * (cellW + pad) + pad;
  const svgH = (maxY + 1) * (cellH + pad) + pad;

  const selectedStat = selectedZone ? snapshot.zoneStats[selectedZone] : null;
  const selectedZoneData = selectedZone ? zones.find(z => z.id === selectedZone) : null;

  return (
    <div className="rounded-2xl border border-[#25253e] bg-[#1a1a2e]/50 p-4">
      {/* Metric selector */}
      <div className="flex flex-wrap gap-1 mb-4">
        {(Object.keys(METRIC_CONFIG) as Metric[]).map(m => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`px-2 py-1 rounded-md text-[9px] font-medium transition-colors ${
              metric === m
                ? 'text-white border'
                : 'text-[#e0e0ff]/40 border border-transparent hover:text-[#e0e0ff]/60'
            }`}
            style={metric === m ? { backgroundColor: `${METRIC_CONFIG[m].color}20`, borderColor: `${METRIC_CONFIG[m].color}50`, color: METRIC_CONFIG[m].color } : {}}
          >
            {METRIC_CONFIG[m].label}
          </button>
        ))}
      </div>

      {/* SVG Zone Map */}
      <div className="overflow-x-auto">
        <svg width={svgW} height={svgH} className="mx-auto">
          {zones.map(zone => {
            const stat = snapshot.zoneStats[zone.id];
            if (!stat) return null;
            const value = getMetricValue(stat, metric);
            const intensity = Math.min(1, value / config.max);
            const x = pad + zone.x * (cellW + pad);
            const y = pad + zone.y * (cellH + pad);
            const isSelected = selectedZone === zone.id;

            return (
              <g key={zone.id} onClick={() => setSelectedZone(isSelected ? null : zone.id)} className="cursor-pointer">
                <rect
                  x={x} y={y} width={cellW} height={cellH} rx={8}
                  fill={config.color}
                  fillOpacity={0.08 + intensity * 0.35}
                  stroke={isSelected ? config.color : '#25253e'}
                  strokeWidth={isSelected ? 2 : 1}
                />
                {/* Zone emoji */}
                <text x={x + 8} y={y + 20} fontSize={14}>
                  {ZONE_TYPE_EMOJI[zone.type] || '\uD83C\uDFE0'}
                </text>
                {/* Zone name */}
                <text x={x + 28} y={y + 20} fontSize={10} fill="#e0e0ff" fillOpacity={0.8} fontWeight="bold">
                  {zone.name}
                </text>
                {/* Population */}
                <text x={x + 8} y={y + 38} fontSize={9} fill="#e0e0ff" fillOpacity={0.5}>
                  Pop: {stat.population}
                </text>
                {/* Metric value */}
                <text x={x + 8} y={y + 54} fontSize={11} fill={config.color} fontWeight="bold">
                  {config.label}: {typeof value === 'number' ? Math.round(value) : value}
                  {metric !== 'population' && metric !== 'food' && metric !== 'wealth' ? '%' : ''}
                </text>
                {/* Mini bar */}
                <rect x={x + 8} y={y + 62} width={cellW - 16} height={4} rx={2} fill="#25253e" />
                <rect
                  x={x + 8} y={y + 62}
                  width={Math.max(0, (cellW - 16) * intensity)} height={4} rx={2}
                  fill={config.color} fillOpacity={0.7}
                />
                {/* Zone type */}
                <text x={x + 8} y={y + 82} fontSize={8} fill="#e0e0ff" fillOpacity={0.3}>
                  {zone.type}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected zone detail panel */}
      {selectedZoneData && selectedStat && (
        <div className="mt-4 rounded-xl border border-[#25253e]/60 bg-[#0a0a1a]/50 p-4">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-xs font-bold text-[#a29bfe]">
              {ZONE_TYPE_EMOJI[selectedZoneData.type]} {selectedZoneData.name}
            </h4>
            <button onClick={() => setSelectedZone(null)} className="text-[9px] text-[#e0e0ff]/30 hover:text-[#e0e0ff]/60">
              Close
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
            <div><span className="text-[#e0e0ff]/40">Population:</span> <span className="text-[#e0e0ff]/80">{selectedStat.population}</span></div>
            <div><span className="text-[#e0e0ff]/40">Avg Mood:</span> <span className="text-[#ffd43b]">{Math.round(selectedStat.avgMood)}%</span></div>
            <div><span className="text-[#e0e0ff]/40">Avg Health:</span> <span className="text-[#00b894]">{Math.round(selectedStat.avgHealth)}%</span></div>
            <div><span className="text-[#e0e0ff]/40">Food:</span> <span className="text-[#e17055]">{Math.round(selectedStat.food)}</span></div>
            <div><span className="text-[#e0e0ff]/40">Wealth:</span> <span className="text-[#0984e3]">{Math.round(selectedStat.wealth)}</span></div>
            <div><span className="text-[#e0e0ff]/40">Safety:</span> <span className="text-[#ff7675]">{Math.round(selectedStat.safety)}%</span></div>
            <div><span className="text-[#e0e0ff]/40">Infrastructure:</span> <span className="text-[#a29bfe]">{Math.round(selectedStat.infrastructure)}%</span></div>
            <div><span className="text-[#e0e0ff]/40">Type:</span> <span className="text-[#e0e0ff]/60">{selectedZoneData.type}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
