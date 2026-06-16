/**
 * Standardized API response helpers.
 * Keeps every response in the same shape so the frontend can rely on it:
 *
 * Success: { success: true, message, data }
 * Error:   { success: false, message, errors }
 */

function success(res, statusCode, message, data = null) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

function error(res, statusCode, message, errors = null) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
  });
}

module.exports = {
  success,
  error,
};
