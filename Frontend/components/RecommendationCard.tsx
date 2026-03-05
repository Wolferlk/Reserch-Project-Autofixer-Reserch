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
    <div className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-200">
      {/* Rank Badge */}
      <div className="absolute -top-2 -left-2 bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
        {rank}
      </div>

      <div className="p-6">
        {/* Shop Name and Type */}
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-gray-900 mb-1">
            {shop.shop_name}
          </h3>
          <p className="text-gray-600 text-sm">{shop.shop_type}</p>
        </div>

        {/* Score */}
        <div className="mb-4">
          <div className="text-2xl font-bold text-purple-600">
            {shop.score.toFixed(2)}
          </div>
          <div className="text-sm text-gray-500">Match Score</div>
        </div>

        {/* Rating and Reviews */}
        {shop.avg_rating && (
          <div className="mb-4">
            <div className="flex items-center mb-1">
              <div className="flex items-center mr-2">
                {renderStars(shop.avg_rating)}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {shop.avg_rating.toFixed(1)}
              </span>
            </div>
            {shop.reviews && (
              <div className="text-sm text-gray-500">
                {shop.reviews} reviews
              </div>
            )}
          </div>
        )}

        {/* District and Turnaround */}
        <div className="mb-4 space-y-1">
          <div className="text-sm text-gray-600">
            📍 {shop.district}
          </div>
          {shop.turnaround_days && (
            <div className="text-sm text-gray-600">
              ⏱️ {shop.turnaround_days} days turnaround
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(shop.verified === true || shop.verified === 1) && (
            <span className="bg-green-100 text-green-700 px-2 py-1 text-xs rounded-full font-medium">
              ✅ Verified
            </span>
          )}
          {shop.district_match === 1 && (
            <span className="bg-blue-100 text-blue-700 px-2 py-1 text-xs rounded-full font-medium">
              📍 Same District
            </span>
          )}
          {shop.budget_fit === 1 && (
            <span className="bg-yellow-100 text-yellow-700 px-2 py-1 text-xs rounded-full font-medium">
              💰 Budget Fit
            </span>
          )}
        </div>

        {/* Explainable Reason */}
        {shop.reason && (
          <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded-r">
            <p className="text-sm font-medium text-blue-900 mb-1">💡 Why we recommend this:</p>
            <p className="text-sm text-blue-800">{shop.reason}</p>
            {shop.factors && shop.factors.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {shop.factors.map((factor, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
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
            <div className="font-medium text-gray-900">Type</div>
            <div className={`px-2 py-1 rounded ${shop.type_match === 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {shop.type_match === 1 ? '✓' : '✗'}
            </div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-900">District</div>
            <div className={`px-2 py-1 rounded ${shop.district_match === 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {shop.district_match === 1 ? '✓' : '✗'}
            </div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-900">Budget</div>
            <div className={`px-2 py-1 rounded ${shop.budget_fit === 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
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
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <label htmlFor={`compare-${shop.shop_id}`} className="ml-2 text-sm font-medium text-gray-700 cursor-pointer">
              Compare
            </label>
          </div>
        )}

        {/* View Details Button */}
        {onViewDetails && (
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={() => onViewDetails(shop.shop_id)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
            >
              View Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
}