import axios from 'axios';

const STRAPI_URL = import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337';

const authClient = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function loginUser(identifier, password) {
  try {
    const response = await authClient.post('/auth/local', { identifier, password });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.error?.message;
    if (error.response?.status === 400 || error.response?.status === 401) {
      throw new Error('Email o password non corretti');
    }
    throw new Error(message || 'Errore di connessione, riprova');
  }
}

export async function registerUser(username, email, password) {
  try {
    const response = await authClient.post('/auth/local/register', { username, email, password });
    return response.data;
  } catch (error) {
    const message = error.response?.data?.error?.message || '';
    if (message.toLowerCase().includes('email')) {
      throw new Error('Questa email è già in uso');
    }
    if (message.toLowerCase().includes('username')) {
      throw new Error('Questo username è già in uso');
    }
    if (error.response?.status === 400) {
      throw new Error('Dati non validi, controlla i campi inseriti');
    }
    throw new Error('Errore di connessione, riprova');
  }
}

export async function getCurrentUser(token) {
  try {
    const response = await authClient.get('/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      throw new Error('Sessione scaduta, effettua di nuovo il login');
    }
    throw new Error('Impossibile verificare la sessione');
  }
}

export async function requestPasswordReset(email) {
  try {
    await authClient.post('/auth/forgot-password', { email });
  } catch {
    throw new Error('Errore durante il recupero password');
  }
}
