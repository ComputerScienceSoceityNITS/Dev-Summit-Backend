/**
 * Standardized API response format helper
 * Ensures all responses adhere to: { success, message, data, ... }
 */

const sendResponse = (res, statusCode, { success = true, message = "", data = null, meta = undefined, errors = undefined }) => {
  const payload = {
    success,
    message,
    data,
  };

  if (meta !== undefined) {
    payload.meta = meta;
  }

  if (errors !== undefined) {
    payload.errors = errors;
  }

  return res.status(statusCode).json(payload);
};

const successResponse = (res, statusCode = 200, message = "Success", data = null, meta = undefined) => {
  return sendResponse(res, statusCode, {
    success: true,
    message,
    data,
    meta,
  });
};

const errorResponse = (res, statusCode = 500, message = "An error occurred", errors = undefined) => {
  return sendResponse(res, statusCode, {
    success: false,
    message,
    data: null,
    errors,
  });
};

module.exports = {
  sendResponse,
  successResponse,
  errorResponse,
};
