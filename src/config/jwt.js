const jwt = require("jsonwebtoken");
const { env } = require("./env");

function signAccessToken(payload, options = {}) {
  const expiresIn = options.expiresIn || env.jwtExpiresIn;

  return jwt.sign(payload, env.jwtSecret, {
    expiresIn,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
};
