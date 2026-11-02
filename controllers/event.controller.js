const Event = require("../models/event.model");
const Participant = require("../models/participant.model");
const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/responseHandler");

const eventFields = [
  "title",
  "description",
  "wing",
  "date",
  "time",
  "venue",
  "registrationStatus",
];

const pickEventFields = (source) =>
  Object.fromEntries(
    eventFields
      .filter((field) => source[field] !== undefined)
      .map((field) => [field, source[field]]),
  );

/**
 * @desc    Get all public events
 * @route   GET /api/events
 * @access  Public
 */
const getEvents = asyncHandler(async (req, res) => {
  const filter = {};
  if (typeof req.query.wing === "string" && req.query.wing.trim()) {
    filter.wing = req.query.wing.trim();
  }
  if (
    typeof req.query.status === "string" &&
    ["upcoming", "open", "closed"].includes(req.query.status)
  ) {
    filter.registrationStatus = req.query.status;
  }

  const events = await Event.find(filter).sort({ date: 1, createdAt: 1 });

  return successResponse(res, 200, "Events retrieved successfully", {
    count: events.length,
    events,
  });
});

/**
 * @desc    Get one public event
 * @route   GET /api/events/:id
 * @access  Public
 */
const getEventById = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    return errorResponse(res, 404, "Event not found");
  }

  return successResponse(res, 200, "Event retrieved successfully", { event });
});

/**
 * @desc    Create a new event
 * @route   POST /api/events
 * @access  Private / Admin
 */
const createEvent = asyncHandler(async (req, res) => {
  const event = await Event.create(pickEventFields(req.body));
  return successResponse(res, 201, "Event created successfully", { event });
});

/**
 * @desc    Update an event
 * @route   PUT /api/events/:id
 * @access  Private / Admin
 */
const updateEvent = asyncHandler(async (req, res) => {
  const event = await Event.findByIdAndUpdate(
    req.params.id,
    pickEventFields(req.body),
    { new: true, runValidators: true },
  );

  if (!event) {
    return errorResponse(res, 404, "Event not found");
  }

  return successResponse(res, 200, "Event updated successfully", { event });
});

/**
 * @desc    Delete an event
 * @route   DELETE /api/events/:id
 * @access  Private / Admin
 */
const deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) {
    return errorResponse(res, 404, "Event not found");
  }

  await Participant.deleteMany({ event: event._id });
  await event.deleteOne();

  return successResponse(res, 200, "Event deleted successfully");
});

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
};
