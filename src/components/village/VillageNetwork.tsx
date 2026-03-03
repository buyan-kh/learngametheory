'use client';

import { VillageZone, VillageTurnSnapshot } from '@/lib/villageTypes';

const ZONE_COLORS: Record<string, string> = {
  farmland: '#00b894', market: '#0984e3', workshop: '#e17055',
  temple: '#a29bfe', barracks: '#ff7675', manor: '#ffd43b',
  residential: '#636e72', outskirts: '#00cec9',
};

export default function VillageNetwork({ zones, snapshot }: {
  zones: VillageZone[];
  snapshot: VillageTurnSnapshot;
}) {
  const W = 600;
  const H = 400;
  const CX = W / 2;
  const CY = H / 2;
  const R = Math.min(CX, CY) - 60;

  // Arrange zones in a circle
  const positions = zones.map((_, i) => {
    const angle = (i / zones.length) * Math.PI * 2 - Math.PI / 2;
    return { x: CX + R * Math.cos(angle), y: CY + R * Math.sin(angle) };
  });

  // Node sizes based on population
  const maxPop = Math.max(...zones.map(z => snapshot.zoneStats[z.id]?.population || 1));

  return (
    <div className="rounded-2xl border border-[#25253e] bg-[#1a1a2e]/50 p-4">
      <h4 className="text-[10px] font-bold text-[#e0e0ff]/60 mb-3">
        Inter-Zone Social Connections
      </h4>
      <div className="overflow-x-auto">
        <svg width={W} height={H} className="mx-auto">
          {/* Edges */}
          {snapshot.interZoneConnections.map((conn, i) => {
            const fromIdx = zones.findIndex(z => z.id === conn.from);
            const toIdx = zones.findIndex(z => z.id === conn.to);
            if (fromIdx < 0 || toIdx < 0) return null;
            const p1 = positions[fromIdx];
            const p2 = positions[toIdx];
            const maxStrength = Math.max(
              ...snapshot.interZoneConnections.map(c => c.strength), 1,
            );
            const opacity = 0.1 + (conn.strength / maxStrength) * 0.5;
            const width = 0.5 + (conn.strength / maxStrength) * 3;
            return (
              <line
                key={i}
                x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke="#a29bfe" strokeOpacity={opacity} strokeWidth={width}
              />
            );
          })}

          {/* Nodes */}
          {zones.map((zone, i) => {
            const pos = positions[i];
            const stat = snapshot.zoneStats[zone.id];
            const pop = stat?.population || 0;
            const r = 14 + (pop / maxPop) * 20;
            const color = ZONE_COLORS[zone.type] || '#636e72';

            return (
              <g key={zone.id}>
                {/* Glow */}
                <circle cx={pos.x} cy={pos.y} r={r + 4} fill={color} fillOpacity={0.1} />
                {/* Node */}
                <circle
                  cx={pos.x} cy={pos.y} r={r}
                  fill={color} fillOpacity={0.25}
                  stroke={color} strokeWidth={1.5}
                />
                {/* Population number */}
                <text
                  x={pos.x} y={pos.y + 1}
                  fontSize={10} fill="#e0e0ff" fillOpacity={0.9}
                  textAnchor="middle" dominantBaseline="middle" fontWeight="bold"
                >
                  {pop}
                </text>
                {/* Label */}
                <text
                  x={pos.x} y={pos.y + r + 14}
                  fontSize={8} fill="#e0e0ff" fillOpacity={0.5}
                  textAnchor="middle"
                >
                  {zone.name}
                </text>
                {/* Type label */}
                <text
                  x={pos.x} y={pos.y + r + 24}
                  fontSize={7} fill={color} fillOpacity={0.5}
                  textAnchor="middle"
                >
                  {zone.type}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-3 justify-center">
        {Object.entries(ZONE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[8px] text-[#e0e0ff]/40">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
