'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import { useStore } from '@/lib/store';
import { AppMode } from '@/lib/types';
import { MicroscopeIcon, SimulateIcon, ScalesIcon, GamepadIcon, FolderIcon } from '@/components/icons';

const modes: { key: AppMode; label: string; icon: ReactNode }[] = [
  { key: 'analyze', label: 'Analyze', icon: <MicroscopeIcon /> },
  { key: 'simulate', label: 'Simulate', icon: <SimulateIcon /> },
  { key: 'compare', label: 'Compare', icon: <ScalesIcon /> },
];

export default function Header() {
  const { user, loading, signOut } = useAuth();
  const {
    appMode,
    setAppMode,
    showSavedPanel,
    setShowSavedPanel,
    setShowAuthModal,
    savedScenarios,
  } = useStore();

  const truncateEmail = (email: string, maxLen = 20) => {
    if (email.length <= maxLen) return email;
    const [local, domain] = email.split('@');
    if (!domain) return email.slice(0, maxLen) + '...';
    const truncatedLocal = local.slice(0, Math.max(3, maxLen - domain.length - 4));
    return `${truncatedLocal}...@${domain}`;
  };

  return (
    <motion.header
      className="sticky top-0 z-40 w-full border-b border-[#25253e]/60 bg-[#0a0a1a]/80 backdrop-blur-xl"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Left: Logo */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <span className="text-xl leading-none"><GamepadIcon /></span>
          <span className="text-sm font-bold bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] bg-clip-text text-transparent whitespace-nowrap">
            Game Theory Lab
          </span>
        </div>

        {/* Center: Mode tabs */}
        <nav className="flex items-center gap-1 rounded-xl bg-[#1a1a2e]/60 p-1">
          {modes.map((mode) => (
            <button
              key={mode.key}
              onClick={() => setAppMode(mode.key)}
              className="relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                color: appMode === mode.key ? '#e0e0ff' : '#e0e0ff80',
              }}
            >
              {appMode === mode.key && (
                <motion.div
                  className="absolute inset-0 rounded-lg bg-[#6c5ce7]/20 border border-[#6c5ce7]/30"
                  layoutId="active-mode-pill"
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                />
              )}
              <span className="relative z-10">{mode.icon}</span>
              <span className="relative z-10 hidden sm:inline">{mode.label}</span>
            </button>
          ))}
        </nav>

        {/* Right: User area */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          {/* History link */}
          <Link
            href="/history"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-sm text-[#e0e0ff]/40 hover:text-[#e0e0ff]/70 hover:bg-[#25253e]/50 transition-colors"
            title="Analysis history"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </Link>

          {/* Saved scenarios toggle */}
          <button
            onClick={() => setShowSavedPanel(!showSavedPanel)}
            className={`relative flex items-center justify-center w-8 h-8 rounded-lg text-sm transition-colors ${showSavedPanel
                ? 'bg-[#6c5ce7]/20 text-[#a29bfe]'
                : 'text-[#e0e0ff]/40 hover:text-[#e0e0ff]/70 hover:bg-[#25253e]/50'
              }`}
            title="Saved scenarios"
          >
            <FolderIcon />
            {savedScenarios.length > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[#6c5ce7] text-[10px] font-bold text-white leading-none">
                {savedScenarios.length > 99 ? '99+' : savedScenarios.length}
              </span>
            )}
          </button>

          {/* Auth section */}
          {loading ? (
            <div className="w-16 h-8 rounded-lg bg-[#25253e]/50 animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-2">
              <span
                className="hidden md:inline text-xs text-[#e0e0ff]/50 max-w-[140px] truncate"
                title={user.email ?? ''}
              >
                {user.email ? truncateEmail(user.email) : 'User'}
              </span>
              <button
                onClick={() => signOut()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#e0e0ff]/50 hover:text-[#ff6b6b] hover:bg-[#ff6b6b]/10 border border-transparent hover:border-[#ff6b6b]/20 transition-all"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <motion.button
              onClick={() => setShowAuthModal(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#a29bfe] hover:text-white bg-[#6c5ce7]/10 hover:bg-[#6c5ce7]/20 border border-[#6c5ce7]/20 hover:border-[#6c5ce7]/40 transition-all"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              Sign In
            </motion.button>
          )}
        </div>
      </div>
    </motion.header>
  );
}
