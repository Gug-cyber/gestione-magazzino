module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  url: env('PUBLIC_URL', 'http://localhost:1337'),
  app: {
    keys: env.array('APP_KEYS'),
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
  cors: {
    enabled: true,
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      env('MAGAZZINO_BACKEND_URL', 'http://localhost:8000'),
      env('FRONTEND_URL', ''),
    ].filter(Boolean),
    credentials: true,
  },
});
