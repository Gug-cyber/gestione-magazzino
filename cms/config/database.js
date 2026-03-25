module.exports = ({ env }) => ({
  connection: {
    client: 'postgres',
    connection: {
      host: env('DATABASE_HOST', 'localhost'),
      port: env.int('DATABASE_PORT', 5432),
      database: env('DATABASE_NAME', 'gestione_magazzino'),
      user: env('DATABASE_USERNAME', 'postgres'),
      password: env('DATABASE_PASSWORD', ''),
      schema: env('DATABASE_SCHEMA', 'public'),
      // rejectUnauthorized: false is required for Neon PostgreSQL SSL compatibility
      ssl: env.bool('DATABASE_SSL', false) ? {
        rejectUnauthorized: false,
      } : false,
    },
    debug: false,
    pool: {
      min: 0,
      max: 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
    },
  },
});
