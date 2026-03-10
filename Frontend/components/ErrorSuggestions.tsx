"use client"

import { motion, AnimatePresence } from 'framer-motion';

interface ErrorSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  visible: boolean;
}

export function ErrorSuggestions({ suggestions, onSelect, visible }: ErrorSuggestionsProps) {
  if (!visible || suggestions.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute z-50 w-full mt-1 bg-slate-950/95 border border-cyan-400/25 rounded-lg shadow-lg max-h-60 overflow-y-auto backdrop-blur-md"
      >
        <div className="px-3 py-2 bg-cyan-500/10 border-b border-cyan-400/20">
          <p className="text-xs font-semibold text-cyan-300">💡 Similar Issues</p>
        </div>
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onMouseDown={(e) => {
              // Prevent blur event from firing on the textarea
              e.preventDefault();
              onSelect(suggestion);
            }}
            onClick={(e) => {
              // Also handle click for accessibility
              e.preventDefault();
              onSelect(suggestion);
            }}
            className="w-full text-left px-4 py-3 hover:bg-cyan-500/10 transition-colors border-b border-cyan-400/10 last:border-b-0 focus:bg-cyan-500/10 focus:outline-none cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 text-xs">→</span>
              <span className="text-sm text-gray-100">{suggestion}</span>
            </div>
          </button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}

