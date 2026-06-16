/**
 * AUTH ROUTES — PHASE 2
 * ======================
 * Updated version of auth.routes.js.
 *
 * What's new in Phase 2:
 *   1. Rate limiters applied to login and refresh routes
 *   2. New POST /logout-all route (protected — requires valid access token)
 *
 * HOW MIDDLEWARE CHAINS WORK ON A ROUTE:
 * When you write: router.post("/login", loginRateLimiter, loginHandler)
 * Express runs them LEFT TO RIGHT:
 *   1. loginRateLimiter → checks if this IP has exceeded the limit
 *      - If limit exceeded: sends 429 response and STOPS here
 *      - If ok: calls next() and moves to loginHandler
 *   2. loginHandler → processes the login request
 *
 * For the protected /logout-all route:
 *   1. loginRateLimiter (rate check)
 *   2. authenticate (verifies JWT, attaches req.user) → if invalid: sends 401 and STOPS
 *   3. logoutAllHandler → does the actual logout
 *
 * All routes are mounted under /auth in routes/index.js
 * Final URLs: /api/auth/register, /api/auth/login, etc.
 */

const express = require("express");
const router = express.Router();

const {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  logoutAllHandler,
} = require("./auth.controller");

const { loginRateLimiter, refreshRateLimiter } = require("../../middleware/rateLimit.middleware");

// authenticate middleware is needed for the logout-all route
// (user must have a valid access token to prove who they are)
const authenticate = require("../../middleware/auth.middleware");

// ── PUBLIC ROUTES (no access token needed) ──

// POST /api/auth/register
// No rate limiter here — but you could add one if you want to prevent spam registrations
router.post("/register", registerHandler);

// POST /api/auth/login
// loginRateLimiter → max 5 attempts per IP per 15 minutes
router.post("/login", loginRateLimiter, loginHandler);

// POST /api/auth/refresh
// refreshRateLimiter → max 20 attempts per IP per 15 minutes
// No access token needed here — the refresh token cookie IS the auth
router.post("/refresh", refreshRateLimiter, refreshHandler);

// POST /api/auth/logout
// No rate limiter needed — logout is harmless to spam
router.post("/logout", logoutHandler);

// ── PROTECTED ROUTE (access token required) ──

// POST /api/auth/logout-all
// authenticate runs first → verifies JWT → attaches req.user
// then logoutAllHandler uses req.user.userId to revoke all sessions
router.post("/logout-all", authenticate, logoutAllHandler);

module.exports = router;
