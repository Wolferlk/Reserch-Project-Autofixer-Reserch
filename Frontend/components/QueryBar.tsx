"use client"

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, MicOff, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { detectQueryType, type DetectionResult } from '@/lib/detect';
import { cn } from '@/lib/utils';

interface QueryBarProps {
  description: string;
  setDescription: (value: string) => void;
  district: string;
  setDistrict: (value: string) => void;
  budget: string;
  setBudget: (value: string) => void;
  urgency: string;
  setUrgency: (value: string) => void;
  verifiedOnly: boolean;
  setVerifiedOnly: (value: boolean) => void;
  openNow: boolean;
  setOpenNow: (value: boolean) => void;
  onSearch: () => void;
  loading: boolean;
  activeTab: string;
}

const DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Vanni', 'Batticaloa',
  'Digamadulla', 'Trincomaley', 'Kurunegala', 'Puttalam', 'Anuradhapura',
  'Polonnaruwa', 'Badulla', 'Monaragala', 'Ratnapura', 'Kegalle'
];

const BUDGET_OPTIONS = ['Low', 'Medium', 'High'];
const URGENCY_OPTIONS = ['High', 'Normal'];

export function QueryBar({
  description,
  setDescription,
  district,
  setDistrict,
  budget,
  setBudget,
  urgency,
  setUrgency,
  verifiedOnly,
  setVerifiedOnly,
  openNow,
  setOpenNow,
  onSearch,
  loading,
  activeTab
}: QueryBarProps) {
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const { isListening, isSupported, startListening, stopListening, transcript, error } = useSpeechToText();

  // Update description when speech transcript changes
  useEffect(() => {
    if (transcript) {
      setDescription(prev => prev + transcript);
    }
  }, [transcript, setDescription]);

  // Detect query type when description changes
  useEffect(() => {
    if (description.trim()) {
      const detection = detectQueryType(description);
      setDetectionResult(detection);
    } else {
      setDetectionResult(null);
    }
  }, [description]);

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const getDetectionColor = (type: string) => {
    return type === 'repair' ? 'bg-red-500/10 text-red-700 border-red-200' : 'bg-green-500/10 text-green-700 border-green-200';
  };

  return (
    <div className="space-y-6">
      {/* Query Input */}
      <div className="space-y-4">
        <div className="relative">
          <Textarea
            placeholder="Describe your problem or what you want to buy... (e.g., 'my pc shuts down during games and gpu is very hot' or 'I want to buy a laptop for study under 100000 LKR')"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[100px] pr-12 resize-none"
            disabled={loading}
          />
          {isSupported && (
            <Button
              type="button"
              variant={isListening ? "destructive" : "outline"}
              size="icon"
              onClick={handleVoiceToggle}
              className="absolute right-2 top-2 h-8 w-8"
              disabled={loading}
            >
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Voice Status */}
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Listening... Speak now
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-destructive"
          >
            {error}
          </motion.div>
        )}

        {/* Detection Result */}
        {detectionResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2"
          >
            <Badge
              variant="outline"
              className={cn("text-xs", getDetectionColor(detectionResult.type))}
            >
              Detected: {detectionResult.category} ({detectionResult.type})
            </Badge>
            <span className="text-xs text-muted-foreground">
              {Math.round(detectionResult.confidence * 100)}% confidence
            </span>
          </motion.div>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">District</label>
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            disabled={loading}
          >
            <option value="">Any District</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Budget</label>
          <select
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            disabled={loading}
          >
            <option value="">Any Budget</option>
            {BUDGET_OPTIONS.map((b) => (
              <option key={b} value={b.toLowerCase()}>{b}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Search Button */}
      <div className="flex justify-center">
        <Button
          onClick={onSearch}
          disabled={loading || !description.trim()}
          size="lg"
          className="min-w-[200px]"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Get {activeTab} Recommendations
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
