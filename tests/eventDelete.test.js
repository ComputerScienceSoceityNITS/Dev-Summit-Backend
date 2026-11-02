const test = require("node:test");
const assert = require("node:assert/strict");
const Event = require("../models/event.model");
const Participant = require("../models/participant.model");
const { deleteEvent } = require("../controllers/event.controller");

test("deleting an event also deletes its registrations", async () => {
  const originalFindById = Event.findById;
  const originalDeleteMany = Participant.deleteMany;
  let removedRegistrationsFor;
  let deletedEvent = false;

  Event.findById = async (id) => ({
    _id: id,
    deleteOne: async () => {
      deletedEvent = true;
    },
  });
  Participant.deleteMany = async (filter) => {
    removedRegistrationsFor = filter.event;
  };

  const req = { params: { id: "event-123" } };
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };

  try {
    await deleteEvent(req, res, (error) => {
      throw error;
    });

    assert.equal(removedRegistrationsFor, "event-123");
    assert.equal(deletedEvent, true);
    assert.equal(res.statusCode, 200);
  } finally {
    Event.findById = originalFindById;
    Participant.deleteMany = originalDeleteMany;
  }
});
