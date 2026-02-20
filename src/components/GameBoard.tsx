'use client';

import { useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import PixelCharacter from './PixelCharacter';
import EditableList from './EditableList';
import EditableIncentiveList from './EditableIncentiveList';
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

function ConnectionLine({
  conn,
  players,
  index,
}: {
  conn: Connection;
  players: Player[];
  index: number;
}) {
  const from = players.find((p) => p.id === conn.from);
  const to = players.find((p) => p.id === conn.to);
  if (!from || !to) return null;

  const x1 = from.position.x + 24;
  const y1 = from.position.y + 24;
  const x2 = to.position.x + 24;
  const y2 = to.position.y + 24;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const color = CONNECTION_COLORS[conn.type];
  const isStrong = conn.strength > 0.6;
  const baseWidth = 2 + conn.strength * 3;

  // Deterministic animation durations based on index
  const dotDur = 1.8 + (index % 5) * 0.3;
  const pulseDur = 2 + (index % 4) * 0.5;

  return (
    <g>
      {/* Glow layer for strong connections */}
      {isStrong && (
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={color}
          strokeWidth={baseWidth + 8}
          opacity={0.12}
          filter="url(#connection-glow)"
        />
      )}

      {/* Base connection line */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={baseWidth}
        strokeDasharray={CONNECTION_DASHES[conn.type]}
        opacity={0.6 + conn.strength * 0.4}
      />

      {/* Animated flowing dot along path */}
      <circle r={3} fill={color} opacity={0.9}>
        <animateMotion
          path={`M${x1},${y1} L${x2},${y2}`}
          dur={`${dotDur}s`}
          repeatCount="indefinite"
        />
      </circle>

      {/* Second dot going reverse for strong connections */}
      {isStrong && (
        <circle r={2.5} fill={color} opacity={0.6}>
          <animateMotion
            path={`M${x2},${y2} L${x1},${y1}`}
            dur={`${dotDur * 0.8}s`}
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* Pulsing midpoint - solid center */}
      <circle cx={mx} cy={my} r={4} fill={color} opacity={0.9} />
      {/* Pulsing midpoint - expanding ring */}
      <circle
        cx={mx}
        cy={my}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
      >
        <animate
          attributeName="r"
          values="4;14;4"
          dur={`${pulseDur}s`}
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.6;0;0.6"
          dur={`${pulseDur}s`}
          repeatCount="indefinite"
        />
      </circle>

      {/* Label background */}
      <rect
        x={mx - conn.label.length * 3.5 - 4}
        y={my - 22}
        width={conn.label.length * 7 + 8}
        height={16}
        rx={4}
        fill="#1a1a2e"
        stroke={color}
        strokeWidth={1}
        opacity={0.9}
      />
      {/* Label text */}
      <text
        x={mx}
        y={my - 11}
        textAnchor="middle"
        fill={color}
        fontSize={10}
        fontFamily="monospace"
      >
        {conn.label}
      </text>
    </g>
  );
}

const FLOAT_ANIMATIONS = ['gb-float-1', 'gb-float-2', 'gb-float-3'];

export default function GameBoard() {
  const {
    analysis,
    selectedPlayer,
    setSelectedPlayer,
    updatePlayerPosition,
    addPlayerGoal,
    removePlayerGoal,
    editPlayerGoal,
    addPlayerStrategy,
    removePlayerStrategy,
    editPlayerStrategy,
    addIncentive,
    removeIncentive,
    editIncentive,
  } = useStore();
  const boardRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hoveredPlayer, setHoveredPlayer] = useState<string | null>(null);
  const [ripple, setRipple] = useState<{
    x: number;
    y: number;
    color: string;
    key: number;
  } | null>(null);

  // Generate ambient particles deterministically from player colors
  const particles = useMemo(() => {
    if (!analysis) return [];
    const colors = analysis.players.map((p) => p.color);
    return Array.from({ length: 14 }, (_, i) => ({
      id: i,
      left: `${5 + ((i * 37) % 90)}%`,
      top: `${8 + ((i * 31) % 82)}%`,
      size: 2 + (i % 3),
      color: colors[i % colors.length],
      animation: FLOAT_ANIMATIONS[i % 3],
      duration: 6 + (i % 5) * 2,
      delay: (i * 0.7) % 5,
      opacity: 0.2 + (i % 4) * 0.08,
    }));
  }, [analysis]);

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
        x: Math.max(
          0,
          Math.min(rect.width - 48, e.clientX - rect.left - dragOffset.x)
        ),
        y: Math.max(
          0,
          Math.min(rect.height - 48, e.clientY - rect.top - dragOffset.y)
        ),
      });
    },
    [dragging, dragOffset, updatePlayerPosition]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  const handlePlayerClick = useCallback(
    (player: Player) => {
      setSelectedPlayer(selectedPlayer === player.id ? null : player.id);
      setRipple({
        x: player.position.x + 24,
        y: player.position.y + 24,
        color: player.color,
        key: Date.now(),
      });
    },
    [selectedPlayer, setSelectedPlayer]
  );

  if (!analysis) return null;

  return (
    <div className="relative">
      {/* Legend */}
      <div className="flex gap-4 mb-3 px-2">
        {Object.entries(CONNECTION_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-4 h-0.5" style={{ backgroundColor: color }} />
            <span className="text-[10px] uppercase tracking-wider opacity-70">
              {type}
            </span>
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
        {/* Ambient floating particles */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full pointer-events-none gb-particle"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity: p.opacity,
              animation: `${p.animation} ${p.duration}s ease-in-out ${p.delay}s infinite`,
            }}
          />
        ))}

        {/* SVG layer for territories + connections */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            {/* Glow filter for strong connections */}
            <filter
              id="connection-glow"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
            </filter>

            {/* Territory radial gradients per player */}
            {analysis.players.map((p) => (
              <radialGradient key={p.id} id={`territory-${p.id}`}>
                <stop offset="0%" stopColor={p.color} stopOpacity={0.1} />
                <stop offset="70%" stopColor={p.color} stopOpacity={0.03} />
                <stop offset="100%" stopColor={p.color} stopOpacity={0} />
              </radialGradient>
            ))}
          </defs>

          {/* Territory / influence zones behind each player */}
          {analysis.players.map((p) => {
            const connectionCount = analysis.connections.filter(
              (c) => c.from === p.id || c.to === p.id
            ).length;
            const radius = 60 + connectionCount * 25;
            return (
              <circle
                key={`territory-${p.id}`}
                cx={p.position.x + 24}
                cy={p.position.y + 24}
                r={radius}
                fill={`url(#territory-${p.id})`}
              />
            );
          })}

          {/* Connection lines */}
          {analysis.connections.map((conn, i) => (
            <ConnectionLine
              key={i}
              conn={conn}
              players={analysis.players}
              index={i}
            />
          ))}
        </svg>

        {/* Selection ripple effect */}
        {ripple && (
          <div
            key={ripple.key}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: ripple.x - 40,
              top: ripple.y - 40,
              width: 80,
              height: 80,
              border: `2px solid ${ripple.color}`,
              animation: 'selection-ripple 0.6s ease-out forwards',
            }}
            onAnimationEnd={() => setRipple(null)}
          />
        )}

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
            onMouseEnter={() => {
              if (!dragging) setHoveredPlayer(player.id);
            }}
            onMouseLeave={() => setHoveredPlayer(null)}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
          >
            <PixelCharacter
              player={player}
              size={6}
              selected={selectedPlayer === player.id}
              onClick={() => handlePlayerClick(player)}
              animate={dragging !== player.id}
            />

            {/* Hover speech bubble with top goal */}
            <AnimatePresence>
              {hoveredPlayer === player.id &&
                !dragging &&
                selectedPlayer !== player.id &&
                player.goals.length > 0 && (
                  <motion.div
                    className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#1a1a2e]/95 backdrop-blur-sm border border-[#25253e] rounded-md px-2.5 py-1 text-[10px] pointer-events-none z-50"
                    initial={{ opacity: 0, y: 4, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.9 }}
                    transition={{ duration: 0.15 }}
                  >
                    <span className="opacity-50">💭</span>{' '}
                    <span style={{ color: player.color }}>
                      {player.goals[0]}
                    </span>
                    <div
                      className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 rotate-45 border-r border-b border-[#25253e]"
                      style={{ backgroundColor: '#1a1a2e' }}
                    />
                  </motion.div>
                )}
            </AnimatePresence>
          </motion.div>
        ))}

        {/* Selected player info overlay */}
        {selectedPlayer && (
          <motion.div
            className="absolute bottom-4 left-4 right-4 bg-[#1a1a2e]/95 backdrop-blur-sm border border-[#25253e] rounded-lg p-4 max-h-[280px] overflow-y-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {(() => {
              const player = analysis.players.find(
                (p) => p.id === selectedPlayer
              );
              if (!player) return null;
              const playerIncentives = analysis.incentives.filter(
                (i) => i.playerId === player.id
              );
              return (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <h4
                      className="font-bold text-sm"
                      style={{ color: player.color }}
                    >
                      {player.emoji} {player.name}
                    </h4>
                    <p className="text-xs opacity-70 mt-1">{player.role}</p>
                    <div className="mt-2">
                      <EditableList
                        items={player.goals}
                        label="Goals"
                        color={player.color}
                        onAdd={(goal) => addPlayerGoal(player.id, goal)}
                        onRemove={(index) => removePlayerGoal(player.id, index)}
                        onEdit={(index, newGoal) => editPlayerGoal(player.id, index, newGoal)}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <EditableIncentiveList
                      incentives={playerIncentives}
                      playerId={player.id}
                      color={player.color}
                      onAdd={(incentive, strength) => addIncentive(player.id, incentive, strength)}
                      onRemove={(index) => removeIncentive(player.id, index)}
                      onEdit={(index, updates) => editIncentive(player.id, index, updates)}
                    />
                  </div>
                  <div className="flex-1">
                    <EditableList
                      items={player.strategies}
                      label="Strategies"
                      color={player.color}
                      onAdd={(strategy) => addPlayerStrategy(player.id, strategy)}
                      onRemove={(index) => removePlayerStrategy(player.id, index)}
                      onEdit={(index, newName) => editPlayerStrategy(player.id, index, newName)}
                      minItems={1}
                    />
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
