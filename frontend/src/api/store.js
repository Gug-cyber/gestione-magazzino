import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

const storeClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

const clienteAuthClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

clienteAuthClient.interceptors.request.use(config => {
  const token = localStorage.getItem('cliente_token')
  if (token) {
    config.headers.Authorization = 'Bearer ' + token
  }
  return config
})

export const storeAPI = {
  getProdotti: (params) => storeClient.get('/api/store/prodotti', { params }),
  getProdotto: (id) => storeClient.get(`/api/store/prodotti/${id}`),
  getCategorie: () => storeClient.get('/api/store/categorie'),
  getCategorieTree: () => storeClient.get('/api/store/categorie/tree'),
  checkout: (data) => storeClient.post('/api/store/checkout', data),
  getFlagsPublici: () => storeClient.get('/api/store/feature-flags'),
  getBannersPublici: () => storeClient.get('/api/store/banners'),
  getPromozioniAttive: () => storeClient.get('/api/store/promozioni'),
  getStoreSettings: () => storeClient.get('/api/store/store-settings'),
  getFooterPages: () => storeClient.get('/api/store/footer-pages'),
  getFooterPage: (slug) => storeClient.get(`/api/store/footer-pages/${slug}`),
  // Cliente auth
  clienteLogin: (data) => clienteAuthClient.post('/api/clienti/login', data),
  clienteRegistrazione: (data) => clienteAuthClient.post('/api/clienti/registrazione', data),
  clienteMe: () => clienteAuthClient.get('/api/clienti/me'),
  clienteUpdate: (data) => clienteAuthClient.put('/api/clienti/me', data),
  clienteOrdini: () => clienteAuthClient.get('/api/clienti/ordini'),
  clienteOrdine: (id) => clienteAuthClient.get(`/api/clienti/ordini/${id}`),
  creaOrdine: (data) => clienteAuthClient.post('/api/clienti/ordini', data),
  clientePreferiti: () => clienteAuthClient.get('/api/clienti/preferiti'),
  aggiungiPreferito: (data) => clienteAuthClient.post('/api/clienti/preferiti', data),
  rimuoviPreferito: (prodottoId) => clienteAuthClient.delete(`/api/clienti/preferiti/${prodottoId}`),
}
