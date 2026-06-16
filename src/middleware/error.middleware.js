/**
 * GLOBAL ERROR MIDDLEWARE
 *
 * Must be registered LAST in app.js (after all routes).
 * Catches any error passed via next(err) or thrown inside an async
 * route handler (if you use a wrapper like express-async-errors,
 * or wrap your controllers in try/catch and call next(err)).
 *
 * Keeps error responses consistent and avoids leaking stack traces
 * to the client in production.
 */
function errorMiddleware(err, req, res, next) {
  console.error(err); // log full error for debugging (server-side only)

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(statusCode).json({
    success: false,
    message,
    // Only include stack trace in development
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
}

module.exports = errorMiddleware;
