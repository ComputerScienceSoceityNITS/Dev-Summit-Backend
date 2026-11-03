const AUTH_COOKIE_NAME = "dev_summit_token";
const { isProduction, isVercel } = require("./runtimeEnvironment");

const getAuthCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction || isVercel,
  sameSite: isProduction || isVercel ? "none" : "lax",
  path: "/",
});

const setAuthCookie = (res, token) => {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
};

const clearAuthCookie = (res) => {
  res.clearCookie(AUTH_COOKIE_NAME, getAuthCookieOptions());
};

const getAuthToken = (req) => {
  const cookieHeader = req.headers.cookie || "";
  const tokenCookie = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${AUTH_COOKIE_NAME}=`));

  const cookieToken = tokenCookie?.slice(AUTH_COOKIE_NAME.length + 1);
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.authorization;
  if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  return undefined;
};

module.exports = {
  AUTH_COOKIE_NAME,
  getAuthCookieOptions,
  setAuthCookie,
  clearAuthCookie,
  getAuthToken,
};
