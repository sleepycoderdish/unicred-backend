/**
 * AUTH SERVICE — PHASE 2
 * =======================
 * This is the updated version of auth.service.js with these new features:
 *
 * 1. REFRESH TOKEN ROTATION
 *    Every time the user calls /auth/refresh, the old refresh token is REVOKED
 *    and a brand new one is issued. So each refresh token is single-use only.
 *
 * 2. REFRESH TOKEN REUSE DETECTION
 *    If someone tries to use an already-revoked refresh token (meaning it was stolen),
 *    we revoke the ENTIRE token family — logging out ALL devices for that login chain.
 *
 * 3. AUDIT LOGGING
 *    Every important event (login, logout, failed login, token reuse) is recorded
 *    in the AuditLog table for security tracking.
 *
 * 4. LOGOUT FROM ALL DEVICES
 *    New logoutAll() function that revokes ALL refresh tokens for a user at once.
 *
 * REQUEST FLOW REMINDER:
 * Client → auth.routes.js → auth.controller.js → auth.service.js (this file) → Prisma → Database
 * Response travels back the same way in reverse.
 */

const crypto = require("crypto");
const prisma = require("../../config/db");
const {
  hashPassword,
  comparePassword,
  generateRefreshToken,
  hashRefreshToken,
} = require("../../utils/hash");
const { signAccessToken } = require("../../utils/jwt");
const { writeAuditLog, AUDIT_EVENTS } = require("../../utils/audit");
const { REFRESH_TOKEN_EXPIRES_DAYS } = require("../../config/env");

// ─────────────────────────────────────────────
// HELPER: calculates the expiry date for a new refresh token
// e.g. if REFRESH_TOKEN_EXPIRES_DAYS = 7, this returns "7 days from now"
// ─────────────────────────────────────────────
function getRefreshTokenExpiry() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (REFRESH_TOKEN_EXPIRES_DAYS || 7));
  return expiresAt;
}

// ─────────────────────────────────────────────
// REGISTER
// (No changes from Phase 1 — just added audit logging)
// ─────────────────────────────────────────────
async function register({ email, password, name, role, schoolId }) {
  // 1. Check if email is already taken
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const err = new Error("Email already registered");
    err.statusCode = 409;
    throw err;
  }

  // 2. Hash the password before saving (NEVER store plain text passwords)
  const passwordHash = await hashPassword(password);

  // 3. Create the user in the database
  const user = await prisma.user.create({
    data: { email, passwordHash, name, role, schoolId },
  });

  // 4. Write audit log — record that a new user registered
  await writeAuditLog({
    userId: user.id,
    schoolId: user.schoolId,
    action: AUDIT_EVENTS.REGISTER,
    metadata: { email, role },
  });

  // Return safe fields only (never return passwordHash to the client)
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    schoolId: user.schoolId,
  };
}

