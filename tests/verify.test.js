const test = require("node:test");
const assert = require("node:assert");

// Set test environment
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_jwt_secret_12345";

const {
  successResponse,
  errorResponse,
  sendResponse,
} = require("../utils/responseHandler");
const {
  notFoundHandler,
  errorHandler,
} = require("../middleware/error.middleware");
const { signup, login, logout } = require("../controllers/auth.controller");
const User = require("../models/user.model");
const Event = require("../models/event.model");
const {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
} = require("../controllers/event.controller");
const {
  AUTH_COOKIE_NAME,
  getAuthCookieOptions,
} = require("../utils/authCookie");
const { protect } = require("../middleware/auth.middleware");
const Participant = require("../models/participant.model");
const { register } = require("../controllers/registration.controller");
const {
  exportRegistrationsCsv,
  updateRegistrationStatus,
} = require("../controllers/admin.controller");
const { adminOnly } = require("../middleware/admin.middleware");

// Helper to create mock request and response
const createMockReqRes = (options = {}) => {
  const req = {
    headers: options.headers || {},
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    originalUrl: options.originalUrl || "/api/test",
    user: options.user || null,
  };

  const res = {
    statusCode: 200,
    headers: {},
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
      return this;
    },
    json(data) {
      this.payload = data;
      return this;
    },
    cookie(name, value, options) {
      this.setCookie = { name, value, options };
      return this;
    },
    clearCookie(name, options) {
      this.clearedCookie = { name, options };
      return this;
    },
    send(data) {
      this.payload = data;
      return this;
    },
  };

  return { req, res };
};

