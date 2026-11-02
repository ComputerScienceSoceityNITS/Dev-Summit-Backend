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

  return tokenCookie?.slice(AUTH_COOKIE_NAME.length + 1);
};

module.exports = {
  AUTH_COOKIE_NAME,
  getAuthCookieOptions,
  setAuthCookie,
  clearAuthCookie,
  getAuthToken,
};
