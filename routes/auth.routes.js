const express = require("express");
const router = express.Router();

const {
  signup,
  login,
  getMe,
  logout,
} = require("../controllers/auth.controller");
const { protect, verifyOrigin } = require("../middleware/auth.middleware");

router.post("/signup", verifyOrigin, signup);
router.post("/login", verifyOrigin, login);
router.get("/me", protect, getMe);
router.post("/logout", verifyOrigin, logout);

module.exports = router;
