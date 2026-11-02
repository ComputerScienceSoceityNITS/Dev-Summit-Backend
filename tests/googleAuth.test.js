const test = require("node:test");
const assert = require("node:assert/strict");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/user.model");
const { googleSignIn } = require("../controllers/auth.controller");

process.env.JWT_SECRET = "test-google-auth-secret";
process.env.GOOGLE_CLIENT_ID =
  "123456789-testclient.apps.googleusercontent.com";

test("Google accounts can be created without a password or Scholar ID", async () => {
  const user = new User({
    name: "Summit Student",
    email: "student@cse.nits.ac.in",
    googleId: "google-subject-123",
    role: "user",
  });

  await assert.doesNotReject(user.validate());
  assert.equal(await user.matchPassword("any-password"), false);
});

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
    cookie(name, value, options) {
      this.setCookie = { name, value, options };
      return this;
    },
  };
}

test("Google sign-in creates a verified institute account", async () => {
  const originalVerifyIdToken = OAuth2Client.prototype.verifyIdToken;
  const originalFindOne = User.findOne;
  const originalCreate = User.create;
  const createdUser = {
    _id: "google-user-123",
    name: "Summit Student",
    email: "student@cse.nits.ac.in",
    scholarId: "",
    role: "user",
  };
  let createdAccount;

  OAuth2Client.prototype.verifyIdToken = async (options) => {
    assert.equal(options.idToken, "verified-google-credential");
    assert.equal(options.audience, process.env.GOOGLE_CLIENT_ID);
    return {
      getPayload: () => ({
        sub: "google-subject-123",
        email: createdUser.email,
        email_verified: true,
        name: createdUser.name,
      }),
    };
  };
  User.findOne = async () => null;
  User.create = async (account) => {
    createdAccount = account;
    return createdUser;
  };

  try {
    const req = { body: { credential: "verified-google-credential" } };
    const res = createResponse();
    await googleSignIn(req, res, (error) => {
      throw error;
    });

    assert.deepEqual(createdAccount, {
      name: "Summit Student",
      email: "student@cse.nits.ac.in",
      scholarId: "",
      googleId: "google-subject-123",
      role: "user",
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.payload.data.user.email, createdUser.email);
    assert.equal(res.setCookie.options.httpOnly, true);
  } finally {
    OAuth2Client.prototype.verifyIdToken = originalVerifyIdToken;
    User.findOne = originalFindOne;
    User.create = originalCreate;
  }
});

test("Google sign-in rejects unverified non-institute accounts", async () => {
  const originalVerifyIdToken = OAuth2Client.prototype.verifyIdToken;
  const originalFindOne = User.findOne;
  let lookupCalled = false;

  OAuth2Client.prototype.verifyIdToken = async () => ({
    getPayload: () => ({
      sub: "google-subject-outsider",
      email: "student@example.com",
      email_verified: true,
      name: "Outside Student",
    }),
  });
  User.findOne = async () => {
    lookupCalled = true;
    return null;
  };

  try {
    const req = { body: { credential: "verified-google-credential" } };
    const res = createResponse();
    await googleSignIn(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 403);
    assert.equal(lookupCalled, false);
  } finally {
    OAuth2Client.prototype.verifyIdToken = originalVerifyIdToken;
    User.findOne = originalFindOne;
  }
});

test("Google sign-in rejects invalid credentials", async () => {
  const originalVerifyIdToken = OAuth2Client.prototype.verifyIdToken;
  const originalFindOne = User.findOne;
  let lookupCalled = false;

  OAuth2Client.prototype.verifyIdToken = async () => {
    throw new Error("Invalid token signature");
  };
  User.findOne = async () => {
    lookupCalled = true;
    return null;
  };

  try {
    const req = { body: { credential: "invalid-credential" } };
    const res = createResponse();
    await googleSignIn(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 401);
    assert.equal(lookupCalled, false);
  } finally {
    OAuth2Client.prototype.verifyIdToken = originalVerifyIdToken;
    User.findOne = originalFindOne;
  }
});

test("Google sign-in reports placeholder OAuth configuration", async () => {
  const originalClientId = process.env.GOOGLE_CLIENT_ID;
  const originalVerifyIdToken = OAuth2Client.prototype.verifyIdToken;
  let verificationCalled = false;

  process.env.GOOGLE_CLIENT_ID =
    "your-google-oauth-client-id.apps.googleusercontent.com";
  OAuth2Client.prototype.verifyIdToken = async () => {
    verificationCalled = true;
    throw new Error("Verification should not run");
  };

  try {
    const req = { body: { credential: "google-credential" } };
    const res = createResponse();
    await googleSignIn(req, res, (error) => {
      throw error;
    });

    assert.equal(res.statusCode, 503);
    assert.match(res.payload.message, /valid OAuth Web client ID/);
    assert.equal(verificationCalled, false);
  } finally {
    process.env.GOOGLE_CLIENT_ID = originalClientId;
    OAuth2Client.prototype.verifyIdToken = originalVerifyIdToken;
  }
});
