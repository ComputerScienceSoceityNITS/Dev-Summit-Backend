const { isProduction, isVercel } = require("./runtimeEnvironment");

const getAllowedOrigins = () => {
  const envOrigins = (
    process.env.ALLOWED_ORIGINS ||
    process.env.CLIENT_URL ||
    "http://localhost:5173"
  )
    .split(",")
    .map((url) => {
      try {
        return new URL(url.trim()).origin;
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return new Set(envOrigins);
};

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.has(origin)) {
    return true;
  }

  if (isProduction || isVercel) {
    return false;
  }

  try {
    const parsedOrigin = new URL(origin);
    return (
      parsedOrigin.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(parsedOrigin.hostname)
    );
  } catch {
    return false;
  }
};

module.exports = {
  isAllowedOrigin,
};
