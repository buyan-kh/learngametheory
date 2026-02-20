'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import SimulationView from '@/components/SimulationView';

export default function SimulationPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#00b894] rounded-full opacity-[0.03] blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#6c5ce7] rounded-full opacity-[0.03] blur-3xl" />
      </div>

      <Header />

      <div className="relative z-10 px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="max-w-5xl mx-auto mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <span>🔄</span> Simulation Mode
              </h1>
              <p className="text-xs opacity-40 mt-1">
                Run iterated games and watch strategies evolve
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="text-xs px-3 py-1.5 rounded-full border border-[#25253e] hover:border-[#6c5ce7] text-[#a29bfe] transition-all"
            >
              Back to Lab
            </button>
          </div>
          <SimulationView />
        </motion.div>
      </div>
    </main>
  );
}
