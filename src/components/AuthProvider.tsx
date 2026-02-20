'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  signIn as authSignIn,
  signUp as authSignUp,
  signOut as authSignOut,
  getSession,
  onAuthStateChange,
  type User,
} from '@/lib/supabase-auth';
import { GamepadIcon } from '@/components/icons';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: { message: string } | null }>;
  signUp: (email: string, password: string) => Promise<{ error: { message: string } | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data } = onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    const { error } = await authSignIn(email, password);
    return { error: error ? { message: error.message } : null };
  };

  const handleSignUp = async (email: string, password: string) => {
    const { error } = await authSignUp(email, password);
    return { error: error ? { message: error.message } : null };
  };

  const handleSignOut = async () => {
    await authSignOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signOut: handleSignOut,
      }}
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="auth-loading"
            className="fixed inset-0 flex items-center justify-center bg-[var(--background)]"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="flex flex-col items-center gap-3"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div className="text-3xl"><GamepadIcon size="1.2em" /></div>
              <div className="text-xs text-[var(--accent-light)] opacity-60">Loading...</div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="auth-loaded"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
