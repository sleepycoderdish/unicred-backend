const jwt = require("jsonwebtoken");
const { JWT_ACCESS_SECRET, JWT_ACCESS_EXPIRES_IN } = require("../config/env");

/**
 * ACCESS TOKEN
 * - Short-lived (15 minutes recommended)
 * - Sent in the response body, stored in memory on the frontend (NOT localStorage)
 * - Contains the data we need on every request: userId, role, schoolId
 * - Signed with HS256 (symmetric key) — fine since one backend signs AND verifies
 */

/**
 * Creates a signed access token.
 * @param {Object} payload - { userId, role, schoolId }
 * @returns {string} signed JWT
 */
function signAccessToken(payload) {
  return jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRES_IN || "15m",
  });
}

/**
 * Verifies an access token and returns its decoded payload.
 * Throws an error if the token is invalid or expired.
 * @param {string} token
 * @returns {Object} decoded payload { userId, role, schoolId, iat, exp }
 */
function verifyAccessToken(token) {
  return jwt.verify(token, JWT_ACCESS_SECRET);
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
};
