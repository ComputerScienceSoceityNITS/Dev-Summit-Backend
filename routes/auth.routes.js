const express = require("express");
const router = express.Router();

const {
  signup,
  login,
  googleSignIn,
  getMe,
  updateMe,
  logout,
} = require("../controllers/auth.controller");
const { protect, verifyOrigin } = require("../middleware/auth.middleware");
const {
  endpointRateLimit,
} = require("../middleware/rateLimiting.middleware");

// Auth endpoints protected by rate limiting
router.post("/signup", verifyOrigin, endpointRateLimit(5, 10 * 60 * 1000), signup);
router.post("/login", verifyOrigin, endpointRateLimit(5, 10 * 60 * 1000), login);
router.post("/google", verifyOrigin, endpointRateLimit(10, 10 * 60 * 1000), googleSignIn);
router.get("/me", protect, getMe);
router.patch("/me", protect, endpointRateLimit(10, 10 * 60 * 1000), updateMe);
router.post("/logout", verifyOrigin, logout);

module.exports = router;
