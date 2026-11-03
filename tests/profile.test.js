const test = require("node:test");
const assert = require("node:assert/strict");
const User = require("../models/user.model");
const Participant = require("../models/participant.model");
const { getMe } = require("../controllers/auth.controller");
const { getMyRegistrations } = require("../controllers/registration.controller");

function createResponse() {
  return {
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
}

test("profile registrations are scoped to the signed-in user", async () => {
  const originalFind = Participant.find;
  const eventRegistration = {
    _id: "registration-123",
    createdAt: "2026-10-01T10:00:00.000Z",
    event: {
      _id: "event-123",
      title: "Workshop",
      description: "Build something useful.",
      wing: "AI",
      date: "2026-11-04",
      time: "10:00",
      venue: "Lab 1",
      registrationStatus: "open",
    },
  };

  Participant.find = (query) => {
    assert.deepEqual(query, {
      user: "user-123",
      status: "registered",
    });

    return {
      populate(path, fields) {
        assert.equal(path, "event");
        assert.equal(
          fields,
          "title description wing date time venue registrationStatus",
        );
        return this;
      },
      sort(order) {
        assert.deepEqual(order, { createdAt: -1 });
        return Promise.resolve([eventRegistration]);
      },
    };
  };

  try {
    const req = { user: { _id: "user-123" } };
    const res = createResponse();
    await getMyRegistrations(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.payload.data.registrations, [
      {
        id: "registration-123",
        registeredAt: "2026-10-01T10:00:00.000Z",
        event: {
          id: "event-123",
          title: "Workshop",
          description: "Build something useful.",
          wing: "AI",
          date: "2026-11-04",
          time: "10:00",
          venue: "Lab 1",
          registrationStatus: "open",
        },
      },
    ]);
  } finally {
    Participant.find = originalFind;
  }
});

test("current-user profile includes account details", async () => {
  const originalFindById = User.findById;

  User.findById = async () => ({
    _id: "user-123",
    name: "Test Student",
    email: "student@cse.nits.ac.in",
    scholarId: "22CS001",
    role: "user",
  });

  try {
    const req = { user: { id: "user-123" } };
    const res = createResponse();
    await getMe(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.payload.data.user, {
      id: "user-123",
      name: "Test Student",
      email: "student@cse.nits.ac.in",
      scholarId: "22CS001",
      role: "user",
    });
  } finally {
    User.findById = originalFindById;
  }
});
