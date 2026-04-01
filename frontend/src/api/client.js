import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

client.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

client.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      delete client.defaults.headers.common['Authorization']
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const prodottiAPI = {
  getAll: (params) => client.get('/api/prodotti/', { params }),
  getById: (id) => client.get(`/api/prodotti/${id}`),
  getSottoScorta: () => client.get('/api/prodotti/sotto-scorta'),
  getScheda: (id) => client.get(`/api/prodotti/${id}/scheda`),
  create: (data) => client.post('/api/prodotti/', data),
  update: (id, data) => client.put(`/api/prodotti/${id}`, data),
  delete: (id) => client.delete(`/api/prodotti/${id}`),
  deleteAll: () => client.delete('/api/prodotti/all'),
  importCSV: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return client.post('/api/prodotti/import/csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  uploadFoto: (id, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return client.post(`/api/prodotti/${id}/foto`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  generateBarcode: (id) => client.post(`/api/prodotti/${id}/barcode`),
  deleteBarcode: (id) => client.delete(`/api/prodotti/${id}/barcode`),
  lookupByBarcode: (barcodeValue) => client.get(`/api/prodotti/barcode/${encodeURIComponent(barcodeValue)}`),
  bulkGenerateBarcodes: (data) => client.post('/api/prodotti/barcodes/bulk-generate', data),
  getBarcodeImageUrl: (id) => `${API_BASE_URL}/api/prodotti/${id}/barcode/image`,
}

export const categorieAPI = {
  getAll: () => client.get('/api/categorie/'),
  getById: (id) => client.get(`/api/categorie/${id}`),
  create: (data) => client.post('/api/categorie/', data),
  update: (id, data) => client.put(`/api/categorie/${id}`, data),
  delete: (id) => client.delete(`/api/categorie/${id}`),
}

export const movimentiAPI = {
  getAll: (params) => client.get('/api/movimenti/', { params }),
  getById: (id) => client.get(`/api/movimenti/${id}`),
  getByProdotto: (prodottoId) => client.get(`/api/movimenti/prodotto/${prodottoId}`),
  create: (data) => client.post('/api/movimenti/', data),
  update: (id, data) => client.put(`/api/movimenti/${id}`, data),
  delete: (id) => client.delete(`/api/movimenti/${id}`),
}

export const fornitoriAPI = {
  getAll: () => client.get('/api/fornitori/'),
  getById: (id) => client.get(`/api/fornitori/${id}`),
  create: (data) => client.post('/api/fornitori/', data),
  update: (id, data) => client.put(`/api/fornitori/${id}`, data),
  delete: (id) => client.delete(`/api/fornitori/${id}`),
}

export const ubicazioniAPI = {
  getAll: () => client.get('/api/ubicazioni/'),
  getById: (id) => client.get(`/api/ubicazioni/${id}`),
  create: (data) => client.post('/api/ubicazioni/', data),
  update: (id, data) => client.put(`/api/ubicazioni/${id}`, data),
  delete: (id) => client.delete(`/api/ubicazioni/${id}`),
}

export const updateProfilo = (data) => client.put('/api/auth/me', data)

export const forgotUsername = (email) => client.post('/api/auth/forgot-username', { email })
export const forgotPassword = (email) => client.post('/api/auth/forgot-password', { email })
export const resetPassword = (token, new_password) => client.post('/api/auth/reset-password', { token, new_password })

export const amministrazioneAPI = {
  getUtenti: () => client.get('/api/auth/utenti'),
  createUtente: (data) => client.post('/api/auth/utenti', data),
  updateUtente: (id, data) => client.put(`/api/auth/utenti/${id}`, data),
  deleteUtente: (id) => client.delete(`/api/auth/utenti/${id}`),
}

export const adminAPI = {
  // User management
  getAllUsers: () => client.get('/api/admin/utenti'),
  updateUserRole: (userId, ruolo) => client.put(`/api/admin/utenti/${userId}/ruolo`, { ruolo }),
  deleteUser: (userId) => client.delete(`/api/admin/utenti/${userId}`),

  // Company data
  getDatiAzienda: () => client.get('/api/admin/dati-azienda'),
  createDatiAzienda: (data) => client.post('/api/admin/dati-azienda', data),
  updateDatiAzienda: (data) => client.put('/api/admin/dati-azienda', data),
}

export const speseGestioneAPI = {
  getAll: (params) => client.get('/api/spese-gestione/', { params }),
  getById: (id) => client.get(`/api/spese-gestione/${id}`),
  create: (data) => client.post('/api/spese-gestione/', data),
  update: (id, data) => client.put(`/api/spese-gestione/${id}`, data),
  delete: (id) => client.delete(`/api/spese-gestione/${id}`),
}

export const analisiAPI = {
  getMensile: (anno) => client.get('/api/analisi/mensile', { params: { anno } }),
  getAnnuale: () => client.get('/api/analisi/annuale'),
  getTopProdottiMensile: (anno, mese) => client.get('/api/analisi/top-prodotti-mensile', { params: { anno, mese } }),
  getMarginalitaConfronto: (anno, mese) => client.get('/api/analisi/marginalita-confronto', { params: { anno, mese } }),
  getPackaging: (anno, mese) => client.get('/api/analisi/packaging', { params: { anno, mese } }),
}

export const datiStoriciAPI = {
  importCosti: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return client.post('/api/dati-storici/import/costi', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  importRicavi: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return client.post('/api/dati-storici/import/ricavi', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getAll: (params) => client.get('/api/dati-storici/', { params }),
  deleteTipo: (tipo) => client.delete(`/api/dati-storici/tipo/${tipo}`),
}

export const fattureAPI = {
  getAll: (params) => client.get('/api/fatture/', { params }),
  getById: (id) => client.get(`/api/fatture/${id}`),
  getByOrdine: (ordineId) => client.get('/api/fatture/', { params: { ordine_id: ordineId } }),
  create: (formData) => client.post('/api/fatture/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, data) => client.put(`/api/fatture/${id}`, data),
  togglePagata: (id) => client.patch(`/api/fatture/${id}/pagata`),
  delete: (id) => client.delete(`/api/fatture/${id}`),
  getDownloadUrl: (id) => `${API_BASE_URL}/api/fatture/${id}/download`,
}

export const clientiAPI = {
  getAll: (params) => client.get('/api/clienti/', { params }),
  getById: (id) => client.get(`/api/clienti/${id}`),
  create: (data) => client.post('/api/clienti/', data),
  update: (id, data) => client.put(`/api/clienti/${id}`, data),
  delete: (id) => client.delete(`/api/clienti/${id}`),
  getStorico: (id) => client.get(`/api/clienti/${id}/storico`),
  getStatistiche: (id) => client.get(`/api/clienti/${id}/statistiche`),
}

export const ordiniAPI = {
  getAll: (params) => client.get('/api/ordini/', { params }),
  getById: (id) => client.get(`/api/ordini/${id}`),
  create: (data) => client.post('/api/ordini/', data),
  update: (id, data) => client.put(`/api/ordini/${id}`, data),
  updateFull: (id, data) => client.put(`/api/ordini/${id}`, data),
  delete: (id) => client.delete(`/api/ordini/${id}`),
  updateTracking: (id, { corriere, tracking_number }) =>
    client.patch(`/api/ordini/${id}/tracking`, null, {
      params: { corriere, tracking_number },
    }),
  updateStato: (id, stato) => client.patch(`/api/ordini/${id}/stato`, { stato }),
}

export const fornitureAPI = {
  getAll: (params = {}) => client.get('/api/forniture/', { params }),
  getById: (id) => client.get(`/api/forniture/${id}`),
  create: (data) => client.post('/api/forniture/', data),
  update: (id, data) => client.put(`/api/forniture/${id}`, data),
  delete: (id) => client.delete(`/api/forniture/${id}`),
}

export const activityLogAPI = {
  getAll: (params) => client.get('/api/activity-log/', { params }),
  getMine: (params) => client.get('/api/activity-log/me', { params }),
}

export const cardtraderAPI = {
  getStatus: () => client.get('/api/cardtrader/status'),
  getListings: () => client.get('/api/cardtrader/listings'),
  importAll: () => client.post('/api/cardtrader/import'),
  sync: (prodottoId, data) => client.post(`/api/cardtrader/sync/${prodottoId}`, data),
  getMarketPrices: (blueprintId, params) => client.get(`/api/cardtrader/market-prices/${blueprintId}`, { params }),
  searchBlueprint: (nome) => client.get('/api/cardtrader/search-blueprint', { params: { nome } }),
  autoFillBlueprint: (prodottoId) => client.post(`/api/cardtrader/auto-fill-blueprint/${prodottoId}`),
  autoFillAllBlueprints: (limite = 50) => client.post('/api/cardtrader/auto-fill-all-blueprints', null, { params: { limite } }),
  autoPopulateBlueprintIds: (minConfidence = 60, maxRequests = 50) =>
    client.post('/api/cardtrader/auto-populate-blueprint-ids', null, {
      params: { min_confidence: minConfidence, max_requests: maxRequests },
    }),
}

export const ebayAPI = {
  getPrezzi: (nome, stato) => client.get('/api/ebay/prezzi', { params: { nome, stato } }),
}

export const cardmarketScraperAPI = {
  scrapePrezzi: (prodotto_id, force = false) =>
    client.post(`/api/cardmarket-scraper/scrape-prezzi/${prodotto_id}`, null, { params: { force } }),
  getPrezziCached: (prodotto_id) =>
    client.get(`/api/cardmarket-scraper/prezzi-cached/${prodotto_id}`),
}

export { trackingAPI } from './tracking'

/**
 * Restituisce l'URL completo per mostrare la foto di un prodotto.
 * - Se foto_url è già un URL assoluto (Cloudinary), lo restituisce direttamente.
 * - Se foto_url è un path relativo (/api/prodotti/...), costruisce l'URL assoluto
 *   aggiungendo il token JWT come query param per evitare il 401 sui tag <img>.
 * - Se foto_url è null/undefined, restituisce null.
 */
export function getFotoUrl(foto_url) {
  if (!foto_url) return null
  if (foto_url.startsWith('http://') || foto_url.startsWith('https://')) {
    return foto_url
  }
  const token = localStorage.getItem('token')
  const base = import.meta.env.VITE_API_URL || ''
  if (token) {
    return `${base}${foto_url}?token=${encodeURIComponent(token)}`
  }
  return `${base}${foto_url}`
}

export default client