// ─────────────────────────────────────────────
// LOGIN
// (Added audit logging for both success and failure)
// ─────────────────────────────────────────────
async function login({ email, password }, deviceInfo = {}) {
  // 1. Find the user by email
  const user = await prisma.user.findUnique({ where: { email } });

  // 2. If user not found, log the failed attempt and throw error
  //    NOTE: We say "Invalid email or password" (not "email not found")
  //    so attackers can't discover which emails are registered
  if (!user) {
    await writeAuditLog({
      action: AUDIT_EVENTS.LOGIN_FAILED,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.deviceName,
      metadata: { reason: "email not found", attemptedEmail: email },
    });
    const err = new Error("Invalid email or password");
    err.statusCode = 401;
    throw err;
  }

  // 3. Check account is active and not deleted
  if (!user.isActive || user.deletedAt) {
    const err = new Error("This account is inactive");
    err.statusCode = 403;
    throw err;
  }

  // 4. Compare the provided password against the stored hash
  //    bcrypt.compare() does this safely — it's slow by design to prevent brute force
  const passwordMatches = await comparePassword(password, user.passwordHash);

  if (!passwordMatches) {
    // Log the failed attempt with which user tried (for admin review)
    await writeAuditLog({
      userId: user.id,
      schoolId: user.schoolId,
      action: AUDIT_EVENTS.LOGIN_FAILED,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.deviceName,
      metadata: { reason: "wrong password" },
    });
    const err = new Error("Invalid email or password");
    err.statusCode = 401;
    throw err;
  }

  // 5. Generate the access token
  //    This is a short-lived JWT (15 min) stored in frontend memory
  //    It contains userId, role, schoolId for quick access on protected routes
  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role,
    schoolId: user.schoolId,
  });

  // 6. Generate a new refresh token (long-lived, random, single-use)
  //    rawRefreshToken → sent to client as httpOnly cookie
  //    tokenHash       → stored in database (never the raw value)
  //    tokenFamily     → groups all tokens from this login chain together
  //                      (used to revoke all at once if theft is detected)
  const rawRefreshToken = generateRefreshToken();
  const tokenHash = hashRefreshToken(rawRefreshToken);
  const tokenFamily = crypto.randomUUID(); // new family for each new login

  // 7. Store the hashed refresh token in the database
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      family: tokenFamily,
      deviceName: deviceInfo.deviceName || null,
      ipAddress: deviceInfo.ipAddress || null,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  // 8. Update the user's last login timestamp
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // 9. Write audit log for successful login
  await writeAuditLog({
    userId: user.id,
    schoolId: user.schoolId,
    action: AUDIT_EVENTS.LOGIN_SUCCESS,
    ipAddress: deviceInfo.ipAddress,
    userAgent: deviceInfo.deviceName,
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken, // raw token → goes to client as httpOnly cookie
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      schoolId: user.schoolId,
    },
  };
}

