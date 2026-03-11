import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

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
  create: (data) => client.post('/api/prodotti/', data),
  update: (id, data) => client.put(`/api/prodotti/${id}`, data),
  delete: (id) => client.delete(`/api/prodotti/${id}`),
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
  create: (formData) => client.post('/api/fatture/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, data) => client.put(`/api/fatture/${id}`, data),
  togglePagata: (id) => client.patch(`/api/fatture/${id}/pagata`),
  delete: (id) => client.delete(`/api/fatture/${id}`),
  getDownloadUrl: (id) => `${API_BASE_URL}/api/fatture/${id}/download`,
}

export default client
