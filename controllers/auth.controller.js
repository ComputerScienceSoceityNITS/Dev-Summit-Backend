const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/responseHandler");
const { setAuthCookie, clearAuthCookie } = require("../utils/authCookie");

// Helper to generate JWT token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
};

/**
 * @desc    Create a user account and set an authentication cookie
 * @route   POST /api/auth/signup
 * @access  Public
 */
const signup = asyncHandler(async (req, res) => {
  const { name, email, password, scholarId } = req.body;

  console.log(name);

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof scholarId !== "string" ||
    !name.trim() ||
    !email.trim() ||
    !password ||
    !scholarId.trim()
  ) {
    return errorResponse(
      res,
      400,
      "Name, email, password, and scholar ID are required.",
    );
  }

  const existingUser = await User.findOne({
    email: email.trim().toLowerCase(),
  });
  if (existingUser) {
    return errorResponse(
      res,
      409,
      "An account with this email already exists.",
    );
  }

  const user = await User.create({
    name,
    email,
    password,
    scholarId,
    role: "user",
  });
  const token = generateToken(user._id, user.role);
  setAuthCookie(res, token);

  return successResponse(res, 201, "Signup successful", {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

/**
 * @desc    Authenticate admin / user and set an authentication cookie
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password
  ) {
    return errorResponse(res, 400, "Email and password are required.");
  }

  const user = await User.findOne({
    email: email.trim().toLowerCase(),
  }).select("+password");

  if (!user || !(await user.matchPassword(password))) {
    return errorResponse(res, 401, "Invalid email or password");
  }

  const token = generateToken(user._id, user.role);
  setAuthCookie(res, token);

  return successResponse(res, 200, "Login successful", {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

/**
 * @desc    Bootstrap / Register an admin account using security key
 * @route   POST /api/auth/register-admin
 * @access  Public (Protected by ADMIN_REGISTRATION_KEY)
 */

/**
 * @desc    Get currently authenticated user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return errorResponse(res, 404, "User not found");
  }

  return successResponse(res, 200, "Current user retrieved", {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

/**
 * @desc    End the authenticated client session
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = (req, res) => {
  clearAuthCookie(res);
  return successResponse(res, 200, "Logout successful.");
};

module.exports = {
  signup,
  login,
  getMe,
  logout,
};
