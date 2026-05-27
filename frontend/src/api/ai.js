import api from './client'

export const aiAPI = {
  analisiMercato: (data) => api.post('/api/ai/analisi-mercato', data),
  analisiPrezzi: () => api.get('/api/ai/analisi-prezzi'),
  analisiMagazzino: () => api.get('/api/ai/analisi-magazzino'),
  generaDescrizione: (data) => api.post('/api/ai/genera-descrizione', data),
  generaEmailFornitore: (data) => api.post('/api/ai/email-fornitore', data),
  previsioniStock: () => api.get('/api/ai/previsioni-stock'),
  chat: (data) => api.post('/api/ai/chat', data),
  trendProdotto: (data) => api.post('/api/ai/trend-prodotto', data),
}
