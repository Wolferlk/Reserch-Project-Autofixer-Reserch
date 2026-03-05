'use client';

import React from 'react';
import { Shop, Product } from '@/types/recommend';

interface BestMatchProps {
  shops: Shop[];
  products: Product[];
  summary: string;
  loading?: boolean;
  onClose?: () => void;
}

export default function BestMatch({ shops, products, summary, loading = false, onClose }: BestMatchProps) {
  if (loading) {
    return (
      <div className="bg-slate-950/70 border border-cyan-400/30 rounded-lg p-6 mb-6 shadow-md backdrop-blur-md">
        <div className="flex items-center justify-center gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl animate-pulse">
              🛠️
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white mb-2">Analyzing Your Needs...</h3>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <p className="text-sm text-gray-300">Finding the best shops, products, and solutions for you...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (shops.length === 0 && products.length === 0) {
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
    <div className="bg-slate-950/70 border border-cyan-400/30 rounded-lg p-6 mb-6 shadow-md relative backdrop-blur-md text-gray-100">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Close Best Match"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
            🛠️
          </div>
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-4">Best Match - Recommended Repair Center</h3>
          
          {/* Top Shop */}
          {shops.length > 0 && (
            <div className="mb-6 bg-white/5 border border-white/10 rounded-lg p-4 shadow-sm">
              <h4 className="text-lg font-semibold text-white mb-3">🏆 Best Match - Recommended Repair Center</h4>
              <div className="border-l-4 border-cyan-400 pl-4">
                <h5 className="font-semibold text-white text-lg">{shops[0].shop_name}</h5>
                <div className="mt-2 space-y-1 text-sm text-gray-300">
                  {shops[0].avg_rating && (
                    <div className="flex items-center gap-2">
                      {renderStars(shops[0].avg_rating)}
                      <span className="font-medium">{shops[0].avg_rating.toFixed(1)}</span>
                      {shops[0].reviews && <span>({shops[0].reviews} reviews)</span>}
                    </div>
                  )}
                  <p>📍 {shops[0].district}</p>
                  {shops[0].turnaround_days && <p>⏱️ {shops[0].turnaround_days} days turnaround</p>}
                  {Boolean(shops[0].verified) && (
                    <span className="inline-flex items-center px-2 py-1 text-xs rounded-full font-medium bg-emerald-500/10 border border-emerald-400/40 text-emerald-300">
                      ✅ Verified
                    </span>
                  )}
                </div>
                
                {/* Why This Shop Was Recommended */}
                <div className="mt-4 bg-cyan-500/10 rounded-lg p-4 border border-cyan-400/30">
                  <h6 className="font-semibold text-cyan-200 mb-3 flex items-center gap-2">
                    <span>💡</span> Why This Shop Was Recommended:
                  </h6>
                  <ul className="space-y-2 text-sm">
                    {shops[0].type_match === 1 && (
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold mt-0.5">✓</span>
                        <span className="text-gray-200">
                          <strong className="text-cyan-300">Specializes in your error type</strong> - This shop has expertise in handling your specific issue
                        </span>
                      </li>
                    )}
                    {shops[0].district_match === 1 && (
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold mt-0.5">✓</span>
                        <span className="text-gray-200">
                          <strong className="text-cyan-300">Located in your district</strong> - Convenient location in {shops[0].district}
                        </span>
                      </li>
                    )}
                    {shops[0].avg_rating && shops[0].avg_rating >= 4.0 && (
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold mt-0.5">✓</span>
                        <span className="text-gray-200">
                          <strong className="text-cyan-300">High ratings</strong> - {shops[0].avg_rating.toFixed(1)}/5.0 average rating
                        </span>
                      </li>
                    )}
                    {shops[0].reviews && shops[0].reviews >= 20 && (
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold mt-0.5">✓</span>
                        <span className="text-gray-200">
                          <strong className="text-cyan-300">Well-reviewed</strong> - {shops[0].reviews} customer reviews
                        </span>
                      </li>
                    )}
                    {Boolean(shops[0].verified) && (
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold mt-0.5">✓</span>
                        <span className="text-gray-200">
                          <strong className="text-cyan-300">Verified shop</strong> - Platform verified for reliability
                        </span>
                      </li>
                    )}
                    {shops[0].turnaround_days && shops[0].turnaround_days <= 3 && (
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold mt-0.5">✓</span>
                        <span className="text-gray-200">
                          <strong className="text-cyan-300">Fast turnaround</strong> - Average {shops[0].turnaround_days} days completion time
                        </span>
                      </li>
                    )}
                    {shops[0].factors && shops[0].factors.length > 0 && (
                      shops[0].factors.slice(0, 2).map((factor: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-green-600 font-bold mt-0.5">✓</span>
                          <span className="text-gray-200">{factor}</span>
                        </li>
                      ))
                    )}
                    {shops[0].reason && (
                      <li className="flex items-start gap-2 mt-3 pt-3 border-t border-cyan-400/20">
                        <span className="text-blue-600 font-bold mt-0.5">💬</span>
                        <span className="text-gray-200 italic">{shops[0].reason}</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Products List */}
          {products.length > 0 && (
            <div className="mb-6 bg-white/5 border border-white/10 rounded-lg p-4 shadow-sm">
              <h4 className="text-lg font-semibold text-white mb-3">🛒 Recommended Products</h4>
              <ul className="space-y-2">
                {products.map((product, index) => (
                  <li key={product.product_id || index} className="border-l-4 border-cyan-400 pl-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-100">
                          {product.brand} {product.model}
                        </p>
                        <p className="text-sm text-gray-300">{product.category}</p>
                        <p className="text-sm font-semibold text-emerald-300">
                          LKR {product.price_lkr?.toLocaleString() || 'N/A'}
                        </p>
                      </div>
                      {product.stock_status && 
                       !(product.stock_status || '').toLowerCase().includes('out') && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          (product.stock_status || '').toLowerCase().includes('stock') && 
                          !(product.stock_status || '').toLowerCase().includes('out')
                            ? 'bg-emerald-500/10 border border-emerald-400/40 text-emerald-300' 
                            : 'bg-amber-500/10 border border-amber-400/40 text-amber-300'
                        }`}>
                          {product.stock_status?.replace(/_/g, ' ') || 'Unknown'}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Summary */}
          {summary && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 shadow-sm">
              <h4 className="text-lg font-semibold text-white mb-2">📋 Why This Shop?</h4>
              <div className="prose prose-sm max-w-none">
                {summary.split('\n\n').map((paragraph, index) => (
                  <p key={index} className="text-gray-200 mb-2 last:mb-0 whitespace-pre-line">
                    {paragraph.split('**').map((part, i) => 
                      i % 2 === 1 ? <strong key={i} className="text-cyan-300">{part}</strong> : part
                    )}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