// ─────────────────────────────────────────────
// REFRESH — with ROTATION + REUSE DETECTION
//
// HOW ROTATION WORKS:
//   Client sends refresh token cookie → we look it up in DB →
//   revoke the old one → issue a brand new refresh token + new access token →
//   send both back to client
//
// HOW REUSE DETECTION WORKS:
//   If someone tries to use a refresh token that was ALREADY revoked (revokedAt is set),
//   it means either:
//     a) The token was stolen and the attacker is using the old one after we rotated it
//     b) The legitimate user is replaying an old token (shouldn't happen normally)
//   In either case → revoke the ENTIRE family (all active sessions from this chain)
//   This forces the user (and any attacker) to log in again from scratch.
// ─────────────────────────────────────────────
async function refresh(rawRefreshToken, deviceInfo = {}) {
  // 1. Make sure a token was actually sent
  if (!rawRefreshToken) {
    const err = new Error("No refresh token provided");
    err.statusCode = 401;
    throw err;
  }

  // 2. Hash the incoming token so we can look it up in the DB
  //    (remember: we only stored the hash, never the raw token)
  const tokenHash = hashRefreshToken(rawRefreshToken);

  // 3. Find the token in the database, along with its owner (user)
  const storedToken = await prisma.refreshToken.findFirst({
    where: { tokenHash },
    include: { user: true }, // join with User table so we have user.role, user.schoolId etc.
  });

  // 4. Token doesn't exist at all → invalid/tampered token
  if (!storedToken) {
    const err = new Error("Invalid refresh token");
    err.statusCode = 401;
    throw err;
  }

  // 5. 🚨 REUSE DETECTION
  //    If revokedAt is set, this token was already used once and rotated.
  //    Someone is trying to reuse it — this is a sign of token theft.
  if (storedToken.revokedAt) {
    // NUCLEAR OPTION: revoke ALL tokens in this family
    // This logs out every device that was using this login chain
    await prisma.refreshToken.updateMany({
      where: {
        family: storedToken.family, // same login chain
        revokedAt: null,            // only revoke ones still active
      },
      data: { revokedAt: new Date() },
    });

    // Write a high-priority security audit log
    await writeAuditLog({
      userId: storedToken.userId,
      schoolId: storedToken.user.schoolId,
      action: AUDIT_EVENTS.TOKEN_REUSE_DETECTED,
      ipAddress: deviceInfo.ipAddress,
      userAgent: deviceInfo.deviceName,
      metadata: {
        family: storedToken.family,
        message: "Entire token family revoked due to reuse detection",
      },
    });

    const err = new Error(
      "Token reuse detected. All sessions have been revoked for your security. Please log in again."
    );
    err.statusCode = 401;
    throw err;
  }

  // 6. Token is expired (past its expiry date)
  if (storedToken.expiresAt < new Date()) {
    const err = new Error("Refresh token has expired. Please log in again.");
    err.statusCode = 401;
    throw err;
  }

  // ─── TOKEN IS VALID — NOW ROTATE ───

// 7. Attempt to revoke ONLY if it has not already been revoked
const revokeResult = await prisma.refreshToken.updateMany({
  where: {
    id: storedToken.id,
    revokedAt: null,
  },
  data: {
    revokedAt: new Date(),
  },
});

// Another request already used this token first
if (revokeResult.count !== 1) {
  const err = new Error(
    "Refresh token has already been used. Please log in again."
  );
  err.statusCode = 401;
  throw err;
}

  // 8. Generate a brand new refresh token
  //    IMPORTANT: same family as the old one (so we can revoke all together if needed)
  const newRawRefreshToken = generateRefreshToken();
  const newTokenHash = hashRefreshToken(newRawRefreshToken);

  await prisma.refreshToken.create({
    data: {
      userId: storedToken.userId,
      tokenHash: newTokenHash,
      family: storedToken.family, // same family as the original login
      deviceName: storedToken.deviceName,
      ipAddress: deviceInfo.ipAddress || storedToken.ipAddress,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  // 9. Issue a new access token with fresh user data
  //    (in case role or schoolId changed since last login)
  const newAccessToken = signAccessToken({
    userId: storedToken.user.id,
    role: storedToken.user.role,
    schoolId: storedToken.user.schoolId,
  });

  // 10. Write audit log
  await writeAuditLog({
    userId: storedToken.userId,
    schoolId: storedToken.user.schoolId,
    action: AUDIT_EVENTS.TOKEN_REFRESHED,
    ipAddress: deviceInfo.ipAddress,
    userAgent: deviceInfo.deviceName,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRawRefreshToken, // new token → replaces the old cookie on the client
  };
}

// ─────────────────────────────────────────────
// LOGOUT (single device)
// Revokes only the current refresh token (the one in the cookie)
// Other devices stay logged in
// ─────────────────────────────────────────────
async function logout(rawRefreshToken, deviceInfo = {}) {
  if (!rawRefreshToken) return;

  const tokenHash = hashRefreshToken(rawRefreshToken);

  // Find the token first so we can get userId for the audit log
  const storedToken = await prisma.refreshToken.findFirst({
    where: { tokenHash },
  });

  if (!storedToken) return; // token already gone, nothing to do

  // Revoke (mark as used — don't delete, keep for audit history)
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() },
  });

  // Write audit log
  await writeAuditLog({
    userId: storedToken.userId,
    action: AUDIT_EVENTS.LOGOUT,
    ipAddress: deviceInfo.ipAddress,
    userAgent: deviceInfo.deviceName,
  });
}

// ─────────────────────────────────────────────
// LOGOUT ALL DEVICES
// Revokes ALL active refresh tokens for this user at once.
// Use case: "Sign out from all devices" button, or after a password change.
//
// HOW IT KNOWS WHICH USER:
// The userId comes from req.user (the verified access token in auth.middleware.js)
// So the user must be logged in (have a valid access token) to call this.
// ─────────────────────────────────────────────
async function logoutAll(userId, deviceInfo = {}) {
  // Revoke ALL active refresh tokens for this user
  // (active = revokedAt is null, meaning not yet revoked)
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null, // only target active tokens
    },
    data: { revokedAt: new Date() },
  });

  // Write audit log
  await writeAuditLog({
    userId,
    action: AUDIT_EVENTS.LOGOUT_ALL,
    ipAddress: deviceInfo.ipAddress,
    userAgent: deviceInfo.deviceName,
    metadata: { message: "All sessions revoked by user" },
  });
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
};
