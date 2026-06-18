import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const authClient = axios.create({
  baseURL: `${API_URL}/api/ecommerce`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
authClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('ecommerce-auth-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function loginUser(email, password) {
  try {
    const response = await authClient.post('/login', { email, password });
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Email o password non corretti');
    }
    if (error.response?.status === 403) {
      throw new Error('Account disattivato');
    }
    const message = error.response?.data?.detail;
    throw new Error(message || 'Errore di connessione, riprova');
  }
}

export async function registerUser(nome, cognome, email, password) {
  try {
    const response = await authClient.post('/registrazione', { nome, cognome, email, password });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.detail || '';
    if (message.toLowerCase().includes('email')) {
      throw new Error('Questa email è già in uso');
    }
    if (error.response?.status === 400) {
      throw new Error(message || 'Dati non validi, controlla i campi inseriti');
    }
    throw new Error('Errore di connessione, riprova');
  }
}

export async function getCurrentUser() {
  try {
    const response = await authClient.get('/me');
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Sessione scaduta, effettua di nuovo il login');
    }
    throw new Error('Impossibile verificare la sessione');
  }
}

export async function updateProfile(data) {
  try {
    const response = await authClient.put('/me', data);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Errore aggiornamento profilo');
  }
}

export async function changePassword(currentPassword, newPassword) {
  try {
    const response = await authClient.post('/cambio-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Errore cambio password');
  }
}

// Orders
export async function getOrders() {
  try {
    const response = await authClient.get('/ordini');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Errore caricamento ordini');
  }
}

export async function getOrderDetail(ordineId) {
  try {
    const response = await authClient.get(`/ordini/${ordineId}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Errore caricamento ordine');
  }
}

export async function requestReturn(ordineId, motivo) {
  try {
    const response = await authClient.post(`/ordini/${ordineId}/reso`, { motivo });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Errore richiesta reso');
  }
}

// Favorites
export async function getFavorites() {
  try {
    const response = await authClient.get('/preferiti');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Errore caricamento preferiti');
  }
}

export async function addFavorite(prodotto) {
  try {
    const response = await authClient.post('/preferiti', {
      prodotto_id: prodotto.id,
      nome_prodotto: prodotto.nome || prodotto.name,
      immagine_url: prodotto.immagine_url || prodotto.image,
      prezzo: prodotto.prezzo || prodotto.price,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Errore aggiunta preferito');
  }
}

export async function removeFavorite(prodottoId) {
  try {
    const response = await authClient.delete(`/preferiti/${prodottoId}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || 'Errore rimozione preferito');
  }
}

export async function requestPasswordReset(email) {
  // TODO: implement password reset endpoint
  throw new Error('Funzionalità in arrivo');
}
