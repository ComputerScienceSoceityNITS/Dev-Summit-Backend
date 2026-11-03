const express = require("express");
const router = express.Router();

const {
  getMyRegistrations,
  register,
} = require("../controllers/registration.controller");
const { protect } = require("../middleware/auth.middleware");
const {
  endpointRateLimit,
} = require("../middleware/rateLimiting.middleware");

router.get("/mine", protect, getMyRegistrations);
router.post("/register", protect, endpointRateLimit(10, 10 * 60 * 1000), register);

module.exports = router;
