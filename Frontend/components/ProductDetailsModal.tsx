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
      return 'bg-green-100 text-green-800';
    }
    if (lowerStatus.includes('low stock') || lowerStatus.includes('limited')) {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {product.brand} {product.model}
            </h2>
            <div className="flex items-center space-x-4 mt-2">
              {product.category && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
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
                <span className="text-lg font-bold text-green-600">
                  LKR {product.price_lkr.toLocaleString()}
                </span>
              )}
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
              <p className="text-center text-gray-500 py-8">Loading product details...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {productDetails && !loading && (
            <div className="space-y-6">
              {/* Product Specifications */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Product Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Brand</p>
                    <p className="text-gray-900 font-medium">{productDetails.product?.brand || product.brand}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Model</p>
                    <p className="text-gray-900 font-medium">{productDetails.product?.model || product.model}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Category</p>
                    <p className="text-gray-900 font-medium">{productDetails.product?.category || product.category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Price</p>
                    <p className="text-gray-900 font-bold text-lg text-green-600">
                      LKR {(productDetails.product?.price_lkr || product.price_lkr)?.toLocaleString() || 'N/A'}
                    </p>
                  </div>
                  {(productDetails.product?.stock_status || product.stock_status) && 
                   !((productDetails.product?.stock_status || product.stock_status || '').toLowerCase().includes('out')) && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Stock Status</p>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStockColor(productDetails.product?.stock_status || product.stock_status || 'unknown')}`}>
                        {(productDetails.product?.stock_status || product.stock_status || 'unknown').replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}
                  {(productDetails.product?.warranty || product.warranty) && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Warranty</p>
                      <p className="text-gray-900">🛡️ {productDetails.product?.warranty || product.warranty}</p>
                    </div>
                  )}
                </div>

                {/* Additional Specifications */}
                {productDetails.product?.specifications && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Specifications</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {Object.entries(productDetails.product.specifications).map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="text-gray-600">{key}:</span>{' '}
                          <span className="text-gray-900 font-medium">{value as string}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Shop Information */}
              {productDetails.shop && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Available at Shop</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Shop Name</p>
                      <p className="text-gray-900 font-medium">{productDetails.shop?.shop_name || product.shop_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">📍 District</p>
                      <p className="text-gray-900">{productDetails.shop?.district || product.district}</p>
                    </div>
                    {(productDetails.shop?.average_rating || product.shop_rating) && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Rating</p>
                        <div className="flex items-center">
                          <span className="text-yellow-400">⭐</span>
                          <span className="ml-1 text-gray-900 font-medium">
                            {(productDetails.shop?.average_rating || product.shop_rating || 0).toFixed(1)}
                          </span>
                          {(productDetails.shop?.reviews_count || product.reviews) && (
                            <span className="ml-2 text-sm text-gray-600">
                              ({(productDetails.shop?.reviews_count || product.reviews)} reviews)
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {(productDetails.shop?.verified || product.shop_verified) && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Status</p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✅ Verified Shop
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Contact Information */}
                  {(productDetails.shop?.phone_number || productDetails.shop?.phone) && (
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Contact Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(productDetails.shop?.phone_number || productDetails.shop?.phone) && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">📞 Phone</p>
                            <p className="text-gray-900">{productDetails.shop?.phone_number || productDetails.shop?.phone}</p>
                          </div>
                        )}
                        {(productDetails.shop?.email) && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">📧 Email</p>
                            <p className="text-gray-900">{productDetails.shop?.email}</p>
                          </div>
                        )}
                        {(productDetails.shop?.address || productDetails.shop?.city_address) && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">📍 Address</p>
                            <p className="text-gray-900">{productDetails.shop?.address || productDetails.shop?.city_address}</p>
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
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
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
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

