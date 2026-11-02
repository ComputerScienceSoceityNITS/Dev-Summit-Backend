const Event = require("../models/event.model");
const Participant = require("../models/participant.model");
const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/responseHandler");

/**
 * @desc    Register the authenticated user for an event
 * @route   POST /api/registrations/solo
 * @access  Private
 */
const register = asyncHandler(async (req, res) => {
  const { eventId } = req.body;

  if (!eventId) {
    return errorResponse(res, 400, "Event ID is required.");
  }

  const event = await Event.findById(eventId);
  if (!event) {
    return errorResponse(res, 404, "Selected event not found.");
  }

  if (event.registrationStatus !== "open") {
    return errorResponse(
      res,
      400,
      `Registration for '${event.title}' is currently ${event.registrationStatus}.`,
    );
  }

  const existingParticipant = await Participant.findOne({
    event: event._id,
    user: req.user._id,
  });

  if (existingParticipant?.status === "registered") {
    return errorResponse(
      res,
      409,
      "You are already registered for this event.",
    );
  }

  const participant = existingParticipant
    ? await Participant.findByIdAndUpdate(
        existingParticipant._id,
        { status: "registered" },
        { new: true, runValidators: true },
      )
    : await Participant.create({
        event: event._id,
        user: req.user._id,
        status: "registered",
      });

  return successResponse(res, 201, "Event registration confirmed.", {
    participant,
    event: {
      id: event._id,
      title: event.title,
      date: event.date,
      time: event.time,
      venue: event.venue,
    },
  });
});

module.exports = {
  register,
};
