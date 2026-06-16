const express = require("express");
const router = express.Router();

const {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
} = require("./auth.controller");

/**
 * AUTH ROUTES
 * All routes here are PUBLIC (no auth.middleware) since they're
 * how a user obtains tokens in the first place.
 *
 * Mounted in routes/index.js as: router.use("/auth", authRoutes)
 * Final paths: /api/auth/register, /api/auth/login, etc.
 */

router.post("/register", registerHandler);
router.post("/login", loginHandler);
router.post("/refresh", refreshHandler);
router.post("/logout", logoutHandler);

module.exports = router;
