const { redis } = require("../config/redis");

async function rateLimiter(key, maxRequests, windowMs) {
  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    // Upstash Redis SDK format for zadd: { score: number, member: string }
    pipeline.zadd(key, { score: now, member: `${now}-${Math.random()}` });
    pipeline.zcard(key);
    pipeline.expire(key, Math.ceil(windowMs / 1000));

    const results = await pipeline.exec();
    let requestCount = 1;

    if (Array.isArray(results) && results.length >= 3) {
      const cardRes = results[2];
      if (typeof cardRes === "number") {
        requestCount = cardRes;
      } else if (Array.isArray(cardRes)) {
        requestCount =
          typeof cardRes[1] === "number"
            ? cardRes[1]
            : typeof cardRes[0] === "number"
              ? cardRes[0]
              : 1;
      }
    }

    if (requestCount > maxRequests) {
      let oldestScore = now;
      try {
        const oldestRequest = await redis.zrange(key, 0, 0);
        if (Array.isArray(oldestRequest) && oldestRequest.length > 0) {
          const item = oldestRequest[0];
          if (typeof item === "number") {
            oldestScore = item;
          } else if (typeof item === "string") {
            const timestampPart = item.split("-")[0];
            oldestScore = parseInt(timestampPart, 10) || now;
          } else if (item && typeof item === "object") {
            oldestScore =
              item.score ||
              (item.member
                ? parseInt(String(item.member).split("-")[0], 10)
                : now);
          }
        }
      } catch (rangeErr) {
        console.warn(
          "⚠️ Could not fetch oldest score from zrange:",
          rangeErr.message,
        );
      }

      const resetTime = oldestScore + windowMs;
      const retryAfter = Math.max(1, Math.ceil((resetTime - now) / 1000));

      return {
        allowed: false,
        remaining: 0,
        resetTime,
        retryAfter,
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, maxRequests - requestCount),
      resetTime: windowStart + windowMs,
    };
  } catch (err) {
    console.error("⚠️ Rate limiter error:", err.message);
    // Fail open if Redis has temporary network issues
    return { allowed: true, remaining: maxRequests };
  }
}

/**
 * Endpoint Rate Limiting Middleware
 * @param {number} maxRequests - Max requests allowed in window
 * @param {number} windowMs - Window duration in milliseconds (e.g. 10 * 60 * 1000 = 10 mins)
 */
function endpointRateLimit(maxRequests = 5, windowMs = 10 * 60 * 1000) {
  return async (req, res, next) => {
    const ip =
      req.ip ||
      req.headers["x-forwarded-for"] ||
      req.socket?.remoteAddress ||
      "127.0.0.1";
    const email = (
      req.body?.email ||
      req.body?.userEmail ||
      ""
    )
      .toLowerCase()
      .trim();
    const identifier = email || ip;
    const endpoint = `${req.method}:${req.baseUrl || ""}${req.path}`;
    const key = `ratelimit:${endpoint}:${identifier}`;

    const result = await rateLimiter(key, maxRequests, windowMs);

    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", result.remaining);

    if (!result.allowed) {
      res.setHeader("Retry-After", result.retryAfter);
      return res.status(429).json({
        success: false,
        error: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
        retryAfter: result.retryAfter,
      });
    }

    next();
  };
}

module.exports = { endpointRateLimit, rateLimiter };

