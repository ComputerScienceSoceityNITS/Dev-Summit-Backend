const { Redis } = require("@upstash/redis");

let redis;

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (
  url &&
  token &&
  !url.includes("sample-upstash") &&
  !token.includes("sample_upstash")
) {
  redis = new Redis({
    url,
    token,
  });
  console.log("⚡ Connected to Upstash Redis REST API");
} else {
  console.log(
    "⚠️ Using In-Memory Storage Fallback for local development (Set UPSTASH_REDIS_REST_URL & UPSTASH_REDIS_REST_TOKEN in Backend/.env)",
  );

  const memoryStore = new Map();
  const sortedSets = new Map();

  redis = {
    set: async (key, value, opts) => {
      memoryStore.set(key, String(value));
      if (opts && opts.ex) {
        setTimeout(() => memoryStore.delete(key), opts.ex * 1000);
      }
      return "OK";
    },
    get: async (key) => {
      const val = memoryStore.get(key);
      return val !== undefined ? val : null;
    },
    del: async (key) => {
      return memoryStore.delete(key) ? 1 : 0;
    },
    pipeline: () => {
      const ops = [];
      let currentKey = "";

      const pipe = {
        zremrangebyscore: (key, min, max) => {
          currentKey = key;
          ops.push(() => {
            const set = sortedSets.get(key) || [];
            const filtered = set.filter((item) => {
              const score =
                typeof item === "object" && item !== null
                  ? item.score
                  : Number(item);
              return score < min || score > max;
            });
            sortedSets.set(key, filtered);
          });
          return pipe;
        },
        zadd: (key, arg1, arg2) => {
          currentKey = key;
          ops.push(() => {
            const set = sortedSets.get(key) || [];
            if (typeof arg1 === "object" && arg1 !== null) {
              set.push({ score: arg1.score, member: arg1.member });
            } else {
              set.push({ score: arg1, member: arg2 });
            }
            sortedSets.set(key, set);
          });
          return pipe;
        },
        zcard: (key) => {
          currentKey = key;
          ops.push(() => {
            // Count operation calculated in exec()
          });
          return pipe;
        },
        expire: (key, seconds) => {
          ops.push(() => {
            if (seconds > 0) {
              setTimeout(() => sortedSets.delete(key), seconds * 1000);
            }
          });
          return pipe;
        },
        exec: async () => {
          for (const op of ops) {
            op();
          }
          const set = sortedSets.get(currentKey) || [];
          const requestCount = set.length;
          return [
            [null, 0],
            [null, 1],
            [null, requestCount],
            [null, 1],
          ];
        },
      };
      return pipe;
    },
    zrange: async (key, start, stop, opts) => {
      const set = sortedSets.get(key) || [];
      if (set.length === 0) return [String(Date.now()) + "-0.123"];
      const first = set[0];
      if (typeof first === "object" && first !== null) {
        return [first.member || String(first.score)];
      }
      return [String(first)];
    },
  };
}

module.exports = { redis };

