'use client';

import React from 'react';
import { Shop } from '@/types/recommend';

interface CompareShopsModalProps {
  shops: Shop[];
  onClose: () => void;
}

export default function CompareShopsModal({ shops, onClose }: CompareShopsModalProps) {
  if (shops.length < 2) {
    return null;
  }

  const renderStars = (rating: number | null | undefined) => {
    if (!rating) return null;
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

    return <div className="flex items-center">{stars}</div>;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Compare Shops</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* Comparison Table */}
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Feature
                  </th>
                  {shops.map((shop) => (
                    <th key={shop.shop_id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {shop.shop_name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Rating */}
                <tr>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    Rating
                  </td>
                  {shops.map((shop) => (
                    <td key={shop.shop_id} className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {shop.avg_rating ? (
                        <div className="flex items-center gap-2">
                          {renderStars(shop.avg_rating)}
                          <span>{shop.avg_rating.toFixed(1)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Reviews Count */}
                <tr className="bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    Reviews Count
                  </td>
                  {shops.map((shop) => (
                    <td key={shop.shop_id} className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {shop.reviews ?? <span className="text-gray-400">N/A</span>}
                    </td>
                  ))}
                </tr>

                {/* District */}
                <tr>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    District
                  </td>
                  {shops.map((shop) => (
                    <td key={shop.shop_id} className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {shop.district || <span className="text-gray-400">N/A</span>}
                    </td>
                  ))}
                </tr>

                {/* Verified */}
                <tr className="bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    Verified
                  </td>
                  {shops.map((shop) => (
                    <td key={shop.shop_id} className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {shop.verified === true || shop.verified === 1 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          No
                        </span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Turnaround Time */}
                <tr>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    Turnaround Time
                  </td>
                  {shops.map((shop) => (
                    <td key={shop.shop_id} className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {shop.turnaround_days ? (
                        <span>{shop.turnaround_days} days</span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Score */}
                <tr className="bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    Match Score
                  </td>
                  {shops.map((shop) => (
                    <td key={shop.shop_id} className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      <span className="font-semibold text-purple-600">{shop.score.toFixed(2)}</span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

