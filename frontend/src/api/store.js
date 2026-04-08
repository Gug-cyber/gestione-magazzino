import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

const storeClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

export const storeAPI = {
  getProdotti: (params) => storeClient.get('/api/store/prodotti', { params }),
  getProdotto: (id) => storeClient.get(`/api/store/prodotti/${id}`),
  getCategorie: () => storeClient.get('/api/store/categorie'),
  checkout: (data) => storeClient.post('/api/store/checkout', data),
  getFlagsPublici: () => storeClient.get('/api/store/feature-flags'),
  getBannersPublici: () => storeClient.get('/api/store/banners'),
  getPromozioniAttive: () => storeClient.get('/api/store/promozioni'),
}
