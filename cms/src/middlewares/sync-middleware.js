'use strict';

const fetch = require('node-fetch');

/**
 * Middleware per sincronizzazione automatica dei prodotti al magazzino.
 * Intercetta le modifiche ai prodotti nel CMS e notifica il backend.
 */
module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    await next();

    // Dopo una PUT/POST/DELETE su /api/products, notifica il backend
    const isProductMutation =
      ctx.request.url.startsWith('/api/products') &&
      ['POST', 'PUT', 'DELETE'].includes(ctx.request.method);

    if (isProductMutation && ctx.response.status < 400) {
      const backendUrl = process.env.MAGAZZINO_BACKEND_URL || 'http://localhost:8000';
      const webhookSecret = process.env.MAGAZZINO_WEBHOOK_SECRET || '';

      try {
        await fetch(`${backendUrl}/api/cms/webhook/product-updated`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': webhookSecret,
          },
          body: JSON.stringify({
            method: ctx.request.method,
            url: ctx.request.url,
            body: ctx.request.body,
            response: ctx.response.body,
          }),
        });
      } catch (err) {
        strapi.log.warn(`[sync-middleware] Notifica backend fallita: ${err.message}`);
      }
    }
  };
};
