"use client"

import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Star, CheckCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shop } from '@/lib/api';
import { getMatchReason } from '@/lib/detect';

interface ShopCardProps {
  shop: Shop;
  rank: number;
  onViewDetails: (shopId: string) => void;
  onFeedback: (shopId: string, type: 'shop') => void;
}

export function ShopCard({ shop, rank, onViewDetails, onFeedback }: ShopCardProps) {
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating)
            ? 'fill-yellow-400 text-yellow-400'
            : 'text-muted-foreground'
        }`}
      />
    ));
  };

  const matchReason = getMatchReason(shop, 'repair');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{shop.shop_name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{shop.district}</span>
              </div>
            </div>
            <Badge variant="secondary" className="font-mono">
              #{rank}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Score */}
          {shop.score && (
            <div className="text-center">
              <div className="text-2xl font-bold font-mono">{shop.score.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">Match Score</div>
            </div>
          )}

          {/* Rating */}
          {shop.avg_rating && (
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {renderStars(shop.avg_rating)}
              </div>
              <span className="text-sm font-medium">
                {shop.avg_rating.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">
                ({shop.reviews} reviews)
              </span>
            </div>
          )}

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {shop.verified && (
              <Badge variant="outline" className="text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
            {shop.district_match === 1 && (
              <Badge variant="outline">
                <MapPin className="h-3 w-3 mr-1" />
                Same District
              </Badge>
            )}
            {shop.budget_fit === 1 && (
              <Badge variant="outline" className="text-yellow-700 border-yellow-200">
                Budget Fit
              </Badge>
            )}
            {shop.specialization && (
              <Badge variant="outline" className="text-purple-700 border-purple-200">
                {shop.specialization}
              </Badge>
            )}
          </div>

          {/* Meta Info */}
          <div className="space-y-2 text-sm text-muted-foreground">
            {shop.turnaround_days && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{shop.turnaround_days} days turnaround</span>
              </div>
            )}
            {shop.is_open !== undefined && (
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${shop.is_open ? 'bg-green-500' : 'bg-red-500'}`} />
                <span>{shop.is_open ? 'Open now' : 'Closed'}</span>
              </div>
            )}
            {shop.latitude && shop.longitude && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-sm text-blue-600 hover:text-blue-800"
                onClick={() => window.open(`https://www.google.com/maps?q=${shop.latitude},${shop.longitude}`, '_blank')}
              >
                <MapPin className="h-4 w-4 mr-1" />
                Open in Maps
              </Button>
            )}
          </div>

          {/* Why Recommended */}
          <div className="p-3 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground">
              <strong>Why recommended:</strong> {matchReason}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => onViewDetails(shop.shop_id)}
              className="flex-1"
              size="sm"
            >
              View Details
            </Button>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFeedback(shop.shop_id, 'shop')}
                className="h-8 w-8 p-0"
              >
                <ThumbsUp className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFeedback(shop.shop_id, 'shop')}
                className="h-8 w-8 p-0"
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