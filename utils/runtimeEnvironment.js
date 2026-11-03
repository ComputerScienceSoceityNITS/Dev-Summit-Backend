const isVercel = process.env.VERCEL === "1";
const isProduction =
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL_ENV === "production";

function getEnvironmentName() {
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV;
  if (isProduction) return "production";
  return process.env.NODE_ENV || "development";
}

module.exports = {
  getEnvironmentName,
  isProduction,
  isVercel,
};
