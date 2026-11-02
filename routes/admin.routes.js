const express = require("express");
const router = express.Router();

const {
  getRegistrations,
  exportRegistrationsCsv,
} = require("../controllers/admin.controller");

const { protect } = require("../middleware/auth.middleware");
const { adminOnly } = require("../middleware/admin.middleware");

// All admin routes require authentication and admin role
router.use(protect, adminOnly);

router.get("/registrations", getRegistrations);
router.get("/registrations/export", exportRegistrationsCsv);

module.exports = router;
