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
        className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
      >
        <div className="px-3 py-2 bg-purple-50 border-b border-gray-200">
          <p className="text-xs font-semibold text-purple-700">💡 Similar Issues</p>
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
            className="w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0 focus:bg-purple-50 focus:outline-none cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-purple-600 text-xs">→</span>
              <span className="text-sm text-gray-900">{suggestion}</span>
            </div>
          </button>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}

