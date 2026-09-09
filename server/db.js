require("dotenv").config({
  path: require("node:path").join(__dirname, ".env"),
});
const { Pool } = require("pg");

if (!process.env.DB_URL)
  throw new Error("Set DB_URL in server/.env. See README.md.");
const pool = new Pool({
  connectionString: process.env.DB_URL,
  connectionTimeoutMillis: 5000,
});
pool.on("error", (err) =>
  console.error("Database connection error:", err.code || err.name),
);

module.exports = pool;
