import api from './client'

export const aiAPI = {
  analisiMercato: (data) => api.post('/api/ai/analisi-mercato', data),
  analisiMagazzino: () => api.get('/api/ai/analisi-magazzino'),
  generaDescrizione: (data) => api.post('/api/ai/genera-descrizione', data),
  previsioniStock: () => api.get('/api/ai/previsioni-stock'),
  chat: (data) => api.post('/api/ai/chat', data),
}
