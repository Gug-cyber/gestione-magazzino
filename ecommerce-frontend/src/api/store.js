import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const backendClient = axios.create({
  baseURL: `${BACKEND_URL}/api/store`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const storeAPI = {
  getStoreProdotti: async (params = {}) => {
    const response = await backendClient.get('/prodotti', { params });
    return response.data;
  },

  getStoreProdotto: async (id) => {
    const response = await backendClient.get(`/prodotti/${id}`);
    return response.data;
  },

  getStoreProdottoImmagini: async (id) => {
    const response = await backendClient.get(`/prodotti/${id}/immagini`);
    return response.data;
  },

  getCategorieTree: async () => {
    const response = await backendClient.get('/categorie/tree');
    return response.data;
  },

  getCategorie: async () => {
    const response = await backendClient.get('/categorie');
    return response.data;
  },
};

export default storeAPI;
