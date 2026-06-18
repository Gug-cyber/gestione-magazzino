/**
 * API helpers per autenticazione e area privata clienti.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Helper per gestire le richieste
async function fetchAPI(endpoint, options = {}) {
  const token = localStorage.getItem('cliente_token');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Errore di rete' }));
    throw new Error(error.detail || `Errore ${response.status}`);
  }
  
  // Per DELETE che non ritorna body
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return null;
  }
  
  return response.json();
}

// === AUTH ===

export async function registrazione(data) {
  const result = await fetchAPI('/api/clienti/registrazione', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  localStorage.setItem('cliente_token', result.access_token);
  return result;
}

export async function login(email, password) {
  const result = await fetchAPI('/api/clienti/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem('cliente_token', result.access_token);
  return result;
}

export function logout() {
  localStorage.removeItem('cliente_token');
}

export async function getProfilo() {
  return fetchAPI('/api/clienti/me');
}

export async function updateProfilo(data) {
  return fetchAPI('/api/clienti/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// === ORDINI ===

export async function getOrdini() {
  return fetchAPI('/api/clienti/ordini');
}

export async function getOrdine(id) {
  return fetchAPI(`/api/clienti/ordini/${id}`);
}

export async function creaOrdine(data) {
  return fetchAPI('/api/clienti/ordini', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function richiediReso(ordineId, motivo) {
  return fetchAPI(`/api/clienti/ordini/${ordineId}/reso`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  });
}

// === PREFERITI ===

export async function getPreferiti() {
  return fetchAPI('/api/clienti/preferiti');
}

export async function aggiungiPreferito(data) {
  return fetchAPI('/api/clienti/preferiti', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function rimuoviPreferito(prodottoId) {
  return fetchAPI(`/api/clienti/preferiti/${prodottoId}`, {
    method: 'DELETE',
  });
}

// Verifica se l'utente è autenticato
export function isAuthenticated() {
  return !!localStorage.getItem('cliente_token');
}