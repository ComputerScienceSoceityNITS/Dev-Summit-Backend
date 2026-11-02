const express = require("express");
const router = express.Router();

const {
  getEvents,
  createEvent,
  deleteEvent,
} = require("../controllers/event.controller");

const { protect } = require("../middleware/auth.middleware");
const { adminOnly } = require("../middleware/admin.middleware");

// Public routes
router.get("/", getEvents);

// Protected Admin routes
router.post("/", protect, adminOnly, createEvent);
router.delete("/:id", protect, adminOnly, deleteEvent);

module.exports = router;
