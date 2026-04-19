const { AsyncLocalStorage } = require("async_hooks");

const requestContextStorage = new AsyncLocalStorage();
let requestSequence = 0;

function sanitizePath(pathname) {
  const value = String(pathname || "").trim();
  if (!value) return "/";
  const queryIndex = value.indexOf("?");
  return queryIndex >= 0 ? value.slice(0, queryIndex) : value;
}

function normalizeRequestIdHeader(value) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const normalized = String(rawValue || "").trim();
  if (!normalized) return "";

  return normalized
    .replace(/[\r\n\t]/g, "")
    .slice(0, 128);
}

function createRequestId() {
  requestSequence += 1;
  return `req-${Date.now()}-${requestSequence}`;
}

function runWithRequestContext(context, callback) {
  return requestContextStorage.run(context, callback);
}

function getRequestContext() {
  return requestContextStorage.getStore() || null;
}

function getRequestId() {
  const context = getRequestContext();
  return context && context.requestId ? context.requestId : null;
}

function createRequestContextMiddleware({ enabled = false } = {}) {
  return function requestContextMiddleware(req, res, next) {
    if (!enabled) {
      next();
      return;
    }

    const requestId = normalizeRequestIdHeader(req.headers["x-request-id"]) || createRequestId();
    const context = {
      requestId,
      method: req.method,
      path: sanitizePath(req.originalUrl || req.url),
      startedAt: Date.now(),
    };

    req.requestId = requestId;
    req.requestContext = context;
    res.locals.requestId = requestId;
    res.setHeader("x-request-id", requestId);

    runWithRequestContext(context, () => {
      next();
    });
  };
}

module.exports = {
  createRequestContextMiddleware,
  createRequestId,
  getRequestContext,
  getRequestId,
  runWithRequestContext,
};
