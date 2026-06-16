/**
 * AUTH CONTROLLER — PHASE 2
 * ==========================
 * Updated version of auth.controller.js.
 *
 * What's new in Phase 2:
 *   1. deviceInfo is now passed to service functions (for audit logging)
 *   2. refreshHandler now sends back a NEW refresh token cookie (rotation)
 *   3. New logoutAllHandler added
 *
 * ROLE OF THE CONTROLLER:
 * The controller sits between the route and the service.
 *   - Route defines the URL and middleware chain
 *   - Controller extracts data from req (body, cookies, headers, ip)
 *   - Service does the actual business logic
 *   - Controller sends the response back
 *
 * REQUEST FLOW:
 * POST /api/auth/login
 *   → auth.routes.js (applies rate limiter middleware)
 *   → loginHandler (this file) extracts email, password, deviceInfo from req
 *   → authService.login() does the work
 *   → loginHandler sends back { accessToken, user } + sets cookie
 */

const authService = require("./auth.service");
const { success, error } = require("../../utils/apiResponse");
const { REFRESH_TOKEN_EXPIRES_DAYS } = require("../../config/env");

/**
 * HELPER: extracts device info from the request.
 * Used for audit logging — tells us which device/IP made the request.
 *
 * req.ip       → the IP address of the client (e.g. "192.168.1.1")
 * req.headers["user-agent"] → browser/client info (e.g. "PostmanRuntime/7.x" or "Mozilla/5.0...")
 *
 * @param {Object} req - Express request object
 * @returns {{ ipAddress: string, deviceName: string }}
 */
function extractDeviceInfo(req) {
  return {
    ipAddress: req.ip || null,
    deviceName: req.headers["user-agent"] || null,
  };
}

/**
 * HELPER: sets the refresh token as a secure httpOnly cookie.
 *
 * httpOnly: true  → JavaScript on the page CANNOT read this cookie (protects from XSS attacks)
 * secure: true    → cookie only sent over HTTPS (set to true in production)
 * sameSite: strict → browser won't send this cookie on cross-site requests (protects from CSRF)
 * maxAge          → how long the cookie lives in the browser (in milliseconds)
 *
 * @param {Object} res - Express response object
 * @param {string} token - raw refresh token to store in cookie
 */
function setRefreshTokenCookie(res, token) {
  const maxAgeMs = (REFRESH_TOKEN_EXPIRES_DAYS || 7) * 24 * 60 * 60 * 1000;

  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: maxAgeMs,
  });
}

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
async function registerHandler(req, res, next) {
  try {
    const { email, password, name, role, schoolId } = req.body;

    if (!email || !password || !name || !role || !schoolId) {
      return error(res, 400, "email, password, name, role, and schoolId are required");
    }

    const user = await authService.register({ email, password, name, role, schoolId });

    return success(res, 201, "User registered successfully", { user });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
async function loginHandler(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return error(res, 400, "email and password are required");
    }

    // Extract device info for audit logging
    const deviceInfo = extractDeviceInfo(req);

    const { accessToken, refreshToken, user } = await authService.login(
      { email, password },
      deviceInfo
    );

    // Send refresh token as httpOnly cookie (JS can't read it)
    setRefreshTokenCookie(res, refreshToken);

    // Send access token in body (frontend stores in memory, NOT localStorage)
    return success(res, 200, "Login successful", { accessToken, user });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// POST /api/auth/refresh
// Client sends the refresh token cookie → we validate, rotate, and return:
//   - New access token (in response body)
//   - New refresh token (as a new httpOnly cookie, replacing the old one)
// ─────────────────────────────────────────────
async function refreshHandler(req, res, next) {
  try {
    // The refresh token comes from the cookie (automatically sent by browser)
    // req.cookies is available because we have cookieParser() in app.js
    const rawRefreshToken = req.cookies?.refreshToken;
    const deviceInfo = extractDeviceInfo(req);

    const { accessToken, refreshToken: newRefreshToken } = await authService.refresh(
      rawRefreshToken,
      deviceInfo
    );

    // Set the NEW refresh token cookie (replaces the old one)
    // This is the "rotation" part — old token is gone, new one takes its place
    setRefreshTokenCookie(res, newRefreshToken);

    return success(res, 200, "Token refreshed", { accessToken });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// POST /api/auth/logout
// Logs out from the current device only.
// ─────────────────────────────────────────────
async function logoutHandler(req, res, next) {
  try {
    const rawRefreshToken = req.cookies?.refreshToken;
    const deviceInfo = extractDeviceInfo(req);

    await authService.logout(rawRefreshToken, deviceInfo);

    // Clear the cookie from the browser
    res.clearCookie("refreshToken");

    return success(res, 200, "Logged out successfully");
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// POST /api/auth/logout-all
// Logs out from ALL devices at once.
//
// This route requires the user to be authenticated (valid access token)
// because we need req.user.userId to know WHICH user to log out everywhere.
// auth.middleware.js runs first and attaches req.user before this handler runs.
// ─────────────────────────────────────────────
async function logoutAllHandler(req, res, next) {
  try {
    // req.user is set by auth.middleware.js after verifying the access token
    const userId = req.user.userId;
    const deviceInfo = extractDeviceInfo(req);

    await authService.logoutAll(userId, deviceInfo);

    // Also clear the current device's cookie
    res.clearCookie("refreshToken");

    return success(res, 200, "Logged out from all devices successfully");
  } catch (err) {
    next(err);
  }
}

module.exports = {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
  logoutAllHandler,
};
