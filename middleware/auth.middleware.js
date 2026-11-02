const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { errorResponse } = require("../utils/responseHandler");
const { getAuthToken } = require("../utils/authCookie");
const { isAllowedOrigin } = require("../utils/requestOrigin");
const asyncHandler = require("../utils/asyncHandler");

/**
 * Protect routes: verifies Bearer JWT token and attaches authenticated user
 */
const protect = asyncHandler(async (req, res, next) => {
  if (!isAllowedOrigin(req.headers.origin)) {
    return errorResponse(res, 403, "Request origin is not allowed.");
  }

  const token = getAuthToken(req);

  if (!token) {
    return errorResponse(
      res,
      401,
      "Authentication required. No authentication cookie provided.",
    );
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return errorResponse(res, 401, "Token expired. Please log in again.");
    }
    return errorResponse(res, 401, "Invalid token. Authorization denied.");
  }

  const user = await User.findById(decoded.id).select("-password");
  if (!user) {
    return errorResponse(
      res,
      401,
      "The user belonging to this token no longer exists.",
    );
  }

  req.user = user;
  return next();
});

const verifyOrigin = (req, res, next) => {
  if (!isAllowedOrigin(req.headers.origin)) {
    return errorResponse(res, 403, "Request origin is not allowed.");
  }
  return next();
};

module.exports = {
  protect,
  verifyOrigin,
};
