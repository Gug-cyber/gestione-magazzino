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

export default client
