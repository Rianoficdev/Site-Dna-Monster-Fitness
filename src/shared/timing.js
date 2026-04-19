const logger = require("./logger");
const { getRequestContext } = require("./requestContext");

function nowNs() {
  return process.hrtime.bigint();
}

function toDurationMs(startNs) {
  return Number(process.hrtime.bigint() - startNs) / 1_000_000;
}

function roundDurationMs(durationMs) {
  return Math.round(durationMs * 100) / 100;
}

function isPromiseLike(value) {
  return Boolean(value) && typeof value.then === "function";
}

function buildTimingMeta(durationMs, slowThresholdMs) {
  return {
    durationMs: roundDurationMs(durationMs),
    slow: Number(durationMs) >= Number(slowThresholdMs || 0),
  };
}

function sanitizePath(pathname) {
  const value = String(pathname || "").trim();
  if (!value) return "/";
  const queryIndex = value.indexOf("?");
  return queryIndex >= 0 ? value.slice(0, queryIndex) : value;
}

function summarizePrismaArgs(args) {
  if (Array.isArray(args)) {
    return {
      prismaArgsType: "array",
      prismaArgsCount: args.length,
    };
  }

  if (args && typeof args === "object") {
    return {
      prismaArgsType: "object",
      prismaArgKeys: Object.keys(args).slice(0, 12),
    };
  }

  return {
    prismaArgsType: typeof args,
  };
}

function measureOperation(
  label,
  operation,
  {
    enabled = false,
    slowThresholdMs = 0,
    meta = {},
    loggerImpl = logger,
  } = {}
) {
  if (!enabled) {
    return operation();
  }

  const startNs = nowNs();
  loggerImpl.info("Operation started", {
    type: "operation",
    label,
    ...meta,
  });

  try {
    const result = operation();

    if (isPromiseLike(result)) {
      return result
        .then((value) => {
          const durationMs = toDurationMs(startNs);
          loggerImpl.info("Operation finished", {
            type: "operation",
            label,
            ...meta,
            ...buildTimingMeta(durationMs, slowThresholdMs),
          });
          return value;
        })
        .catch((error) => {
          const durationMs = toDurationMs(startNs);
          loggerImpl.error("Operation failed", {
            type: "operation",
            label,
            ...meta,
            ...buildTimingMeta(durationMs, slowThresholdMs),
            errorName: error && error.name ? error.name : "Error",
            errorMessage: error && error.message ? error.message : String(error),
          });
          throw error;
        });
    }

    const durationMs = toDurationMs(startNs);
    loggerImpl.info("Operation finished", {
      type: "operation",
      label,
      ...meta,
      ...buildTimingMeta(durationMs, slowThresholdMs),
    });
    return result;
  } catch (error) {
    const durationMs = toDurationMs(startNs);
    loggerImpl.error("Operation failed", {
      type: "operation",
      label,
      ...meta,
      ...buildTimingMeta(durationMs, slowThresholdMs),
      errorName: error && error.name ? error.name : "Error",
      errorMessage: error && error.message ? error.message : String(error),
    });
    throw error;
  }
}

function wrapTimedMethods(
  target,
  {
    namespace,
    enabled = false,
    slowThresholdMs = 0,
    loggerImpl = logger,
  } = {}
) {
  if (!enabled || !target || typeof target !== "object") {
    return target;
  }

  const wrapped = {};

  Object.entries(target).forEach(([key, value]) => {
    if (typeof value !== "function") {
      wrapped[key] = value;
      return;
    }

    wrapped[key] = function timedMethod(...args) {
      return measureOperation(`${namespace}.${key}`, () => value.apply(target, args), {
        enabled,
        slowThresholdMs,
        loggerImpl,
        meta: {
          scope: namespace,
          method: key,
          argsCount: args.length,
        },
      });
    };
  });

  return wrapped;
}

function createRequestTimingMiddleware({
  enabled = false,
  slowThresholdMs = 0,
  loggerImpl = logger,
} = {}) {
  return function requestTimingMiddleware(req, res, next) {
    if (!enabled) {
      next();
      return;
    }

    const requestContext = getRequestContext();
    const requestId =
      (requestContext && requestContext.requestId) ||
      req.requestId ||
      "unknown-request";
    const path =
      (requestContext && requestContext.path) ||
      sanitizePath(req.originalUrl || req.url);
    const startNs = nowNs();

    loggerImpl.info("Request started", {
      type: "request",
      requestId,
      method: req.method,
      path,
    });

    let settled = false;
    const finalize = (eventName) => {
      if (settled) return;
      settled = true;

      const durationMs = toDurationMs(startNs);
      loggerImpl.info("Request finished", {
        type: "request",
        requestId,
        method: req.method,
        path,
        statusCode: res.statusCode,
        event: eventName,
        ...buildTimingMeta(durationMs, slowThresholdMs),
      });
    };

    res.once("finish", () => finalize("finish"));
    res.once("close", () => finalize("close"));

    next();
  };
}

function createPrismaTimingExtension({
  enabled = false,
  slowThresholdMs = 0,
  loggerImpl = logger,
} = {}) {
  if (!enabled) {
    return null;
  }

  return {
    name: "dna-prisma-timing",
    query: {
      async $allOperations({ model, operation, args, query }) {
        const target = model ? `${model}.${operation}` : operation;

        return measureOperation(`prisma.${target}`, () => query(args), {
          enabled,
          slowThresholdMs,
          loggerImpl,
          meta: {
            type: "query",
            model: model || null,
            operation,
            ...summarizePrismaArgs(args),
          },
        });
      },
    },
  };
}

module.exports = {
  createPrismaTimingExtension,
  createRequestTimingMiddleware,
  measureOperation,
  wrapTimedMethods,
};
