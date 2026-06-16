const crypto = require("crypto");
const prisma = require("../../config/db");
const {
  hashPassword,
  comparePassword,
  generateRefreshToken,
  hashRefreshToken,
} = require("../../utils/hash");
const { signAccessToken } = require("../../utils/jwt");
const { REFRESH_TOKEN_EXPIRES_DAYS } = require("../../config/env");

/**
 * AUTH SERVICE
 * Contains all the business logic for authentication.
 * Controllers call these functions — they don't talk to Prisma directly.
 */

/**
 * REGISTER
 * Creates a new user account.
 * NOTE: role + schoolId would normally be assigned by an admin/invite flow
 * in a real app, but for Phase 1 we accept them directly for simplicity.
 */
async function register({ email, password, name, role, schoolId }) {
  // 1. Check if a user with this email already exists
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const err = new Error("Email already registered");
    err.statusCode = 409; // Conflict
    throw err;
  }

  // 2. Hash the password before storing — NEVER store plain-text passwords
  const passwordHash = await hashPassword(password);

  // 3. Create the user
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      role,
      schoolId,
    },
  });

  // Return only safe fields (never return passwordHash)
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    schoolId: user.schoolId,
  };
}

/**
 * LOGIN
 * Verifies credentials and issues a new access + refresh token pair.
 *
 * @param {Object} credentials - { email, password }
 * @param {Object} deviceInfo - { deviceName, ipAddress } for tracking the session
 * @returns {Object} { accessToken, refreshToken, user }
 */
async function login({ email, password }, deviceInfo = {}) {
  // 1. Find the user by email
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const err = new Error("Invalid email or password");
    err.statusCode = 401;
    throw err;
  }

  // 2. Check the account is active and not soft-deleted
  if (!user.isActive || user.deletedAt) {
    const err = new Error("This account is inactive");
    err.statusCode = 403;
    throw err;
  }

  // 3. Compare the provided password with the stored hash
  const passwordMatches = await comparePassword(password, user.passwordHash);
  if (!passwordMatches) {
    const err = new Error("Invalid email or password");
    err.statusCode = 401;
    throw err;
  }

  // 4. Generate the access token (short-lived, contains role/schoolId for quick checks)
  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role,
    schoolId: user.schoolId,
  });

  // 5. Generate the refresh token (long-lived, random string)
  const rawRefreshToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(rawRefreshToken);
  const tokenFamily = crypto.randomUUID();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (REFRESH_TOKEN_EXPIRES_DAYS || 7));

  // 6. Store the HASHED refresh token in the database (never the raw value)
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      family: tokenFamily,
      deviceName: deviceInfo.deviceName || null,
      ipAddress: deviceInfo.ipAddress || null,
      expiresAt,
    },
  });

  // 7. Update last login timestamp
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      schoolId: user.schoolId,
    },
  };
}

/**
 * REFRESH
 * Issues a new access token using a valid refresh token.
 * (Phase 1: basic validation only — rotation/reuse-detection comes in Phase 2)
 *
 * @param {string} rawRefreshToken - the raw token from the client's cookie
 * @returns {Object} { accessToken }
 */
async function refresh(rawRefreshToken) {
  if (!rawRefreshToken) {
    const err = new Error("No refresh token provided");
    err.statusCode = 401;
    throw err;
  }

  // 1. Hash the incoming token so we can look it up
  //    (we only ever stored the hash, never the raw value)
  const tokenHash = hashRefreshToken(rawRefreshToken);

  const storedToken = await prisma.refreshToken.findFirst({
    where: { tokenHash },
    include: { user: true },
  });

  // 2. Validate the token exists, isn't revoked, and isn't expired
  if (!storedToken) {
    const err = new Error("Invalid refresh token");
    err.statusCode = 401;
    throw err;
  }

  if (storedToken.revokedAt) {
    const err = new Error("Refresh token has been revoked");
    err.statusCode = 401;
    throw err;
  }

  if (storedToken.expiresAt < new Date()) {
    const err = new Error("Refresh token has expired");
    err.statusCode = 401;
    throw err;
  }

  // 3. Issue a new access token
  const accessToken = signAccessToken({
    userId: storedToken.user.id,
    role: storedToken.user.role,
    schoolId: storedToken.user.schoolId,
  });

  return { accessToken };
}

/**
 * LOGOUT
 * Revokes the given refresh token so it can no longer be used.
 *
 * @param {string} rawRefreshToken
 */
async function logout(rawRefreshToken) {
  if (!rawRefreshToken) return; // nothing to do

  const tokenHash = hashRefreshToken(rawRefreshToken);

  // Mark the token as revoked instead of deleting it,
  // so we keep a record for auditing/debugging.
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

module.exports = {
  register,
  login,
  refresh,
  logout,
};
