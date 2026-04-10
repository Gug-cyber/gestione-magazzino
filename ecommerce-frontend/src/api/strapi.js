import axios from 'axios';

const STRAPI_URL = import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337';

const strapiClient = axios.create({
  baseURL: `${STRAPI_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const strapiAPI = {
  // Prodotti
  getProducts: async (params = {}) => {
    const response = await strapiClient.get('/products', {
      params: {
        populate: '*',
        filters: { publishedAt: { $notNull: true } },
        ...params
      }
    });
    return response.data;
  },

  getProduct: async (slug) => {
    const response = await strapiClient.get('/products', {
      params: {
        populate: '*',
        filters: { slug: { $eq: slug }, publishedAt: { $notNull: true } }
      }
    });
    return response.data.data[0];
  },

  getFeaturedProducts: async () => {
    const response = await strapiClient.get('/products', {
      params: {
        populate: '*',
        filters: {
          featured: { $eq: true },
          publishedAt: { $notNull: true }
        },
        pagination: { limit: 8 }
      }
    });
    return response.data;
  },

  // Categorie
  getCategories: async () => {
    const response = await strapiClient.get('/categories', {
      params: { populate: '*' }
    });
    return response.data;
  },

  // Banner
  getBanners: async () => {
    const response = await strapiClient.get('/banners', {
      params: {
        populate: '*',
        filters: { active: { $eq: true } },
        sort: ['order:asc']
      }
    });
    return response.data;
  },

  // Pagine statiche
  getStaticPage: async (slug) => {
    const response = await strapiClient.get('/static-pages', {
      params: {
        populate: '*',
        filters: { slug: { $eq: slug } }
      }
    });
    return response.data.data[0];
  },

  // Ordini
  createOrder: async (orderData, token) => {
    const response = await strapiClient.post('/orders', {
      data: orderData
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  updateProductStock: async (productId, newQuantity, token) => {
    const response = await strapiClient.put(`/products/${productId}`, {
      data: { quantity: newQuantity }
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  getUserOrders: async (userId, token) => {
    const response = await strapiClient.get('/orders', {
      params: {
        filters: { user: { id: { $eq: userId } } },
        populate: '*',
        sort: ['createdAt:desc']
      },
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  getOrder: async (orderId, token) => {
    const response = await strapiClient.get(`/orders/${orderId}`, {
      params: { populate: '*' },
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};

export default strapiAPI;
