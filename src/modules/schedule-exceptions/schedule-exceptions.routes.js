// =============================================================================
// SCHEDULE EXCEPTIONS ROUTES
// (src/modules/schedule-exceptions/schedule-exceptions.routes.js)
// =============================================================================
//
//   POST   /api/schedule-exceptions             Admin/HOD — declare holiday/half-day
//   GET    /api/schedule-exceptions             Admin/HOD — list (role-scoped)
//   GET    /api/schedule-exceptions/:id         Admin/HOD — get one
//   PATCH  /api/schedule-exceptions/:id/revoke  Admin/HOD — revoke (soft)
//
// Both admin and HOD use these routes. The service decides scope from the role:
// admin acts school-wide, HOD acts on their own department only.
//
// A HOD needs req.faculty.departmentId, which facultyContext provides — but
// admins have no Faculty record, so running facultyContext for an admin would
// wrongly 404. The small `hodDeptContext` wrapper below runs facultyContext
// ONLY when the caller is a HOD.
//
// =============================================================================

const express    = require("express");
const router     = express.Router();
const controller = require("./schedule-exceptions.controller");

const verifyToken  = require("../../middleware/auth.middleware");
const requireRole  = require("../../middleware/role.middleware");
const attachTenant = require("../../middleware/tenant.middleware");
const { facultyContext } = require("../../middleware/facultyContext.middleware");

/**
 * hodDeptContext — conditional middleware.
 * If the logged-in user is a HOD, run facultyContext (loads req.faculty).
 * Otherwise (admin) skip straight to the next handler.
 *
 * @param {Object} req  @param {Object} res  @param {Function} next
 */
function hodDeptContext(req, res, next) {
  if (req.user.role === "hod") {
    return facultyContext(req, res, next);
  }
  return next();
}

// Every route requires a valid login + school context, and admin/HOD role.
router.use(verifyToken, attachTenant, requireRole("admin", "hod"));

router.post("/",            hodDeptContext, controller.declareException);
router.get("/",             hodDeptContext, controller.listExceptions);
router.get("/:id",          controller.getExceptionById);
router.patch("/:id/revoke", hodDeptContext, controller.revokeException);

module.exports = router;
