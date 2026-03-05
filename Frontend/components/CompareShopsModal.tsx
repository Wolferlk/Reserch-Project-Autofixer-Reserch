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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-950/90 border border-white/15 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-xl text-gray-100">
        {/* Header */}
        <div className="sticky top-0 bg-slate-950/95 border-b border-white/10 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Compare Shops</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* Comparison Table */}
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Feature
                  </th>
                  {shops.map((shop) => (
                    <th key={shop.shop_id} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      {shop.shop_name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-transparent divide-y divide-white/10">
                {/* Rating */}
                <tr>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-100">
                    Rating
                  </td>
                  {shops.map((shop) => (
                    <td key={shop.shop_id} className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      {shop.avg_rating ? (
                        <div className="flex items-center gap-2">
                          {renderStars(shop.avg_rating)}
                          <span>{shop.avg_rating.toFixed(1)}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">N/A</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Reviews Count */}
                <tr className="bg-white/[0.02]">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-100">
                    Reviews Count
                  </td>
                  {shops.map((shop) => (
                    <td key={shop.shop_id} className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      {shop.reviews ?? <span className="text-gray-500">N/A</span>}
                    </td>
                  ))}
                </tr>

                {/* District */}
                <tr>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-100">
                    District
                  </td>
                  {shops.map((shop) => (
                    <td key={shop.shop_id} className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      {shop.district || <span className="text-gray-500">N/A</span>}
                    </td>
                  ))}
                </tr>

                {/* Verified */}
                <tr className="bg-white/[0.02]">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-100">
                    Verified
                  </td>
                  {shops.map((shop) => (
                    <td key={shop.shop_id} className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      {Boolean(shop.verified) ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-400/40">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/10 text-gray-300 border border-white/20">
                          No
                        </span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Turnaround Time */}
                <tr>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-100">
                    Turnaround Time
                  </td>
                  {shops.map((shop) => (
                    <td key={shop.shop_id} className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      {shop.turnaround_days ? (
                        <span>{shop.turnaround_days} days</span>
                      ) : (
                        <span className="text-gray-500">N/A</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Score */}
                <tr className="bg-white/[0.02]">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-100">
                    Match Score
                  </td>
                  {shops.map((shop) => (
                    <td key={shop.shop_id} className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                      <span className="font-semibold text-cyan-300">{(shop.score ?? 0).toFixed(2)}</span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-950/95 border-t border-white/10 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

