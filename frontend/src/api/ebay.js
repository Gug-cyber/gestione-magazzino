import api from './client'

export const ebayApi = {
  getConnectionStatus: () => api.get('/api/ebay/connection'),
  getConnectUrl: (jwtToken) => api.get('/api/ebay/connect', { params: { jwt_token: jwtToken } }),
  disconnect: () => api.delete('/api/ebay/connection'),
  updateSettings: (data) => api.patch('/api/ebay/connection/settings', data),
  getListings: () => api.get('/api/ebay/listings'),
  publishProduct: (data) => api.post('/api/ebay/listings/publish', data),
  endListing: (listingId) => api.delete(`/api/ebay/listings/${listingId}`),
  syncListingQuantity: (listingId) => api.post(`/api/ebay/listings/${listingId}/sync`),
  syncOrders: () => api.post('/api/ebay/sync/orders'),
  syncAllListings: () => api.post('/api/ebay/sync/listings'),
  getSales: () => api.get('/api/ebay/sales'),
  getPricingPreview: (netPrice, feePercentage) =>
    api.get(`/api/ebay/pricing/preview?net_price=${netPrice}&fee_percentage=${feePercentage}`),
  getCategories: (parentId = null, marketplaceId = 'EBAY_IT') =>
    api.get('/api/ebay/categories', { params: { parent_id: parentId, marketplace_id: marketplaceId } }),
  getCategoryConditions: (categoryId, marketplaceId = 'EBAY_IT') =>
    api.get(`/api/ebay/categories/${categoryId}/conditions`, { params: { marketplace_id: marketplaceId } }),
}
