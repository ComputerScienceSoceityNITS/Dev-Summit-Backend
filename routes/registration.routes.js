const express = require("express");
const router = express.Router();

const { register } = require("../controllers/registration.controller");
const { protect } = require("../middleware/auth.middleware");

router.post("/register", protect, register);

module.exports = router;
