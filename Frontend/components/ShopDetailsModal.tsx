'use client';

import { useState } from 'react';
import { ShopDetails } from '@/types/recommend';

interface ShopDetailsModalProps {
  shop: any;
  shopDetails: ShopDetails | null;
  loading: boolean;
  error: string;
  onClose: () => void;
}

export default function ShopDetailsModal({ 
  shop, 
  shopDetails, 
  loading, 
  error, 
  onClose 
}: ShopDetailsModalProps) {
  // Debug: Log all data when shopDetails loads
  if (shopDetails && !loading) {
    console.log('[ShopDetailsModal] Full shopDetails:', shopDetails);
    console.log('[ShopDetailsModal] shopDetails.shop:', shopDetails.shop);
    console.log('[ShopDetailsModal] shop prop:', shop);
  }

  // Helper function to get location data
  const getLocationData = () => {
    const shopData = shopDetails?.shop || shopDetails || shop || {};
    
    const googleMapsUrl = shopData?.google_maps_url;
    let lat = shopData?.latitude;
    let lng = shopData?.longitude;
    
    // Handle string numbers from CSV
    if (lat != null && typeof lat === 'string' && lat.trim() !== '') {
      const parsed = parseFloat(lat.trim());
      lat = !isNaN(parsed) ? parsed : null;
    }
    if (lng != null && typeof lng === 'string' && lng.trim() !== '') {
      const parsed = parseFloat(lng.trim());
      lng = !isNaN(parsed) ? parsed : null;
    }
    
    // Validate
    const hasUrl = googleMapsUrl && typeof googleMapsUrl === 'string' && googleMapsUrl.trim().length > 0 && !googleMapsUrl.includes('null');
    const hasCoords = lat != null && lng != null && typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng);
    
    console.log('[ShopDetailsModal] Location check:', {
      shopData,
      googleMapsUrl,
      lat,
      lng,
      hasUrl,
      hasCoords
    });
    
    if (!hasUrl && !hasCoords) {
      return null;
    }
    
    const mapsUrl = hasUrl ? googleMapsUrl.trim() : `https://www.google.com/maps?q=${lat},${lng}`;
    
    return mapsUrl;
  };

  const mapsUrl = getLocationData();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{shop.shop_name}</h2>
            <div className="flex items-center space-x-4 mt-2">
              {shop.verified && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  ✅ Verified
                </span>
              )}
              <div className="flex items-center">
                <span className="text-yellow-400">⭐</span>
                <span className="ml-1 text-sm text-gray-600">
                  {shop.avg_rating?.toFixed(1) || 'N/A'} ({shop.reviews || 0} reviews)
                </span>
              </div>
              <span className="text-sm text-gray-600">📍 {shop.district}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {loading && (
            <div className="space-y-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              </div>
              <div className="animate-pulse">
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
              <div className="animate-pulse">
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
              <p className="text-center text-gray-500 py-8">Loading details...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {shopDetails && !loading && (
            <div className="space-y-6">
              {/* Contact Information - Phone, Address, and Google Maps */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">📞 Phone Number</p>
                    <p className="text-lg text-gray-900">
                      {shopDetails.shop?.phone_number || 
                       shopDetails.shop?.phone || 
                       shopDetails.phone || 
                       shop?.phone_number ||
                       shop?.phone ||
                       'Phone not available'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">📍 Address</p>
                    <p className="text-lg text-gray-900">
                      {shopDetails.shop?.city_address ||
                       shopDetails.shop?.address || 
                       shopDetails.address || 
                       shop?.city_address ||
                       shop?.address ||
                       'Address not available'}
                    </p>
                  </div>
                  
                  {/* Google Maps Location - Show if mapsUrl is available */}
                  {mapsUrl && (
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-2">🗺️ Location</p>
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Open in Google Maps
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
