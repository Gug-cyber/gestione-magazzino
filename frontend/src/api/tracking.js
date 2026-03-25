import client from './client'

export const trackingAPI = {
  refresh: (trackingNumber) =>
    client.post(`/api/tracking/refresh/${encodeURIComponent(trackingNumber)}`),

  refreshAll: () =>
    client.post('/api/tracking/refresh-all'),

  getHistory: (trackingNumber) =>
    client.get(`/api/tracking/history/${encodeURIComponent(trackingNumber)}`),

  getLatest: (trackingNumber) =>
    client.get(`/api/tracking/latest/${encodeURIComponent(trackingNumber)}`),
}
