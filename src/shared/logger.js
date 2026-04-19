const { getRequestContext } = require("./requestContext");

function buildLogPayload(level, message, meta = {}) {
  const requestContext = getRequestContext();
  const contextMeta = requestContext && requestContext.requestId
    ? {
        requestId: requestContext.requestId,
      }
    : {};

  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...contextMeta,
    ...meta,
  };
}

function info(message, meta = {}) {
  console.log(JSON.stringify(buildLogPayload("info", message, meta)));
}

function error(message, meta = {}) {
  console.error(JSON.stringify(buildLogPayload("error", message, meta)));
}

module.exports = {
  info,
  error,
};
