'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import PixelCharacter from './PixelCharacter';
import { Connection, Player } from '@/lib/types';

const CONNECTION_COLORS = {
  cooperation: '#51cf66',
  competition: '#ff6b6b',
  dependency: '#74c0fc',
  negotiation: '#ffd43b',
};

const CONNECTION_DASHES = {
  cooperation: '',
  competition: '8,4',
  dependency: '4,4',
  negotiation: '12,4,4,4',
};

function ConnectionLine({ conn, players }: { conn: Connection; players: Player[] }) {
  const from = players.find((p) => p.id === conn.from);
  const to = players.find((p) => p.id === conn.to);
  if (!from || !to) return null;

  const x1 = from.position.x + 24;
  const y1 = from.position.y + 24;
  const x2 = to.position.x + 24;
  const y2 = to.position.y + 24;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;

  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={CONNECTION_COLORS[conn.type]}
        strokeWidth={2 + conn.strength * 3}
        strokeDasharray={CONNECTION_DASHES[conn.type]}
        opacity={0.6 + conn.strength * 0.4}
      />
      {/* Arrow head */}
      <circle
        cx={mx}
        cy={my}
        r={4}
        fill={CONNECTION_COLORS[conn.type]}
      />
      {/* Label */}
      <rect
        x={mx - conn.label.length * 3.5 - 4}
        y={my - 22}
        width={conn.label.length * 7 + 8}
        height={16}
        rx={4}
        fill="#1a1a2e"
        stroke={CONNECTION_COLORS[conn.type]}
        strokeWidth={1}
        opacity={0.9}
      />
      <text
        x={mx}
        y={my - 11}
        textAnchor="middle"
        fill={CONNECTION_COLORS[conn.type]}
        fontSize={10}
        fontFamily="monospace"
      >
        {conn.label}
      </text>
    </g>
  );
}

export default function GameBoard() {
  const { analysis, selectedPlayer, setSelectedPlayer, updatePlayerPosition } = useStore();
  const boardRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (playerId: string, e: React.MouseEvent) => {
      e.preventDefault();
      const player = analysis?.players.find((p) => p.id === playerId);
      if (!player || !boardRef.current) return;

      const rect = boardRef.current.getBoundingClientRect();
      setDragging(playerId);
      setDragOffset({
        x: e.clientX - rect.left - player.position.x,
        y: e.clientY - rect.top - player.position.y,
      });
    },
    [analysis]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      updatePlayerPosition(dragging, {
        x: Math.max(0, Math.min(rect.width - 48, e.clientX - rect.left - dragOffset.x)),
        y: Math.max(0, Math.min(rect.height - 48, e.clientY - rect.top - dragOffset.y)),
      });
    },
    [dragging, dragOffset, updatePlayerPosition]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  if (!analysis) return null;

  return (
    <div className="relative">
      {/* Legend */}
      <div className="flex gap-4 mb-3 px-2">
        {Object.entries(CONNECTION_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-4 h-0.5" style={{ backgroundColor: color }} />
            <span className="text-[10px] uppercase tracking-wider opacity-70">{type}</span>
          </div>
        ))}
      </div>

      <div
        ref={boardRef}
        className="relative w-full h-[500px] rounded-xl border border-[#25253e] bg-[#0d0d20] grid-bg overflow-hidden scanlines"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* SVG layer for connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {analysis.connections.map((conn, i) => (
            <ConnectionLine key={i} conn={conn} players={analysis.players} />
          ))}
        </svg>

        {/* Players */}
        {analysis.players.map((player) => (
          <motion.div
            key={player.id}
            className="absolute cursor-grab active:cursor-grabbing"
            style={{
              left: player.position.x,
              top: player.position.y,
            }}
            onMouseDown={(e) => handleMouseDown(player.id, e)}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
          >
            <PixelCharacter
              player={player}
              size={6}
              selected={selectedPlayer === player.id}
              onClick={() => setSelectedPlayer(selectedPlayer === player.id ? null : player.id)}
              animate={dragging !== player.id}
            />
          </motion.div>
        ))}

        {/* Selected player info overlay */}
        {selectedPlayer && (
          <motion.div
            className="absolute bottom-4 left-4 right-4 bg-[#1a1a2e]/95 backdrop-blur-sm border border-[#25253e] rounded-lg p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {(() => {
              const player = analysis.players.find((p) => p.id === selectedPlayer);
              if (!player) return null;
              const playerIncentives = analysis.incentives.filter((i) => i.playerId === player.id);
              return (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <h4 className="font-bold text-sm" style={{ color: player.color }}>
                      {player.emoji} {player.name}
                    </h4>
                    <p className="text-xs opacity-70 mt-1">{player.role}</p>
                    <div className="mt-2">
                      <span className="text-[10px] uppercase tracking-wider opacity-50">Goals</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {player.goals.map((g, i) => (
                          <span
                            key={i}
                            className="text-[10px] px-1.5 py-0.5 rounded-full border"
                            style={{ borderColor: player.color + '40', color: player.color }}
                          >
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] uppercase tracking-wider opacity-50">Incentives</span>
                    {playerIncentives.map((inc, i) => (
                      <div key={i} className="mt-1">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[#25253e] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${inc.strength * 100}%`,
                                backgroundColor: player.color,
                              }}
                            />
                          </div>
                          <span className="text-[10px] opacity-70 w-6 text-right">
                            {Math.round(inc.strength * 100)}%
                          </span>
                        </div>
                        <p className="text-[10px] opacity-60 mt-0.5">{inc.incentive}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] uppercase tracking-wider opacity-50">Strategies</span>
                    <div className="flex flex-col gap-1 mt-1">
                      {player.strategies.map((s, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-[#25253e]"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </div>
    </div>
  );
}
