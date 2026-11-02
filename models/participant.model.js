const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Target event is required"],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Registered user is required"],
    },
    status: {
      type: String,
      enum: ["registered", "unregistered"],
      default: "unregistered",
    },
  },
  {
    timestamps: true,
  },
);

// Compound index to avoid duplicate registration by the same user for the same event
participantSchema.index({ event: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("Participant", participantSchema);
