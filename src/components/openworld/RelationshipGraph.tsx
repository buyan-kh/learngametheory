'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { OpenWorldPlayer, OpenWorldRelationship } from '@/lib/types';

const RELATIONSHIP_COLORS: Record<string, string> = {
  alliance: '#00b894',
  trade: '#fdcb6e',
  neutral: '#e0e0ff30',
  rivalry: '#ff7675',
  threat: '#ff6b6b',
  dependency: '#74b9ff',
};

interface Props {
  players: OpenWorldPlayer[];
  relationships: OpenWorldRelationship[];
  selectedPlayerId: string | null;
  onSelectPlayer: (id: string | null) => void;
  compact?: boolean;
}

export default function RelationshipGraph({
  players,
  relationships,
  selectedPlayerId,
  onSelectPlayer,
  compact = false,
}: Props) {
  const size = compact ? 240 : 400;
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = compact ? 85 : 150;

  // Compute player positions in a circle
  const playerPositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    const count = players.length;
    players.forEach((p, i) => {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      positions[p.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    });
    return positions;
  }, [players, centerX, centerY, radius]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0">
        {/* Relationship lines */}
        {relationships.map((rel, i) => {
          const from = playerPositions[rel.fromId];
          const to = playerPositions[rel.toId];
          if (!from || !to) return null;

          const isSelected = selectedPlayerId === rel.fromId || selectedPlayerId === rel.toId;
          const color = RELATIONSHIP_COLORS[rel.type] ?? '#e0e0ff30';
          const width = Math.max(1, Math.abs(rel.strength) * (compact ? 3 : 4));
          const opacity = isSelected ? 0.8 : selectedPlayerId ? 0.15 : 0.4;

          return (
            <g key={i}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={color}
                strokeWidth={width}
                opacity={opacity}
                strokeDasharray={rel.strength < 0 ? '4,3' : undefined}
              />
              {/* Relationship label */}
              {!compact && (
                <text
                  x={(from.x + to.x) / 2}
                  y={(from.y + to.y) / 2 - 6}
                  fill={color}
                  fontSize={8}
                  textAnchor="middle"
                  opacity={isSelected ? 0.8 : 0.3}
                >
                  {rel.type} ({rel.strength > 0 ? '+' : ''}{rel.strength.toFixed(1)})
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Player nodes */}
      {players.map((player) => {
        const pos = playerPositions[player.id];
        if (!pos) return null;

        const isSelected = selectedPlayerId === player.id;
        const isDimmed = selectedPlayerId && !isSelected;
        const nodeSize = compact ? 28 : 40;

        return (
          <motion.button
            key={player.id}
            className="absolute flex flex-col items-center"
            style={{
              left: pos.x - nodeSize / 2,
              top: pos.y - nodeSize / 2,
              width: nodeSize,
              opacity: isDimmed ? 0.3 : 1,
            }}
            onClick={() => onSelectPlayer(isSelected ? null : player.id)}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.95 }}
          >
            <div
              className="rounded-full flex items-center justify-center border-2 transition-all"
              style={{
                width: nodeSize,
                height: nodeSize,
                backgroundColor: player.color + '20',
                borderColor: isSelected ? player.color : player.color + '60',
                boxShadow: isSelected ? `0 0 12px ${player.color}40` : undefined,
              }}
            >
              <span style={{ fontSize: compact ? 14 : 18 }}>{player.emoji}</span>
            </div>
            {!compact && (
              <span
                className="text-[9px] mt-1 text-center whitespace-nowrap max-w-[60px] truncate"
                style={{ color: player.color }}
              >
                {player.name}
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
