'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import ComparisonView from '@/components/ComparisonView';

export default function ComparePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-[#e17055] rounded-full opacity-[0.03] blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-[#0984e3] rounded-full opacity-[0.03] blur-3xl" />
      </div>

      <Header />

      <div className="relative z-10 px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <span>&#x2696;&#xFE0F;</span> Comparison Mode
              </h1>
              <p className="text-xs opacity-40 mt-1">
                Compare game theory analyses side by side
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="text-xs px-3 py-1.5 rounded-full border border-[#25253e] hover:border-[#6c5ce7] text-[#a29bfe] transition-all"
            >
              Back to Lab
            </button>
          </div>
          <ComparisonView />
        </motion.div>
      </div>
    </main>
  );
}
