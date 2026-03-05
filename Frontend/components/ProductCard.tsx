"use client"

import React from 'react';
import { motion } from 'framer-motion';
import { Star, ThumbsUp, ThumbsDown, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/lib/api';
import { getMatchReason } from '@/lib/detect';

interface ProductCardProps {
  product: Product;
  rank: number;
  onViewDetails: (productId: string) => void;
  onFeedback: (productId: string, type: 'product') => void;
}

export function ProductCard({ product, rank, onViewDetails, onFeedback }: ProductCardProps) {
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

  const getStockColor = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('in stock') || lowerStatus.includes('available')) {
      return 'text-emerald-300 bg-emerald-500/10 border-emerald-400/40';
    }
    if (lowerStatus.includes('low stock') || lowerStatus.includes('limited')) {
      return 'text-amber-300 bg-amber-500/10 border-amber-400/40';
    }
    return 'text-red-300 bg-red-500/10 border-red-400/40';
  };

  const matchReason = getMatchReason(product, 'product');

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
              <CardTitle className="text-lg">
                {product.brand} {product.model}
              </CardTitle>
              {product.category && (
                <Badge variant="secondary" className="mt-2 text-xs bg-white/10 text-cyan-200 border-white/10">
                  {product.category}
                </Badge>
              )}
            </div>
            <Badge variant="secondary" className="font-mono bg-cyan-500/15 text-cyan-300 border-cyan-400/30">
              #{rank}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Price */}
          {product.price_lkr && (
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-400">
                Rs. {product.price_lkr.toLocaleString()}
              </div>
            </div>
          )}

          {/* Stock and Warranty */}
          <div className="flex gap-2">
            {product.stock_status && 
             !(product.stock_status || '').toLowerCase().includes('out') && (
              <Badge
                variant="outline"
                className={`text-xs ${getStockColor(product.stock_status)}`}
              >
                {product.stock_status}
              </Badge>
            )}
            {product.warranty && (
              <Badge variant="outline" className="text-xs">
                🛡️ {product.warranty}
              </Badge>
            )}
          </div>

          {/* Shop Info */}
          <div className="border-t border-white/10 pt-4 space-y-2">
            <h4 className="text-sm font-medium">Available at:</h4>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{product.shop_name}</div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <MapPin className="h-3 w-3" />
                  {product.district}
                </div>
              </div>
              {product.shop_rating && (
                <div className="flex items-center gap-1">
                  <div className="flex items-center">
                    {renderStars(product.shop_rating)}
                  </div>
                  <span className="text-xs text-gray-400">
                    ({product.shop_reviews})
                  </span>
                </div>
              )}
            </div>
            {product.shop_verified && (
              <Badge variant="outline" className="text-xs text-emerald-300 border-emerald-400/40 bg-emerald-500/10">
                ✅ Verified Shop
              </Badge>
            )}
          </div>

          {/* Why Recommended */}
          <div className="p-3 bg-white/5 rounded-md border border-white/10">
            <p className="text-xs text-gray-300">
              <strong>Why recommended:</strong> {matchReason}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => onViewDetails(product.product_id)}
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500"
              size="sm"
            >
              View Details
            </Button>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFeedback(product.product_id, 'product')}
                className="h-8 w-8 p-0 border-white/20 bg-white/5 hover:bg-white/10 text-gray-100"
              >
                <ThumbsUp className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onFeedback(product.product_id, 'product')}
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
