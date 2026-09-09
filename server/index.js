require("dotenv").config({
  path: require("node:path").join(__dirname, ".env"),
});
const pool = require("./db");
const { createApp } = require("./app");
const production = process.env.NODE_ENV === "production";
if (production && !process.env.APP_ORIGIN)
  throw new Error("Set APP_ORIGIN before starting production.");
const app = createApp({
  pool,
  production,
  origin: process.env.APP_ORIGIN || "http://localhost:5173",
});
const server = app.listen(
  process.env.PORT || 3001,
  process.env.HOST || "127.0.0.1",
  () => {
    console.log("Kiddy API started.");
  },
);
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => server.close(() => pool.end()));
}
