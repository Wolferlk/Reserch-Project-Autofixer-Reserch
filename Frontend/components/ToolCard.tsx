"use client"

import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, ThumbsUp, ThumbsDown, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tool } from '@/lib/api';

interface ToolCardProps {
  tool: Tool;
  rank: number;
  onViewDetails: (toolId: string) => void;
  onFeedback: (toolId: string, type: 'tool') => void;
}

export function ToolCard({ tool, rank, onViewDetails, onFeedback }: ToolCardProps) {
  const getLicenseColor = (license: string) => {
    const lowerLicense = license.toLowerCase();
    if (lowerLicense.includes('free') || lowerLicense.includes('open')) {
      return 'text-emerald-300 bg-emerald-500/10 border-emerald-400/40';
    }
    if (lowerLicense.includes('paid') || lowerLicense.includes('premium')) {
      return 'text-cyan-300 bg-cyan-500/10 border-cyan-400/40';
    }
    return 'text-gray-300 bg-white/5 border-white/20';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="h-full bg-white/5 border-white/15 backdrop-blur-md text-gray-100">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{tool.name}</CardTitle>
              {tool.category && (
                <Badge variant="secondary" className="mt-2 text-xs bg-white/10 text-cyan-200 border-white/10">
                  {tool.category}
                </Badge>
              )}
            </div>
            <Badge variant="secondary" className="font-mono bg-cyan-500/15 text-cyan-300 border-cyan-400/30">
              #{rank}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Description */}
          {tool.description && (
            <p className="text-sm text-gray-300 line-clamp-2">
              {tool.description}
            </p>
          )}

          {/* OS Support */}
          <div>
            <h4 className="text-sm font-medium mb-2">OS Support:</h4>
            <div className="flex flex-wrap gap-1">
              {tool.os.map((os, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {os}
                </Badge>
              ))}
            </div>
          </div>

          {/* License */}
          <Badge
            variant="outline"
            className={`text-xs ${getLicenseColor(tool.license)}`}
          >
            📄 {tool.license}
          </Badge>

          {/* Hash */}
          {tool.sha256 && (
            <div>
              <h4 className="text-sm font-medium mb-1">SHA256:</h4>
              <code className="text-xs bg-white/10 px-2 py-1 rounded font-mono text-gray-200">
                {tool.sha256.substring(0, 16)}...
              </code>
            </div>
          )}

          {/* Why Recommended */}
          {tool.reason && (
            <div className="p-3 bg-white/5 border border-white/10 rounded-md">
              <p className="text-xs text-gray-300">
                <strong>Why recommended:</strong> {tool.reason}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => onViewDetails(tool.tool_id)}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500"
              size="sm"
            >
              View Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(tool.url, '_blank')}
              className="px-3 border-white/20 bg-white/5 hover:bg-white/10 text-gray-100"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFeedback(tool.tool_id, 'tool')}
                className="h-8 w-8 p-0 border-white/20 bg-white/5 hover:bg-white/10 text-gray-100"
              >
                <ThumbsUp className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFeedback(tool.tool_id, 'tool')}
                className="h-8 w-8 p-0 border-white/20 bg-white/5 hover:bg-white/10 text-gray-100"
              >
                <ThumbsDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
