const authService = require("./auth.service");
const { success, error } = require("../../utils/apiResponse");
const { REFRESH_TOKEN_EXPIRES_DAYS } = require("../../config/env");

/**
 * AUTH CONTROLLER
 * Handles HTTP req/res. Extracts input, calls the service, sends the response.
 * Business logic lives in auth.service.js — controllers stay thin.
 */

/**
 * Helper: sets the refresh token as an httpOnly cookie.
 * - httpOnly: JavaScript on the frontend CANNOT read this cookie (XSS protection)
 * - secure: only sent over HTTPS (set to true in production)
 * - sameSite: "strict" helps prevent CSRF by not sending the cookie on cross-site requests
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

/**
 * POST /auth/register
 */
async function registerHandler(req, res, next) {
  try {
    const { email, password, name, role, schoolId } = req.body;

    // Basic presence validation (Phase 4 will add a proper validation middleware)
    if (!email || !password || !name || !role || !schoolId) {
      return error(res, 400, "email, password, name, role, and schoolId are required");
    }

    const user = await authService.register({ email, password, name, role, schoolId });

    return success(res, 201, "User registered successfully", { user });
  } catch (err) {
    next(err); // forward to error.middleware.js
  }
}

/**
 * POST /auth/login
 */
async function loginHandler(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return error(res, 400, "email and password are required");
    }

    const deviceInfo = {
      deviceName: req.headers["user-agent"] || null,
      ipAddress: req.ip,
    };

    const { accessToken, refreshToken, user } = await authService.login(
      { email, password },
      deviceInfo
    );

    // Refresh token -> httpOnly cookie (frontend JS never sees this)
    setRefreshTokenCookie(res, refreshToken);

    // Access token -> response body (frontend stores in memory)
    return success(res, 200, "Login successful", { accessToken, user });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/refresh
 * Reads the refresh token from the cookie, returns a new access token.
 */
async function refreshHandler(req, res, next) {
  try {
    const rawRefreshToken = req.cookies?.refreshToken;

    const { accessToken } = await authService.refresh(rawRefreshToken);

    return success(res, 200, "Token refreshed", { accessToken });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/logout
 * Revokes the refresh token and clears the cookie.
 */
async function logoutHandler(req, res, next) {
  try {
    const rawRefreshToken = req.cookies?.refreshToken;

    await authService.logout(rawRefreshToken);

    res.clearCookie("refreshToken");

    return success(res, 200, "Logged out successfully");
  } catch (err) {
    next(err);
  }
}

module.exports = {
  registerHandler,
  loginHandler,
  refreshHandler,
  logoutHandler,
};
