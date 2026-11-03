const express = require("express");
const router = express.Router();

const {
  getAdminStats,
  getRegistrations,
  exportRegistrationsCsv,
  updateRegistrationStatus,
} = require("../controllers/admin.controller");

const { protect } = require("../middleware/auth.middleware");
const { adminOnly } = require("../middleware/admin.middleware");

// All admin routes require authentication and admin role
router.use(protect, adminOnly);

router.get("/registrations", getRegistrations);
router.get("/registrations/export", exportRegistrationsCsv);
router.patch("/registrations/:id/status", updateRegistrationStatus);
router.get("/stats", getAdminStats);

module.exports = router;
