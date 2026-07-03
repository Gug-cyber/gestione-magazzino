import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || ''

const clientiAuthClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

clientiAuthClient.interceptors.request.use(config => {
  const token = localStorage.getItem('cliente_token')
  if (token) {
    config.headers.Authorization = 'Bearer ' + token
  }
  return config
})

export async function registrazione(data) {
  const response = await clientiAuthClient.post('/api/clienti/registrazione', data)
  localStorage.setItem('cliente_token', response.data.access_token)
  return response.data
}

export async function login(email, password) {
  const response = await clientiAuthClient.post('/api/clienti/login', { email, password })
  localStorage.setItem('cliente_token', response.data.access_token)
  return response.data
}

export function logout() {
  localStorage.removeItem('cliente_token')
}

export async function getProfilo() {
  const response = await clientiAuthClient.get('/api/clienti/me')
  return response.data
}

export async function updateProfilo(data) {
  const response = await clientiAuthClient.put('/api/clienti/me', data)
  return response.data
}

export async function getOrdini() {
  const response = await clientiAuthClient.get('/api/clienti/ordini')
  return response.data
}

export async function getOrdine(id) {
  const response = await clientiAuthClient.get(`/api/clienti/ordini/${id}`)
  return response.data
}

export async function creaOrdine(data) {
  const response = await clientiAuthClient.post('/api/clienti/ordini', data)
  return response.data
}

export async function richiediReso(ordineId, motivo) {
  const response = await clientiAuthClient.post(`/api/clienti/ordini/${ordineId}/reso`, { motivo })
  return response.data
}

export async function getPreferiti() {
  const response = await clientiAuthClient.get('/api/clienti/preferiti')
  return response.data
}

export async function aggiungiPreferito(data) {
  const response = await clientiAuthClient.post('/api/clienti/preferiti', data)
  return response.data
}

export async function rimuoviPreferito(prodottoId) {
  const response = await clientiAuthClient.delete(`/api/clienti/preferiti/${prodottoId}`)
  return response.data
}

export function isAuthenticated() {
  return !!localStorage.getItem('cliente_token')
}
