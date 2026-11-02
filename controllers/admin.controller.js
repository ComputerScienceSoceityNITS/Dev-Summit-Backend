const Participant = require("../models/participant.model");
const Event = require("../models/event.model");
const User = require("../models/user.model");
const asyncHandler = require("../utils/asyncHandler");
const { successResponse, errorResponse } = require("../utils/responseHandler");

const participantPopulate = [
  { path: "event", select: "title date time venue registrationStatus" },
  { path: "user", select: "name email scholarId role" },
];

/**
 * @desc    Get paginated participants, with optional event, status, and user search filters
 * @route   GET /api/admin/registrations
 * @access  Private / Admin
 */
const getRegistrations = asyncHandler(async (req, res) => {
  const {
    eventId,
    status,
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  const query = {};
  if (eventId) query.event = eventId;
  if (status) query.status = status;

  // Handle Search Filtering
  if (search?.trim()) {
    const searchRegex = new RegExp(
      search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    const matchingUsers = await User.find({
      $or: [
        { name: searchRegex },
        { email: searchRegex },
        { scholarId: searchRegex },
      ],
    }).select("_id");
    query.user = { $in: matchingUsers.map((user) => user._id) };
  }

  // Handle Secure Sorting
  const sortableFields = ["createdAt", "updatedAt", "status"];
  const safeSortBy = sortableFields.includes(sortBy) ? sortBy : "createdAt";
  const sort = { [safeSortBy]: sortOrder === "asc" ? 1 : -1 };

  // Fetch all matching records without skip/limit
  const registrations = await Participant.find(query)
    .populate(participantPopulate)
    .sort(sort);

  return successResponse(res, 200, "Participants retrieved successfully", {
    registrations,
    total: registrations.length,
  });
});

/**
 * @desc    Export participants as CSV
 * @route   GET /api/admin/registrations/export
 * @access  Private / Admin
 */
const exportRegistrationsCsv = asyncHandler(async (req, res) => {
  const { eventId } = req.query;

  if (!eventId) {
    return res
      .status(400)
      .json({ message: "Event ID is required for export." });
  }

  const event = await Event.findById(eventId);
  if (!event) {
    return res.status(404).json({ message: "Selected event not found." });
  }

  const participants = await Participant.find({ event: eventId })
    .populate(participantPopulate)
    .sort({ createdAt: -1 });

  const escapeCsv = (value) => {
    const text = String(value ?? "");
    const safeText = /^[\t\r\n ]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safeText.replace(/"/g, '""')}"`;
  };

  const rows = [
    ["Status", "Name", "Email", "Scholar ID", "Registered At"],
    ...participants.map((participant) => [
      participant.status,
      participant.user?.name,
      participant.user?.email,
      participant.user?.scholarId,
      participant.createdAt?.toISOString(),
    ]),
  ];

  const csvContent = rows
    .map((row) => row.map(escapeCsv).join(","))
    .join("\r\n");

  const safeEventTitle = event.title.replace(/[^a-z0-9]/gi, "-").toLowerCase();

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${safeEventTitle}-participants-${Date.now()}.csv"`,
  );
  return res.status(200).send(csvContent);
});

module.exports = {
  getRegistrations,
  exportRegistrationsCsv,
};
