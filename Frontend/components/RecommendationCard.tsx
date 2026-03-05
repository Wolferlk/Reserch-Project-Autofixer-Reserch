'use client';

import React from 'react';

interface Recommendation {
  shop_id: string;
  shop_name: string;
  score: number;
  shop_type: string;
  district: string;
  avg_rating?: number | null;
  reviews?: number | null;
  verified?: boolean | null;
  turnaround_days?: number | null;
  district_match: number;
  type_match: number;
  budget_fit: number;
  reason?: string;  // Explainable reason
  factors?: string[];  // Key factors
}

interface RecommendationCardProps {
  shop: Recommendation;
  rank: number;
  onViewDetails?: (shopId: string) => void;
  onCompareChange?: (shopId: string, checked: boolean) => void;
  isCompareSelected?: boolean;
}

export default function RecommendationCard({ shop, rank, onViewDetails, onCompareChange, isCompareSelected = false }: RecommendationCardProps) {
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={i} className="text-yellow-400">★</span>);
    }

    if (hasHalfStar) {
      stars.push(<span key="half" className="text-yellow-400">☆</span>);
    }

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<span key={`empty-${i}`} className="text-gray-300">★</span>);
    }

    return stars;
  };

  return (
    <div className="relative bg-white/5 backdrop-blur-md rounded-lg shadow-md border border-white/15 hover:shadow-lg transition-shadow duration-200 text-gray-100">
      {/* Rank Badge */}
      <div className="absolute -top-2 -left-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
        {rank}
      </div>

      <div className="p-6">
        {/* Shop Name and Type */}
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-white mb-1">
            {shop.shop_name}
          </h3>
          <p className="text-gray-300 text-sm">{shop.shop_type}</p>
        </div>

        {/* Score */}
        <div className="mb-4">
          <div className="text-2xl font-bold text-cyan-300">
            {shop.score.toFixed(2)}
          </div>
          <div className="text-sm text-gray-400">Match Score</div>
        </div>

        {/* Rating and Reviews */}
        {shop.avg_rating && (
          <div className="mb-4">
            <div className="flex items-center mb-1">
              <div className="flex items-center mr-2">
                {renderStars(shop.avg_rating)}
              </div>
              <span className="text-sm font-medium text-gray-200">
                {shop.avg_rating.toFixed(1)}
              </span>
            </div>
            {shop.reviews && (
              <div className="text-sm text-gray-400">
                {shop.reviews} reviews
              </div>
            )}
          </div>
        )}

        {/* District and Turnaround */}
        <div className="mb-4 space-y-1">
          <div className="text-sm text-gray-300">
            📍 {shop.district}
          </div>
          {shop.turnaround_days && (
            <div className="text-sm text-gray-300">
              ⏱️ {shop.turnaround_days} days turnaround
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Boolean(shop.verified) && (
            <span className="bg-emerald-500/10 border border-emerald-400/40 text-emerald-300 px-2 py-1 text-xs rounded-full font-medium">
              ✅ Verified
            </span>
          )}
          {shop.district_match === 1 && (
            <span className="bg-cyan-500/10 border border-cyan-400/40 text-cyan-300 px-2 py-1 text-xs rounded-full font-medium">
              📍 Same District
            </span>
          )}
          {shop.budget_fit === 1 && (
            <span className="bg-amber-500/10 border border-amber-400/40 text-amber-300 px-2 py-1 text-xs rounded-full font-medium">
              💰 Budget Fit
            </span>
          )}
        </div>

        {/* Explainable Reason */}
        {shop.reason && (
          <div className="mb-4 p-3 bg-cyan-500/10 border-l-4 border-cyan-400 rounded-r">
            <p className="text-sm font-medium text-cyan-200 mb-1">💡 Why we recommend this:</p>
            <p className="text-sm text-cyan-100">{shop.reason}</p>
            {shop.factors && shop.factors.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {shop.factors.map((factor, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-500/15 text-cyan-200 border border-cyan-400/30"
                  >
                    {factor}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Match Indicators */}
        <div className="grid grid-cols-3 gap-2 text-xs mb-4">
          <div className="text-center">
            <div className="font-medium text-gray-100">Type</div>
            <div className={`px-2 py-1 rounded ${shop.type_match === 1 ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-400/40' : 'bg-white/10 text-gray-400 border border-white/20'}`}>
              {shop.type_match === 1 ? '✓' : '✗'}
            </div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-100">District</div>
            <div className={`px-2 py-1 rounded ${shop.district_match === 1 ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-400/40' : 'bg-white/10 text-gray-400 border border-white/20'}`}>
              {shop.district_match === 1 ? '✓' : '✗'}
            </div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-100">Budget</div>
            <div className={`px-2 py-1 rounded ${shop.budget_fit === 1 ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-400/40' : 'bg-white/10 text-gray-400 border border-white/20'}`}>
              {shop.budget_fit === 1 ? '✓' : '✗'}
            </div>
          </div>
        </div>

        {/* Compare Checkbox */}
        {onCompareChange && (
          <div className="mb-4 flex items-center">
            <input
              type="checkbox"
              id={`compare-${shop.shop_id}`}
              checked={isCompareSelected}
              onChange={(e) => onCompareChange(shop.shop_id, e.target.checked)}
              className="w-4 h-4 text-cyan-500 border-white/30 rounded focus:ring-cyan-500"
            />
            <label htmlFor={`compare-${shop.shop_id}`} className="ml-2 text-sm font-medium text-gray-200 cursor-pointer">
              Compare
            </label>
          </div>
        )}

        {/* View Details Button */}
        {onViewDetails && (
          <div className="p-4 border-t border-white/10">
            <button
              onClick={() => onViewDetails(shop.shop_id)}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
            >
              View Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
