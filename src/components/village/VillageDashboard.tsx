'use client';

import { VillageTurnSnapshot, VillageConfig } from '@/lib/villageTypes';

function MiniLineChart({ data, color, height = 60, width = 280 }: {
  data: number[]; color: string; height?: number; width?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="w-full">
      <polyline
        points={points}
        fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Current value dot */}
      {data.length > 0 && (() => {
        const last = data[data.length - 1];
        const x = (data.length - 1) * step;
        const y = height - ((last - min) / range) * (height - 8) - 4;
        return <circle cx={x} cy={y} r={3} fill={color} />;
      })()}
    </svg>
  );
}

function MiniBarChart({ data, colors, labels, height = 80, width = 280 }: {
  data: number[]; colors: string[]; labels: string[]; height?: number; width?: number;
}) {
  const max = Math.max(...data, 1);
  const barW = Math.min(30, (width - (data.length - 1) * 4) / data.length);
  const totalW = data.length * barW + (data.length - 1) * 4;
  const offsetX = (width - totalW) / 2;

  return (
    <svg width={width} height={height + 20} className="w-full">
      {data.map((v, i) => {
        const barH = (v / max) * height;
        const x = offsetX + i * (barW + 4);
        const y = height - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={3} fill={colors[i % colors.length]} fillOpacity={0.6} />
            <text x={x + barW / 2} y={height + 12} fontSize={7} fill="#e0e0ff" fillOpacity={0.4} textAnchor="middle">
              {labels[i]?.slice(0, 5)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function VillageDashboard({ turns, currentTurn, config }: {
  turns: VillageTurnSnapshot[];
  currentTurn: number;
  config: VillageConfig;
}) {
  const visibleTurns = turns.slice(0, currentTurn + 1);
  const current = turns[currentTurn];
  if (!current) return null;

  const popData = visibleTurns.map(t => t.population);
  const moodData = visibleTurns.map(t => t.avgMood);
  const healthData = visibleTurns.map(t => t.avgHealth);
  const foodData = visibleTurns.map(t => t.totalFood);
  const wealthData = visibleTurns.map(t => t.totalWealth);
  const tensionData = visibleTurns.map(t => t.tension * 100);
  const prosperityData = visibleTurns.map(t => t.prosperity * 100);
  const cohesionData = visibleTurns.map(t => t.cohesion * 100);

  // Archetype data for bar chart
  const archetypes = Object.entries(current.archetypeStats).sort((a, b) => (b[1]?.count || 0) - (a[1]?.count || 0));
  const archLabels = archetypes.map(([a]) => a);
  const archCounts = archetypes.map(([, s]) => s?.count || 0);
  const archMoods = archetypes.map(([, s]) => s?.avgMood || 0);
  const archWealth = archetypes.map(([, s]) => s?.avgWealth || 0);

  const archColors = [
    '#6c5ce7', '#00b894', '#e17055', '#0984e3', '#ffd43b',
    '#a29bfe', '#ff7675', '#00cec9', '#fd79a8', '#636e72',
  ];

  return (
    <div className="space-y-4">
      {/* Line charts grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { label: 'Population', data: popData, color: '#6c5ce7' },
          { label: 'Average Mood', data: moodData, color: '#ffd43b' },
          { label: 'Average Health', data: healthData, color: '#00b894' },
          { label: 'Food Reserves', data: foodData, color: '#e17055' },
          { label: 'Total Wealth', data: wealthData, color: '#0984e3' },
          { label: 'Tension', data: tensionData, color: '#ff7675' },
          { label: 'Prosperity', data: prosperityData, color: '#00cec9' },
          { label: 'Social Cohesion', data: cohesionData, color: '#a29bfe' },
        ].map(chart => (
          <div key={chart.label} className="rounded-xl border border-[#25253e] bg-[#1a1a2e]/50 p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[9px] font-bold text-[#e0e0ff]/60">{chart.label}</span>
              <span className="text-[10px] font-mono" style={{ color: chart.color }}>
                {Math.round(chart.data[chart.data.length - 1] ?? 0)}
              </span>
            </div>
            <MiniLineChart data={chart.data} color={chart.color} />
          </div>
        ))}
      </div>

      {/* Archetype distribution */}
      <div className="rounded-xl border border-[#25253e] bg-[#1a1a2e]/50 p-4">
        <h4 className="text-[10px] font-bold text-[#e0e0ff]/60 mb-2">Population by Archetype</h4>
        <MiniBarChart data={archCounts} colors={archColors} labels={archLabels} height={60} width={500} />
      </div>

      {/* Archetype mood + wealth */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-[#25253e] bg-[#1a1a2e]/50 p-4">
          <h4 className="text-[10px] font-bold text-[#e0e0ff]/60 mb-2">Mood by Archetype</h4>
          <MiniBarChart data={archMoods} colors={archColors} labels={archLabels} height={50} width={350} />
        </div>
        <div className="rounded-xl border border-[#25253e] bg-[#1a1a2e]/50 p-4">
          <h4 className="text-[10px] font-bold text-[#e0e0ff]/60 mb-2">Wealth by Archetype</h4>
          <MiniBarChart data={archWealth} colors={archColors} labels={archLabels} height={50} width={350} />
        </div>
      </div>

      {/* Config summary */}
      <div className="rounded-xl border border-[#25253e]/40 bg-[#0a0a1a]/30 p-3">
        <div className="flex flex-wrap gap-3 text-[9px] text-[#e0e0ff]/30">
          <span>Pop: {config.populationSize}</span>
          <span>Zones: {config.zoneCount}</span>
          <span>Turns: {config.totalTurns}</span>
          <span>Scarcity: {config.scarcity}</span>
          <span>Conflict: {config.conflictTendency}</span>
          <span>Disasters: {config.disasterFrequency}</span>
        </div>
      </div>
    </div>
  );
}
