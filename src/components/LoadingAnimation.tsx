'use client';

import { motion } from 'framer-motion';
import { GamepadIcon } from '@/components/icons';

const LOADING_MESSAGES = [
  'Identifying the players...',
  'Analyzing incentives...',
  'Computing Nash Equilibrium...',
  'Mapping strategies...',
  'Evaluating outcomes...',
  'Building payoff matrix...',
];

export default function LoadingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      {/* Pixel art loading animation */}
      <div className="relative w-32 h-32 mb-8">
        {/* Rotating pieces */}
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute w-8 h-8 rounded-lg"
            style={{
              backgroundColor: ['#6c5ce7', '#00b894', '#e17055', '#0984e3'][i],
              top: '50%',
              left: '50%',
            }}
            animate={{
              x: [
                Math.cos((i * Math.PI) / 2) * 30 - 16,
                Math.cos((i * Math.PI) / 2 + Math.PI / 2) * 30 - 16,
                Math.cos((i * Math.PI) / 2 + Math.PI) * 30 - 16,
                Math.cos((i * Math.PI) / 2 + (3 * Math.PI) / 2) * 30 - 16,
                Math.cos((i * Math.PI) / 2 + 2 * Math.PI) * 30 - 16,
              ],
              y: [
                Math.sin((i * Math.PI) / 2) * 30 - 16,
                Math.sin((i * Math.PI) / 2 + Math.PI / 2) * 30 - 16,
                Math.sin((i * Math.PI) / 2 + Math.PI) * 30 - 16,
                Math.sin((i * Math.PI) / 2 + (3 * Math.PI) / 2) * 30 - 16,
                Math.sin((i * Math.PI) / 2 + 2 * Math.PI) * 30 - 16,
              ],
              scale: [1, 1.2, 1, 0.8, 1],
              borderRadius: ['20%', '50%', '20%', '50%', '20%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
        {/* Center icon */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          <GamepadIcon size="1.5em" />
        </motion.div>
      </div>

      {/* Loading messages */}
      <div className="h-6 overflow-hidden">
        <motion.div
          animate={{ y: [0, -24, -48, -72, -96, -120, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          {LOADING_MESSAGES.map((msg, i) => (
            <div
              key={i}
              className="h-6 flex items-center justify-center text-sm text-[#a29bfe]"
            >
              {msg}
            </div>
          ))}
        </motion.div>
      </div>

      <div className="mt-4 flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#6c5ce7]"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }}
          />
        ))}
      </div>
    </div>
  );
}
