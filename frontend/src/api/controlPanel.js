import apiClient from './client'

export const controlPanelAPI = {
  // Feature flags
  getFlags: () => apiClient.get('/api/control-panel/feature-flags'),
  getFlagsAdmin: () => apiClient.get('/api/control-panel/feature-flags/admin'),
  updateFlag: (key, data) => apiClient.put(`/api/control-panel/feature-flags/${key}`, data),
  bulkUpdateFlags: (flags) => apiClient.post('/api/control-panel/feature-flags/bulk', { flags }),

  // Banner
  getBanners: () => apiClient.get('/api/control-panel/banners'),
  createBanner: (data) => apiClient.post('/api/control-panel/banners', data),
  updateBanner: (id, data) => apiClient.put(`/api/control-panel/banners/${id}`, data),
  deleteBanner: (id) => apiClient.delete(`/api/control-panel/banners/${id}`),

  // Promozioni
  getPromozioni: () => apiClient.get('/api/control-panel/promozioni'),
  createPromozione: (data) => apiClient.post('/api/control-panel/promozioni', data),
  updatePromozione: (id, data) => apiClient.put(`/api/control-panel/promozioni/${id}`, data),
  deletePromozione: (id) => apiClient.delete(`/api/control-panel/promozioni/${id}`),

  // Warehouse settings
  getWarehouseSettings: () => apiClient.get('/api/control-panel/warehouse-settings'),
  updateWarehouseSettings: (data) => apiClient.put('/api/control-panel/warehouse-settings', data),

  // Store settings
  getStoreSettings: () => apiClient.get('/api/control-panel/store-settings'),
  updateStoreSettings: (data) => apiClient.put('/api/control-panel/store-settings', data),
  uploadStoreLogo: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post('/api/control-panel/store-settings/upload-logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadStoreSfondo: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post('/api/control-panel/store-settings/upload-sfondo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  // Footer pages
  getFooterPages: () => apiClient.get('/api/control-panel/footer-pages'),
  updateFooterPage: (slug, data) => apiClient.put(`/api/control-panel/footer-pages/${slug}`, data),
  createFooterPage: (data) => apiClient.post('/api/control-panel/footer-pages', data),
  deleteFooterPage: (slug) => apiClient.delete(`/api/control-panel/footer-pages/${slug}`),
}
