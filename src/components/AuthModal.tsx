'use client';

import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import { useStore } from '@/lib/store';
import { KeyIcon, SparklesIcon } from '@/components/icons';

export default function AuthModal() {
  const { signIn, signUp } = useAuth();
  const { showAuthModal, setShowAuthModal } = useStore();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setError(null);
    setIsLoading(false);
  };

  const handleClose = () => {
    resetForm();
    setShowAuthModal(false);
  };

  const handleToggleMode = () => {
    setError(null);
    setMode(mode === 'signin' ? 'signup' : 'signin');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const authFn = mode === 'signin' ? signIn : signUp;
      const { error: authError } = await authFn(email, password);

      if (authError) {
        setError(authError.message);
        setIsLoading(false);
      } else {
        resetForm();
        setShowAuthModal(false);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {showAuthModal && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-sm rounded-2xl border border-[#25253e] bg-[#1a1a2e] p-6 shadow-2xl"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-[#e0e0ff]/40 hover:text-[#e0e0ff] transition-colors text-lg leading-none"
              aria-label="Close"
            >
              &times;
            </button>

            {/* Header */}
            <div className="text-center mb-6">
              <div className="text-2xl mb-2">
                {mode === 'signin' ? <KeyIcon size="1.5em" /> : <SparklesIcon size="1.5em" />}
              </div>
              <h2 className="text-lg font-bold text-[#e0e0ff]">
                {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-xs text-[#e0e0ff]/40 mt-1">
                {mode === 'signin'
                  ? 'Sign in to save and manage your scenarios'
                  : 'Join to save your game theory analyses'}
              </p>
            </div>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  className="mb-4 p-3 rounded-lg border border-[#ff6b6b]/20 bg-[#ff6b6b]/5 text-xs text-[#ff6b6b]"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-xs font-medium text-[#a29bfe] mb-1.5"
                >
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 rounded-lg border border-[#25253e] bg-[#0a0a1a] text-sm text-[#e0e0ff] placeholder-[#e0e0ff]/20 focus:outline-none focus:border-[#6c5ce7] focus:ring-1 focus:ring-[#6c5ce7]/30 transition-colors"
                  autoComplete="email"
                />
              </div>

              <div>
                <label
                  htmlFor="auth-password"
                  className="block text-xs font-medium text-[#a29bfe] mb-1.5"
                >
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder={mode === 'signup' ? 'Min 6 characters' : 'Enter your password'}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#25253e] bg-[#0a0a1a] text-sm text-[#e0e0ff] placeholder-[#e0e0ff]/20 focus:outline-none focus:border-[#6c5ce7] focus:ring-1 focus:ring-[#6c5ce7]/30 transition-colors"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                />
              </div>

              <motion.button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-lg font-semibold text-sm text-white bg-[#6c5ce7] hover:bg-[#5a4bd6] disabled:opacity-50 disabled:cursor-not-allowed transition-colors glow-accent"
                whileHover={!isLoading ? { scale: 1.01 } : undefined}
                whileTap={!isLoading ? { scale: 0.98 } : undefined}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    />
                    {mode === 'signin' ? 'Signing in...' : 'Creating account...'}
                  </span>
                ) : (
                  mode === 'signin' ? 'Sign In' : 'Create Account'
                )}
              </motion.button>
            </form>

            {/* Toggle mode */}
            <div className="mt-5 text-center">
              <span className="text-xs text-[#e0e0ff]/40">
                {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
              </span>
              <button
                onClick={handleToggleMode}
                className="text-xs text-[#a29bfe] hover:text-[#6c5ce7] font-medium transition-colors"
              >
                {mode === 'signin' ? 'Sign Up' : 'Sign In'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
