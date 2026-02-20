'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  signIn,
  signUp,
  signInWithGoogle,
} from '@/lib/supabase-auth';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if (mode === 'signin') {
      const { error: err } = await signIn(email, password);
      if (err) {
        setError(err.message);
      } else {
        router.push('/');
      }
    } else {
      const { error: err } = await signUp(email, password);
      if (err) {
        setError(err.message);
      } else {
        setMessage('Check your email to confirm your account.');
      }
    }

    setLoading(false);
  };

  const handleGoogle = async () => {
    setError(null);
    await signInWithGoogle();
  };

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#6c5ce7] rounded-full opacity-[0.03] blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#00b894] rounded-full opacity-[0.03] blur-3xl" />
      </div>

      <motion.div
        className="relative z-10 w-full max-w-sm mx-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            className="text-4xl mb-3"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            🎮
          </motion.div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] bg-clip-text text-transparent">
            Game Theory Lab
          </h1>
          <p className="text-xs opacity-40 mt-1">
            Analyze scenarios through the lens of game theory
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#25253e] bg-[#1a1a2e]/80 backdrop-blur-xl p-6">
          <h2 className="text-sm font-bold text-center mb-5">
            {mode === 'signin' ? 'Welcome back' : 'Create an account'}
          </h2>

          {/* Google OAuth */}
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#25253e] bg-[#0a0a1a]/60 hover:border-[#6c5ce7]/40 hover:bg-[#6c5ce710] transition-all text-xs font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path
                fill="#4285f4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34a853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#fbbc05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#ea4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-[#25253e]" />
            <span className="text-[10px] opacity-30 uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-[#25253e]" />
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[10px] font-medium opacity-50 mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border border-[#25253e] bg-[#0a0a1a]/60 text-xs focus:border-[#6c5ce7] focus:outline-none focus:ring-1 focus:ring-[#6c5ce7]/30 transition-all placeholder:opacity-30"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium opacity-50 mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 rounded-lg border border-[#25253e] bg-[#0a0a1a]/60 text-xs focus:border-[#6c5ce7] focus:outline-none focus:ring-1 focus:ring-[#6c5ce7]/30 transition-all placeholder:opacity-30"
                placeholder="Min 6 characters"
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[10px] text-[#ff6b6b] bg-[#ff6b6b08] border border-[#ff6b6b20] rounded-lg px-3 py-2"
              >
                {error}
              </motion.p>
            )}

            {message && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[10px] text-[#51cf66] bg-[#51cf6608] border border-[#51cf6620] rounded-lg px-3 py-2"
              >
                {message}
              </motion.p>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-[#6c5ce7] hover:bg-[#5a4bd6] text-white text-xs font-bold transition-colors disabled:opacity-50"
              whileTap={{ scale: 0.98 }}
            >
              {loading
                ? 'Loading...'
                : mode === 'signin'
                  ? 'Sign In'
                  : 'Create Account'}
            </motion.button>
          </form>

          {/* Toggle mode */}
          <p className="text-center text-[10px] opacity-40 mt-4">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
                setMessage(null);
              }}
              className="text-[#a29bfe] hover:text-white font-medium transition-colors"
            >
              {mode === 'signin' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </motion.div>
    </main>
  );
}
