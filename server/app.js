const express = require("express");
const { createAuth } = require("./auth");

function createApp({
  pool,
  origin = "http://localhost:5173",
  production = false,
}) {
  if (
    new URL(origin).origin !== origin ||
    (production && !origin.startsWith("https://"))
  ) {
    throw new Error(
      "APP_ORIGIN must be an exact origin, with HTTPS in production.",
    );
  }
  const app = express();
  app.disable("x-powered-by");
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    res.set("X-Content-Type-Options", "nosniff");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      if (req.get("Origin") !== origin)
        return res
          .status(403)
          .json({ error: "Request origin is not allowed." });
      if (!req.is("application/json"))
        return res
          .status(415)
          .json({ error: "Send an application/json request." });
    }
    next();
  });
  app.use(express.json({ limit: "32kb" }));
  const auth = createAuth(pool, production);
  app.use("/api/auth", auth.router);
  app.use("/api", auth.requireUser, auth.requireAdmin);
  app.use("/api/children", require("./routes/children")(pool));
  app.use("/api/classrooms", require("./routes/classrooms")(pool));
  app.use("/api/dashboard", require("./routes/dashboard")(pool));
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "Endpoint not found." }),
  );
  app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (err.type === "entity.parse.failed")
      return res.status(400).json({ error: "Invalid JSON body." });
    if (err.type === "entity.too.large")
      return res.status(413).json({ error: "Request is too large." });
    // Never log request bodies, SQL parameters, or database detail containing personal data.
    console.error("Request failed:", err.code || err.name);
    res
      .status(500)
      .json({ error: "The request could not be completed. Please try again." });
  });
  return app;
}
module.exports = { createApp };
