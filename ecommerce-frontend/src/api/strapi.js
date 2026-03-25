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
  }
};

export default strapiAPI;
