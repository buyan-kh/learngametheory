'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';

const EXAMPLE_SCENARIOS = [
  "Two roommates deciding whether to clean the apartment or leave it messy",
  "Three companies bidding for a government contract",
  "Two countries deciding whether to impose trade tariffs on each other",
  "A seller and buyer negotiating the price of a used car",
  "Students in a group project deciding how much effort to put in",
  "Two coffee shops on the same street setting their prices",
];

export default function ScenarioInput() {
  const { input, setInput, isAnalyzing, setIsAnalyzing, setAnalysis, setError, isRecording, setIsRecording, addToHistory } = useStore();
  const [showExamples, setShowExamples] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!input.trim() || isAnalyzing) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Analysis failed');
      }

      const { analysis } = await res.json();
      setAnalysis(analysis);
      addToHistory(input.trim(), analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsAnalyzing(false);
    }
  }, [input, isAnalyzing, setIsAnalyzing, setError, setAnalysis]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setInput(transcript);
    };

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [isRecording, setIsRecording, setInput, setError]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [input]);

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="relative">
        {/* Input area */}
        <div className="relative rounded-2xl border border-[#25253e] bg-[#1a1a2e]/80 backdrop-blur-sm overflow-hidden glow-accent transition-all focus-within:border-[#6c5ce7]">
          <textarea
            ref={textareaRef}
            className="w-full bg-transparent px-5 pt-5 pb-14 text-sm text-[#e0e0ff] placeholder:text-[#e0e0ff30] resize-none outline-none min-h-[100px]"
            placeholder="Describe a situation, negotiation, or conflict to analyze...&#10;&#10;e.g. &quot;Two roommates deciding whether to clean the apartment or leave it messy&quot;"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleAnalyze();
              }
            }}
          />

          {/* Bottom bar */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2 bg-[#1a1a2e]/60">
            <div className="flex items-center gap-2">
              {/* Voice button */}
              <button
                onClick={toggleRecording}
                className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isRecording
                    ? 'bg-[#ff6b6b] text-white'
                    : 'bg-[#25253e] text-[#a29bfe] hover:bg-[#6c5ce730]'
                }`}
              >
                {isRecording && (
                  <span className="absolute inset-0 rounded-full bg-[#ff6b6b] animate-pulse-ring" />
                )}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
              </button>

              {/* Examples button */}
              <button
                onClick={() => setShowExamples(!showExamples)}
                className="text-[10px] px-2 py-1 rounded-full bg-[#25253e] text-[#a29bfe] hover:bg-[#6c5ce730] transition-all"
              >
                Examples
              </button>

              {isRecording && (
                <span className="text-[10px] text-[#ff6b6b] animate-pulse">
                  Listening...
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] opacity-30">
                {navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl'}+Enter
              </span>
              <button
                onClick={handleAnalyze}
                disabled={!input.trim() || isAnalyzing}
                className="px-4 py-1.5 rounded-full bg-[#6c5ce7] text-white text-xs font-bold hover:bg-[#5b4bd5] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                {isAnalyzing ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analyzing...
                  </span>
                ) : (
                  'Analyze'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Examples dropdown */}
        <AnimatePresence>
          {showExamples && (
            <motion.div
              className="absolute top-full left-0 right-0 mt-2 rounded-xl border border-[#25253e] bg-[#1a1a2e] overflow-hidden z-10"
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
            >
              {EXAMPLE_SCENARIOS.map((example, i) => (
                <button
                  key={i}
                  className="w-full text-left px-4 py-3 text-xs hover:bg-[#6c5ce710] transition-colors border-b border-[#25253e] last:border-0"
                  onClick={() => {
                    setInput(example);
                    setShowExamples(false);
                  }}
                >
                  <span className="opacity-30 mr-2">{i + 1}.</span>
                  {example}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
