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
  const events = await Event.find().sort({ date: 1, createdAt: 1 });

  return successResponse(res, 200, "Events retrieved successfully", {
    count: events.length,
    events,
  });
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
  createEvent,
  deleteEvent,
};
