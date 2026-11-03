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
router.post("/signup", verifyOrigin,  signup);
router.post("/login", verifyOrigin,  login);
router.post("/google", verifyOrigin, googleSignIn);
router.get("/me", protect, getMe);
router.patch("/me", protect, updateMe);
router.post("/logout", verifyOrigin, logout);

module.exports = router;
