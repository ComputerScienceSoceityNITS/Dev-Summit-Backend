const { errorResponse } = require("../utils/responseHandler");

/**
 * Restrict route to admin role only
 */
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return errorResponse(res, 403, "Access forbidden. Admin privileges required.");
  }
  next();
};

module.exports = { adminOnly };
