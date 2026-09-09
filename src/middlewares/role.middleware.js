// src/middlewares/role.middleware.js
//
// Used after requireAuth, to restrict a route to specific roles:
//   router.post('/admin/leads', requireAuth, requireRole('ADMIN', 'OPS'), controller.listLeads)
// This is what enforces "organizers no longer see a Create Listing screen"
// (PRD Addendum Section 6) at the actual API layer, not just hidden in the UI.

const AppError = require("../utils/AppError");

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      // Should never happen if requireAuth ran first, but fail safe rather
      // than assume ordering was respected everywhere.
      return next(new AppError("You must be logged in to access this", 401));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to perform this action", 403));
    }
    next();
  };
}

module.exports = requireRole;