test("Dev Summit Backend Verification Suite", async (t) => {
  // Test 2: Standard JSON Response Format
  await t.test(
    "Response Handler formats correct JSON envelope { success, message, data, errors }",
    () => {
      const { res } = createMockReqRes();

      successResponse(res, 200, "Operation successful", { id: "test-123" });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.payload.success, true);
      assert.strictEqual(res.payload.message, "Operation successful");
      assert.deepStrictEqual(res.payload.data, { id: "test-123" });

      const { res: errRes } = createMockReqRes();
      errorResponse(errRes, 400, "Validation failed", [
        { field: "email", message: "Invalid email" },
      ]);
      assert.strictEqual(errRes.statusCode, 400);
      assert.strictEqual(errRes.payload.success, false);
      assert.strictEqual(errRes.payload.data, null);
      assert.strictEqual(errRes.payload.errors.length, 1);
      assert.strictEqual(errRes.payload.errors[0].field, "email");
    },
  );

  await t.test("Participant model links a user and event with unique registration", () => {
    const indexes = Participant.schema.indexes();
    assert.deepStrictEqual(indexes, [
      [{ event: 1, user: 1 }, { unique: true, background: true }],
    ]);
    assert.deepStrictEqual(
      Participant.schema.path("status").enumValues,
      ["registered", "unregistered"],
    );
    assert.strictEqual(Participant.schema.path("user").options.ref, "User");
    assert.strictEqual(Participant.schema.path("event").options.ref, "Event");
  });

  await t.test("Signup role matches the user model enum", () => {
    assert.deepStrictEqual(User.schema.path("role").enumValues, ["admin", "user"]);
  });

  await t.test("User model accepts valid email addresses from other domains", async () => {
    const user = new User({
      name: "Test Student",
      email: "student@example.com",
      password: "password123",
      scholarId: "22CS001",
    });

    await assert.doesNotReject(user.validate());
  });

  await t.test("Registration creates a participant record for the authenticated user", async () => {
    const originalEventFindById = Event.findById;
    const originalFindOne = Participant.findOne;
    const originalCreate = Participant.create;
    let participantData;

    try {
      Event.findById = async () => ({
        _id: "event-123",
        title: "Workshop",
        registrationStatus: "open",
      });
      Participant.findOne = async () => null;
      Participant.create = async (data) => {
        participantData = data;
        return { _id: "participant-123", ...data };
      };

      const { req, res } = createMockReqRes({
        body: { eventId: "event-123" },
        user: { _id: "user-123" },
      });
      await register(req, res, (error) => {
        throw error;
      });

      assert.strictEqual(res.statusCode, 201);
      assert.deepStrictEqual(participantData, {
        event: "event-123",
        user: "user-123",
        status: "registered",
      });
      assert.strictEqual(res.payload.data.ticketId, undefined);
    } finally {
      Event.findById = originalEventFindById;
      Participant.findOne = originalFindOne;
      Participant.create = originalCreate;
    }
  });

  await t.test("Registration rejects an already registered user-event pair", async () => {
    const originalEventFindById = Event.findById;
    const originalFindOne = Participant.findOne;
    const originalCreate = Participant.create;
    let createCalled = false;

    try {
      Event.findById = async () => ({
        _id: "event-123",
        title: "Workshop",
        registrationStatus: "open",
      });

      Participant.findOne = async () => ({ status: "registered" });
      Participant.create = async () => {
        createCalled = true;
      };

      const { req, res } = createMockReqRes({
        body: { eventId: "event-123" },
        user: { _id: "user-123" },
      });
      await register(req, res, (error) => {
        throw error;
      });

      assert.strictEqual(res.statusCode, 409);
      assert.strictEqual(createCalled, false);
    } finally {
      Event.findById = originalEventFindById;
      Participant.findOne = originalFindOne;
      Participant.create = originalCreate;
    }
  });

  await t.test(
    "Logout clears the authentication cookie",
    () => {
      const { req, res } = createMockReqRes();

      logout(req, res);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.payload.success, true);
      assert.strictEqual(res.payload.message, "Logout successful.");
      assert.strictEqual(res.payload.data, null);
      assert.deepStrictEqual(res.clearedCookie, {
        name: AUTH_COOKIE_NAME,
        options: getAuthCookieOptions(),
      });
    },
  );

  await t.test("Signup creates a regular user account and sets an HttpOnly JWT cookie", async () => {
    const originalFindOne = User.findOne;
    const originalCreate = User.create;
    let createdUser;

    try {
      User.findOne = async () => null;
      User.create = async (data) => {
        createdUser = {
          _id: "student-123",
          name: data.name,
          email: data.email.toLowerCase(),
          role: data.role,
        };
        return createdUser;
      };

      const { req, res } = createMockReqRes({
        body: {
          name: "Test Student",
          email: "student@cse.nits.ac.in",
          password: "password123",
          scholarId: "22CS001",
          role: "admin",
        },
      });

      await signup(req, res, (error) => {
        throw error;
      });

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.payload.success, true);
      assert.strictEqual(createdUser.role, "user");
      assert.strictEqual(res.payload.data.user.role, "user");
      assert.strictEqual(res.payload.data.token, undefined);
      assert.strictEqual(res.setCookie.name, AUTH_COOKIE_NAME);
      assert.strictEqual(res.setCookie.options.httpOnly, true);
      assert.strictEqual(res.setCookie.options.sameSite, "lax");
      assert.strictEqual(
        require("jsonwebtoken").verify(
          res.setCookie.value,
          process.env.JWT_SECRET,
        ).id,
        "student-123",
      );
    } finally {
      User.findOne = originalFindOne;
      User.create = originalCreate;
    }
  });

  await t.test("Protected routes authenticate using the cookie, not a bearer header", async () => {
    const originalFindById = User.findById;
    const token = require("jsonwebtoken").sign(
      { id: "student-123", role: "user" },
      process.env.JWT_SECRET,
    );

    try {
      User.findById = () => ({
        select: async () => ({ _id: "student-123", role: "user" }),
      });

      const cookieRequest = createMockReqRes({
        headers: { cookie: `${AUTH_COOKIE_NAME}=${token}` },
      });
      let nextCalled = false;
      await protect(cookieRequest.req, cookieRequest.res, () => {
        nextCalled = true;
      });
      assert.strictEqual(nextCalled, true);

      const bearerRequest = createMockReqRes({
        headers: { authorization: `Bearer ${token}` },
      });
      await protect(bearerRequest.req, bearerRequest.res, () => {});
      assert.strictEqual(bearerRequest.res.statusCode, 401);
    } finally {
      User.findById = originalFindById;
    }
  });

  await t.test("Protected routes reject untrusted origins", async () => {
    const { req, res } = createMockReqRes({
      headers: { origin: "https://untrusted.example" },
    });

    await protect(req, res, () => {
      assert.fail("Untrusted origin must not reach the protected handler");
    });
    assert.strictEqual(res.statusCode, 403);
  });

  await t.test("Login sets the HttpOnly authentication cookie without returning the JWT", async () => {
    const originalFindOne = User.findOne;
    const user = {
      _id: "student-123",
      name: "Test Student",
      email: "student@cse.nits.ac.in",
      role: "user",
      matchPassword: async () => true,
      save: async () => {},
    };

    try {
      User.findOne = () => ({
        select: async () => user,
      });

      const { req, res } = createMockReqRes({
        body: { email: user.email, password: "password123" },
      });
      await login(req, res, (error) => {
        throw error;
      });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.setCookie.name, AUTH_COOKIE_NAME);
      assert.strictEqual(res.setCookie.options.httpOnly, true);
      assert.strictEqual(res.payload.data.token, undefined);
      assert.strictEqual(
        require("jsonwebtoken").verify(
          res.setCookie.value,
          process.env.JWT_SECRET,
        ).id,
        "student-123",
      );
    } finally {
      User.findOne = originalFindOne;
    }
  });

  await t.test("Signup rejects duplicate emails and missing required fields", async () => {
    const originalFindOne = User.findOne;
    const originalCreate = User.create;
    let createCalled = false;

    try {
      User.findOne = async () => ({ _id: "existing-user" });
      User.create = async () => {
        createCalled = true;
      };

      const duplicate = createMockReqRes({
        body: {
          name: "Test Student",
          email: "student@cse.nits.ac.in",
          password: "password123",
          scholarId: "22CS001",
        },
      });
      await signup(duplicate.req, duplicate.res, (error) => {
        throw error;
      });
      assert.strictEqual(duplicate.res.statusCode, 409);

      const invalid = createMockReqRes({
        body: { name: "Test Student", email: "student@cse.nits.ac.in" },
      });
      await signup(invalid.req, invalid.res, (error) => {
        throw error;
      });
      assert.strictEqual(invalid.res.statusCode, 400);
      assert.strictEqual(createCalled, false);
    } finally {
      User.findOne = originalFindOne;
      User.create = originalCreate;
    }
  });

  await t.test("Event endpoints use only fields defined by the event model", async () => {
    const originalFind = Event.find;
    const originalFindById = Event.findById;
    const originalCreate = Event.create;
    const originalFindByIdAndUpdate = Event.findByIdAndUpdate;
    let createData;
    let queryFilter;

    try {
      Event.find = (filter) => {
        queryFilter = filter;
        return {
          sort: async () => [{ title: "Workshop", wing: "DEV" }],
        };
      };
      Event.findById = async (id) => ({ _id: id, title: "Workshop" });
      Event.create = async (data) => {
        createData = data;
        return data;
      };

      const list = createMockReqRes({
        query: { category: "workshop", wing: "DEV", status: "open" },
      });
      await getEvents(list.req, list.res, (error) => {
        throw error;
      });
      assert.deepStrictEqual(queryFilter, {
        wing: "DEV",
        registrationStatus: "open",
      });

      const details = createMockReqRes({ params: { id: "event-123" } });
      await getEventById(details.req, details.res, (error) => {
        throw error;
      });
      assert.strictEqual(details.res.statusCode, 200);
      assert.strictEqual(details.res.payload.data.event._id, "event-123");

      const create = createMockReqRes({
        body: {
          title: "Workshop",
          description: "Learn development",
          wing: "DEV",
          date: "2026-11-04",
          time: "10:00",
          venue: "NIT Silchar",
          slug: "ignored-slug",
          category: "ignored-category",
          capacity: 100,
        },
      });

      await createEvent(create.req, create.res, (error) => {
        throw error;
      });
      assert.deepStrictEqual(createData, {
        title: "Workshop",
        description: "Learn development",
        wing: "DEV",
        date: "2026-11-04",
        time: "10:00",
        venue: "NIT Silchar",
      });

      let updatedEvent;
      Event.findByIdAndUpdate = async (id, fields, options) => {
        updatedEvent = { id, fields, options };
        return { _id: id, ...fields };
      };
      const update = createMockReqRes({
        params: { id: "event-123" },
        body: { date: "2026-11-05", maxTeamSize: 8 },
      });
      await updateEvent(update.req, update.res, (error) => {
        throw error;
      });
      assert.deepStrictEqual(updatedEvent, {
        id: "event-123",
        fields: { date: "2026-11-05" },
        options: { new: true, runValidators: true },
      });
    } finally {
      Event.find = originalFind;
      Event.findById = originalFindById;
      Event.create = originalCreate;
      Event.findByIdAndUpdate = originalFindByIdAndUpdate;
    }
  });

  await t.test("CSV export neutralizes spreadsheet formulas", async () => {
    const originalFind = Participant.find;

    try {
      Participant.find = () => ({
        populate: () => ({
          sort: async () => [
            {
              event: { title: "=HYPERLINK(\"https://example.com\")" },
              status: "registered",
              user: {
                name: "Test User",
                email: "test@cse.nits.ac.in",
                scholarId: "22CS001",
              },
              createdAt: new Date("2026-01-01T00:00:00.000Z"),
            },
          ],
        }),
      });

      const { req, res } = createMockReqRes();
      await exportRegistrationsCsv(req, res, (error) => {
        throw error;
      });

      assert.match(res.payload, /"'=HYPERLINK/);
    } finally {
      Participant.find = originalFind;
    }
  });

  await t.test("Admin participant status updates accept only participant model values", async () => {
    const originalFindByIdAndUpdate = Participant.findByIdAndUpdate;
    let updateData;

    try {
      Participant.findByIdAndUpdate = (id, fields, options) => {
        updateData = { id, fields, options };
        return {
          populate: async () => ({ _id: id, ...fields }),
        };
      };

      const { req, res } = createMockReqRes({
        params: { id: "participant-123" },
        body: { status: "unregistered" },
      });
      await updateRegistrationStatus(req, res, (error) => {
        throw error;
      });

      assert.strictEqual(res.statusCode, 200);
      assert.deepStrictEqual(updateData, {
        id: "participant-123",
        fields: { status: "unregistered" },
        options: { new: true, runValidators: true },
      });

      const invalid = createMockReqRes({
        params: { id: "participant-123" },
        body: { status: "attended" },
      });
      await updateRegistrationStatus(invalid.req, invalid.res, (error) => {
        throw error;
      });
      assert.strictEqual(invalid.res.statusCode, 400);
    } finally {
      Participant.findByIdAndUpdate = originalFindByIdAndUpdate;
    }
  });

  // Admin Authorization Middleware
  await t.test("adminOnly blocks non-admins and allows role='admin'", () => {
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };

    // User is missing
    const { req: req1, res: res1 } = createMockReqRes();
    adminOnly(req1, res1, next);
    assert.strictEqual(res1.statusCode, 403);
    assert.strictEqual(res1.payload.success, false);
    assert.strictEqual(nextCalled, false);

    // User is role="user"
    const { req: req2, res: res2 } = createMockReqRes({
      user: { role: "user" },
    });
    adminOnly(req2, res2, next);
    assert.strictEqual(res2.statusCode, 403);
    assert.strictEqual(nextCalled, false);

    // User is role="admin"
    const { req: req3, res: res3 } = createMockReqRes({
      user: { role: "admin" },
    });
    adminOnly(req3, res3, next);
    assert.strictEqual(nextCalled, true);
  });

  // Central 404 Route Not Found Middleware
  await t.test("notFoundHandler returns standard 404 response", () => {
    const { req, res } = createMockReqRes({ originalUrl: "/api/nonexistent" });

    notFoundHandler(req, res, () => {});
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.payload.success, false);
    assert.ok(res.payload.message.includes("/api/nonexistent"));
  });

  // Central Error Handler
  await t.test(
    "errorHandler correctly captures Mongoose duplicate key (code 11000)",
    () => {
      const { req, res } = createMockReqRes();
      const duplicateError = new Error("Duplicate key error");
      duplicateError.code = 11000;
      duplicateError.keyValue = { email: "test@nits.ac.in" };

      errorHandler(duplicateError, req, res, () => {});
      assert.strictEqual(res.statusCode, 409);
      assert.strictEqual(res.payload.success, false);
      assert.ok(res.payload.message.includes("test@nits.ac.in"));
    },
  );

  await t.test("errorHandler correctly captures CastError", () => {
    const { req, res } = createMockReqRes();
    const castError = new Error("Cast to ObjectId failed");
    castError.name = "CastError";
    castError.value = "invalid-object-id";

    errorHandler(castError, req, res, () => {});
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.payload.success, false);
    assert.ok(
      res.payload.message.includes("Invalid resource identifier format"),
    );
  });

  await t.test("errorHandler correctly captures JWT errors", () => {
    const { req: req1, res: res1 } = createMockReqRes();
    const jwtError = new Error("invalid signature");
    jwtError.name = "JsonWebTokenError";
    errorHandler(jwtError, req1, res1, () => {});
    assert.strictEqual(res1.statusCode, 401);

    const { req: req2, res: res2 } = createMockReqRes();
    const expiredError = new Error("jwt expired");
    expiredError.name = "TokenExpiredError";
    errorHandler(expiredError, req2, res2, () => {});
    assert.strictEqual(res2.statusCode, 401);
  });

  await t.test("errorHandler preserves explicit HTTP status codes", () => {
    const { req, res } = createMockReqRes();
    const requestError = new Error("Forbidden");
    requestError.statusCode = 403;

    errorHandler(requestError, req, res, () => {});

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.payload.success, false);
  });
});
