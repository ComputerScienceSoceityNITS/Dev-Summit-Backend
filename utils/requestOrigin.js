const configuredOrigin = new URL(
  process.env.CLIENT_URL || "http://localhost:5173",
).origin;

const isAllowedOrigin = (origin) => {
  if (!origin || origin === configuredOrigin) {
    return true;
  }

  if (process.env.NODE_ENV === "production") {
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
