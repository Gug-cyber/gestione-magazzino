import client from './client'

export const trackingAPI = {
  refresh: (trackingNumber, corriere) =>
    client.post(`/api/tracking/refresh/${encodeURIComponent(trackingNumber)}`, null, {
      params: { corriere },
    }),

  refreshAll: () =>
    client.post('/api/tracking/refresh-all'),

  getHistory: (trackingNumber, corriere) =>
    client.get(`/api/tracking/history/${encodeURIComponent(trackingNumber)}`, {
      params: corriere ? { corriere } : undefined,
    }),

  getLatest: (trackingNumber, corriere) =>
    client.get(`/api/tracking/latest/${encodeURIComponent(trackingNumber)}`, {
      params: corriere ? { corriere } : undefined,
    }),
}
