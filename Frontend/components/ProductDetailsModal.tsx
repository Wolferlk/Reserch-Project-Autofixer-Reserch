'use client';

import { Product } from '@/types/recommend';

interface ProductDetailsModalProps {
  product: Product;
  productDetails: {
    product: any;
    shop: any;
  } | null;
  loading: boolean;
  error: string;
  onClose: () => void;
}

export default function ProductDetailsModal({ 
  product, 
  productDetails, 
  loading, 
  error, 
  onClose 
}: ProductDetailsModalProps) {
  const getStockColor = (status: string) => {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('in stock') || lowerStatus.includes('available')) {
      return 'bg-emerald-500/10 text-emerald-300 border border-emerald-400/40';
    }
    if (lowerStatus.includes('low stock') || lowerStatus.includes('limited')) {
      return 'bg-amber-500/10 text-amber-300 border border-amber-400/40';
    }
    return 'bg-red-500/10 text-red-300 border border-red-400/40';
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-950/90 border border-white/15 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto text-gray-100">
        {/* Header */}
        <div className="sticky top-0 bg-slate-950/95 border-b border-white/10 px-6 py-4 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {product.brand} {product.model}
            </h2>
            <div className="flex items-center space-x-4 mt-2">
              {product.category && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-400/40">
                  {product.category}
                </span>
              )}
              {product.stock_status && 
               !(product.stock_status || '').toLowerCase().includes('out') && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStockColor(product.stock_status)}`}>
                  {product.stock_status.replace(/_/g, ' ')}
                </span>
              )}
              {product.price_lkr && (
                <span className="text-lg font-bold text-emerald-300">
                  LKR {product.price_lkr.toLocaleString()}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {loading && (
            <div className="space-y-4">
              <div className="animate-pulse">
                <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-white/10 rounded w-1/2 mb-4"></div>
              </div>
              <div className="animate-pulse">
                <div className="h-32 bg-white/10 rounded"></div>
              </div>
              <p className="text-center text-gray-400 py-8">Loading product details...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-400/40 text-red-200 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {productDetails && !loading && (
            <div className="space-y-6">
              {/* Product Specifications */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Product Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Brand</p>
                    <p className="text-gray-100 font-medium">{productDetails.product?.brand || product.brand}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Model</p>
                    <p className="text-gray-100 font-medium">{productDetails.product?.model || product.model}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Category</p>
                    <p className="text-gray-100 font-medium">{productDetails.product?.category || product.category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Price</p>
                    <p className="text-gray-100 font-bold text-lg text-emerald-300">
                      LKR {(productDetails.product?.price_lkr || product.price_lkr)?.toLocaleString() || 'N/A'}
                    </p>
                  </div>
                  {(productDetails.product?.stock_status || product.stock_status) && 
                   !((productDetails.product?.stock_status || product.stock_status || '').toLowerCase().includes('out')) && (
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Stock Status</p>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStockColor(productDetails.product?.stock_status || product.stock_status || 'unknown')}`}>
                        {(productDetails.product?.stock_status || product.stock_status || 'unknown').replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}
                  {(productDetails.product?.warranty || product.warranty) && (
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Warranty</p>
                      <p className="text-gray-100">🛡️ {productDetails.product?.warranty || product.warranty}</p>
                    </div>
                  )}
                </div>

                {/* Additional Specifications */}
                {productDetails.product?.specifications && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <h4 className="text-sm font-semibold text-gray-100 mb-2">Specifications</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {Object.entries(productDetails.product.specifications).map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="text-gray-400">{key}:</span>{' '}
                          <span className="text-gray-100 font-medium">{value as string}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Shop Information */}
              {productDetails.shop && (
                <div className="bg-cyan-500/10 border border-cyan-400/20 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Available at Shop</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Shop Name</p>
                      <p className="text-gray-100 font-medium">{productDetails.shop?.shop_name || product.shop_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">📍 District</p>
                      <p className="text-gray-100">{productDetails.shop?.district || product.district}</p>
                    </div>
                    {(productDetails.shop?.average_rating || product.shop_rating) && (
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Rating</p>
                        <div className="flex items-center">
                          <span className="text-yellow-400">⭐</span>
                          <span className="ml-1 text-gray-100 font-medium">
                            {(productDetails.shop?.average_rating || product.shop_rating || 0).toFixed(1)}
                          </span>
                          {(productDetails.shop?.reviews_count || product.reviews) && (
                            <span className="ml-2 text-sm text-gray-400">
                              ({(productDetails.shop?.reviews_count || product.reviews)} reviews)
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {(productDetails.shop?.verified || product.shop_verified) && (
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Status</p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-400/40">
                          ✅ Verified Shop
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Contact Information */}
                  {(productDetails.shop?.phone_number || productDetails.shop?.phone) && (
                    <div className="mt-4 pt-4 border-t border-cyan-400/20">
                      <h4 className="text-sm font-semibold text-gray-100 mb-2">Contact Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(productDetails.shop?.phone_number || productDetails.shop?.phone) && (
                          <div>
                            <p className="text-sm text-gray-400 mb-1">📞 Phone</p>
                            <p className="text-gray-100">{productDetails.shop?.phone_number || productDetails.shop?.phone}</p>
                          </div>
                        )}
                        {(productDetails.shop?.email) && (
                          <div>
                            <p className="text-sm text-gray-400 mb-1">📧 Email</p>
                            <p className="text-gray-100">{productDetails.shop?.email}</p>
                          </div>
                        )}
                        {(productDetails.shop?.address || productDetails.shop?.city_address) && (
                          <div>
                            <p className="text-sm text-gray-400 mb-1">📍 Address</p>
                            <p className="text-gray-100">{productDetails.shop?.address || productDetails.shop?.city_address}</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Google Maps */}
                      {(productDetails.shop?.latitude && productDetails.shop?.longitude) && (
                        <div className="mt-4">
                          <a
                            href={`https://www.google.com/maps?q=${productDetails.shop.latitude},${productDetails.shop.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-md hover:from-cyan-400 hover:to-blue-500 transition-colors"
                          >
                            🗺️ Open Shop Location in Google Maps
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-950/95 border-t border-white/10 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/10 text-gray-100 border border-white/20 rounded-md hover:bg-white/20 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

