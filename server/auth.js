const express = require("express");
const { randomBytes, createHash } = require("node:crypto");
const { hashPassword, verifyPassword } = require("./lib/passwords");
const { asyncRoute } = require("./lib/http");
const digest = (value) => createHash("sha256").update(value).digest("hex");

function createAuth(pool, production) {
  const router = express.Router();
  const cookieName = production ? "__Host-kiddy_session" : "kiddy_session";
  const cookieOptions = {
    httpOnly: true,
    secure: production,
    sameSite: "strict",
    path: "/",
  };
  const dummyHash = hashPassword(randomBytes(32).toString("hex"));
  function token(req) {
    const value = (req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${cookieName}=`))
      ?.slice(cookieName.length + 1);
    return /^[a-f0-9]{64}$/.test(value || "") ? value : null;
  }
  const requireUser = asyncRoute(async (req, res, next) => {
    const sessionToken = token(req);
    if (!sessionToken)
      return res.status(401).json({ error: "Please sign in." });
    const result = await pool.query(
      `SELECT u.id, u.email, u.center_id AS "centerId", u.role
       FROM app_sessions s JOIN app_users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > now() AND u.disabled_at IS NULL`,
      [digest(sessionToken)],
    );
    if (!result.rows[0]) {
      res.clearCookie(cookieName, cookieOptions);
      return res
        .status(401)
        .json({ error: "Your session has expired. Please sign in again." });
    }
    req.user = result.rows[0];
    next();
  });
  function requireAdmin(req, res, next) {
    if (!["owner", "admin"].includes(req.user.role))
      return res.status(403).json({ error: "Administrator access required." });
    next();
  }
  router.post(
    "/login",
    asyncRoute(async (req, res) => {
      const { email, password } = req.body || {};
      if (
        typeof email !== "string" ||
        email.length > 254 ||
        typeof password !== "string" ||
        password.length > 256 ||
        !password
      ) {
        return res
          .status(400)
          .json({ error: "Enter your email and password." });
      }
      // Persistent atomic limits survive restarts. Client forwarding headers are not trusted.
      for (const key of [
        digest(`ip:${req.ip}`),
        digest(`email:${email.trim().toLowerCase()}`),
      ]) {
        const attempts = await pool.query(
          `INSERT INTO login_attempts (key, attempts, expires_at) VALUES ($1, 1, now() + interval '15 minutes')
         ON CONFLICT (key) DO UPDATE SET
           attempts = CASE WHEN login_attempts.expires_at <= now() THEN 1 ELSE login_attempts.attempts + 1 END,
           expires_at = CASE WHEN login_attempts.expires_at <= now() THEN now() + interval '15 minutes' ELSE login_attempts.expires_at END
         RETURNING attempts`,
          [key],
        );
        if (attempts.rows[0].attempts > 10) {
          res.set("Retry-After", "900");
          return res
            .status(429)
            .json({
              error: "Too many sign-in attempts. Try again in 15 minutes.",
            });
        }
      }
      const result = await pool.query(
        `SELECT id, email, center_id AS "centerId", role, password_hash
       FROM app_users WHERE email = $1 AND disabled_at IS NULL`,
        [email.trim().toLowerCase()],
      );
      const user = result.rows[0];
      const valid = await verifyPassword(
        password,
        user?.password_hash || (await dummyHash),
      );
      if (!valid || !user)
        return res
          .status(401)
          .json({ error: "Email or password is incorrect." });
      if (!["owner", "admin"].includes(user.role))
        return res
          .status(403)
          .json({ error: "Administrator access required." });
      const oldToken = token(req);
      if (oldToken)
        await pool.query("DELETE FROM app_sessions WHERE token_hash = $1", [
          digest(oldToken),
        ]);
      const sessionToken = randomBytes(32).toString("hex");
      await pool.query(
        `INSERT INTO app_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '8 hours')`,
        [digest(sessionToken), user.id],
      );
      await pool.query("DELETE FROM app_sessions WHERE expires_at <= now()");
      await pool.query("DELETE FROM login_attempts WHERE expires_at <= now()");
      res.cookie(cookieName, sessionToken, {
        ...cookieOptions,
        maxAge: 8 * 3600 * 1000,
      });
      const { password_hash, ...publicUser } = user;
      res.json({ user: publicUser });
    }),
  );
  router.get("/me", requireUser, requireAdmin, (req, res) =>
    res.json({ user: req.user }),
  );
  router.post(
    "/logout",
    asyncRoute(async (req, res) => {
      const sessionToken = token(req);
      if (sessionToken)
        await pool.query("DELETE FROM app_sessions WHERE token_hash = $1", [
          digest(sessionToken),
        ]);
      res.clearCookie(cookieName, cookieOptions);
      res.status(204).end();
    }),
  );
  return { router, requireUser, requireAdmin };
}
module.exports = { createAuth };
