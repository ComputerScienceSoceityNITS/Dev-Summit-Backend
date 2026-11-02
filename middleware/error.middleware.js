const { errorResponse } = require("../utils/responseHandler");

/**
 * 404 Handler for undefined routes
 */
const notFoundHandler = (req, res, next) => {
  errorResponse(res, 404, `Resource not found - ${req.originalUrl}`);
};

/**
 * Centralized Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  // Log error for developers
  if (process.env.NODE_ENV !== "test") {
    console.error(`[Dev Summit Error] ${err.name || "Error"}: ${err.message}`);
    if (process.env.NODE_ENV === "development" && err.stack) {
      console.error(err.stack);
    }
  }

  // Mongoose Bad ObjectId (CastError)
  if (err.name === "CastError") {
    const message = `Invalid resource identifier format: ${err.value}`;
    return errorResponse(res, 400, message);
  }

  // Mongoose Duplicate Key Error (code: 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    const value = err.keyValue ? err.keyValue[field] : "";
    const message = `Duplicate value '${value}' entered for ${field}. This record already exists.`;
    return errorResponse(res, 409, message);
  }

  // Mongoose Validation Error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((val) => ({
      field: val.path,
      message: val.message,
    }));
    return errorResponse(res, 400, "Validation failed", errors);
  }

  // JWT Errors
  if (err.name === "JsonWebTokenError") {
    return errorResponse(res, 401, "Invalid token authorization");
  }
  if (err.name === "TokenExpiredError") {
    return errorResponse(res, 401, "Token has expired");
  }

  // Default server error
  const statusCode =
    err.statusCode || err.status || (res.statusCode === 200 ? 500 : res.statusCode);
  const message = err.message || "Internal Server Error";

  return errorResponse(
    res,
    statusCode,
    message,
    process.env.NODE_ENV === "development" ? { stack: err.stack } : undefined
  );
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
