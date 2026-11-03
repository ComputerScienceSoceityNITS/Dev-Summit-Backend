const test = require("node:test");
const assert = require("node:assert/strict");
const { endpointRateLimit } = require("../middleware/rateLimiting.middleware");

test("Rate limiter middleware blocks requests exceeding limit and allows under limit", async () => {
  const limiter = endpointRateLimit(2, 60 * 1000);

  function createMock(ip) {
    let statusCode = 200;
    let jsonPayload = null;
    const headers = {};

    return {
      req: {
        method: "POST",
        baseUrl: "/api/test",
        path: "/limit",
        ip,
        body: {},
        socket: {},
      },
      res: {
        setHeader(name, value) {
          headers[name] = value;
        },
        status(code) {
          statusCode = code;
          return this;
        },
        json(payload) {
          jsonPayload = payload;
          return this;
        },
      },
      getStatusCode: () => statusCode,
      getHeaders: () => headers,
      getJson: () => jsonPayload,
    };
  }

  const testIp = `192.0.2.${Math.floor(Math.random() * 200 + 1)}`;
  let nextCalled = 0;
  const next = () => {
    nextCalled++;
  };

  // 1st request -> allowed
  const r1 = createMock(testIp);
  await limiter(r1.req, r1.res, next);
  assert.equal(nextCalled, 1);
  assert.equal(r1.getStatusCode(), 200);

  // 2nd request -> allowed
  const r2 = createMock(testIp);
  await limiter(r2.req, r2.res, next);
  assert.equal(nextCalled, 2);
  assert.equal(r2.getStatusCode(), 200);

  // 3rd request -> blocked (429)
  const r3 = createMock(testIp);
  await limiter(r3.req, r3.res, next);
  assert.equal(nextCalled, 2);
  assert.equal(r3.getStatusCode(), 429);
  assert.equal(r3.getJson().success, false);
});

