'use client';

import { motion } from 'framer-motion';
import { Player } from '@/lib/types';

// Pixel art character patterns - each is an 8x8 grid
// 0 = transparent, 1 = skin, 2 = primary color, 3 = dark/hair, 4 = eye, 5 = accent
const CHARACTER_PATTERNS = [
  // Standing character
  [
    [0,0,3,3,3,3,0,0],
    [0,3,3,3,3,3,3,0],
    [0,1,1,1,1,1,1,0],
    [0,1,4,1,1,4,1,0],
    [0,1,1,1,1,1,1,0],
    [0,0,1,5,5,1,0,0],
    [0,2,2,2,2,2,2,0],
    [0,2,0,2,2,0,2,0],
  ],
  // Character with hat
  [
    [0,2,2,2,2,2,2,0],
    [2,2,2,2,2,2,2,2],
    [0,1,1,1,1,1,1,0],
    [0,1,4,1,1,4,1,0],
    [0,1,1,1,1,1,1,0],
    [0,0,1,5,5,1,0,0],
    [0,0,2,2,2,2,0,0],
    [0,2,0,2,2,0,2,0],
  ],
  // Character with spiky hair
  [
    [3,0,3,0,3,0,3,0],
    [0,3,3,3,3,3,3,0],
    [0,1,1,1,1,1,1,0],
    [0,1,4,1,1,4,1,0],
    [0,1,1,1,1,1,1,0],
    [0,0,1,5,5,1,0,0],
    [0,2,2,2,2,2,2,0],
    [0,2,0,2,2,0,2,0],
  ],
  // Character with crown
  [
    [0,5,0,5,5,0,5,0],
    [0,5,5,5,5,5,5,0],
    [0,1,1,1,1,1,1,0],
    [0,1,4,1,1,4,1,0],
    [0,1,1,1,1,1,1,0],
    [0,0,1,5,5,1,0,0],
    [0,2,2,2,2,2,2,0],
    [0,2,0,2,2,0,2,0],
  ],
  // Character with glasses
  [
    [0,0,3,3,3,3,0,0],
    [0,3,3,3,3,3,3,0],
    [0,1,1,1,1,1,1,0],
    [5,5,4,5,5,4,5,5],
    [0,1,1,1,1,1,1,0],
    [0,0,1,5,5,1,0,0],
    [0,2,2,2,2,2,2,0],
    [0,2,0,2,2,0,2,0],
  ],
];

function getColorForIndex(value: number, playerColor: string): string {
  const darken = (hex: string, amount: number) => {
    const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
    const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
    const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
    return `rgb(${r},${g},${b})`;
  };

  switch (value) {
    case 0: return 'transparent';
    case 1: return '#ffd5b4'; // skin
    case 2: return playerColor; // primary
    case 3: return darken(playerColor, 80); // dark
    case 4: return '#1a1a2e'; // eyes
    case 5: return '#ffd43b'; // accent
    default: return 'transparent';
  }
}

interface PixelCharacterProps {
  player: Player;
  size?: number;
  selected?: boolean;
  onClick?: () => void;
  showLabel?: boolean;
  animate?: boolean;
}

export default function PixelCharacter({
  player,
  size = 6,
  selected = false,
  onClick,
  showLabel = true,
  animate = true,
}: PixelCharacterProps) {
  const patternIndex = Math.abs(player.id.charCodeAt(player.id.length - 1)) % CHARACTER_PATTERNS.length;
  const pattern = CHARACTER_PATTERNS[patternIndex];

  return (
    <motion.div
      className="flex flex-col items-center cursor-pointer select-none"
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      animate={animate ? { y: [0, -4, 0] } : undefined}
      transition={animate ? { duration: 2, repeat: Infinity, ease: 'easeInOut', delay: Math.random() * 2 } : undefined}
    >
      <div
        className={`relative pixel-art transition-all duration-300 ${
          selected ? 'ring-2 ring-offset-2 ring-offset-[#0a0a1a]' : ''
        }`}
        style={{
          width: size * 8,
          height: size * 8,
          ...(selected ? { ringColor: player.color } : {}),
        }}
      >
        {/* Glow effect when selected */}
        {selected && (
          <div
            className="absolute inset-0 rounded-lg blur-md opacity-50"
            style={{ backgroundColor: player.color }}
          />
        )}
        {/* Pixel grid */}
        <div className="relative" style={{ width: size * 8, height: size * 8 }}>
          {pattern.map((row, y) =>
            row.map((cell, x) => {
              if (cell === 0) return null;
              return (
                <div
                  key={`${x}-${y}`}
                  className="absolute"
                  style={{
                    left: x * size,
                    top: y * size,
                    width: size,
                    height: size,
                    backgroundColor: getColorForIndex(cell, player.color),
                  }}
                />
              );
            })
          )}
        </div>
        {/* Emoji badge */}
        <div
          className="absolute -top-2 -right-2 text-sm"
          style={{ fontSize: size * 2 }}
        >
          {player.emoji}
        </div>
      </div>
      {showLabel && (
        <div className="mt-2 text-center">
          <div
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: player.color + '30', color: player.color }}
          >
            {player.name}
          </div>
        </div>
      )}
    </motion.div>
  );
}
