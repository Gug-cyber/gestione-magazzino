const dotenv = require("dotenv");
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://medusa:medusa@medusa_db:5432/medusa";

module.exports = {
  projectConfig: {
    redis_url: undefined,
    database_url: DATABASE_URL,
    database_type: "postgres",
    store_cors: process.env.STORE_CORS || "http://localhost:3000",
    admin_cors: process.env.ADMIN_CORS || "http://localhost:9000",
    auth_cors: process.env.AUTH_CORS || "http://localhost:9000,http://localhost:3000",
    jwt_secret: process.env.JWT_SECRET || "supersecret",
    cookie_secret: process.env.COOKIE_SECRET || "supersecret",
  },
  plugins: [
    "medusa-fulfillment-manual",
    "medusa-payment-manual",
  ],
};
