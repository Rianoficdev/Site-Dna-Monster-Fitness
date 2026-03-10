const { verifyAccessToken } = require("../config/jwt");
const { prisma } = require("../config/prisma");
const { AppError } = require("../utils/AppError");
const AUTH_DB_LOOKUP_TIMEOUT_MS = 1500;

function hasDatabaseConnectivityError(error) {
  const knownCode = String(
    (error && (error.code || error.errorCode || error.errno)) || ""
  )
    .trim()
    .toUpperCase();

  if (
    ["AUTH_DB_TIMEOUT", "ETIMEDOUT", "ECONNREFUSED", "EHOSTUNREACH", "ENOTFOUND", "P1001", "P1002", "P1008"].includes(
      knownCode
    )
  ) {
    return true;
  }

  const message = String((error && error.message) || "")
    .trim()
    .toLowerCase();
  return (
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("can't reach database") ||
    message.includes("can not reach database") ||
    message.includes("p1001") ||
    message.includes("p1002") ||
    message.includes("p1008")
  );
}

async function authMiddleware(req, _res, next) {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
  }

  try {
    const decoded = verifyAccessToken(token);
    const userId = Number(decoded && decoded.id) || 0;

    if (!userId) {
      return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }

    let user = null;
    try {
      const userLookupPromise = prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          isEnabled: true,
        },
      });

      const lookupTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          const timeoutError = new Error("Database lookup timeout");
          timeoutError.code = "AUTH_DB_TIMEOUT";
          reject(timeoutError);
        }, AUTH_DB_LOOKUP_TIMEOUT_MS);
      });

      user = await Promise.race([userLookupPromise, lookupTimeoutPromise]);
    } catch (dbError) {
      throw dbError;
    }

    if (!user) {
      return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }

    if (!user.isEnabled) {
      return next(
        new AppError(
          "Conta desabilitada. Procure a administração para reativar o acesso.",
          403,
          "ACCOUNT_DISABLED"
        )
      );
    }

    req.user = {
      id: Number(user.id),
      role: String(user.role || "").trim().toUpperCase(),
    };
    req.userId = Number(user.id);

    return next();
  } catch (error) {
    if (hasDatabaseConnectivityError(error)) {
      return next(
        new AppError(
          "Serviço de autenticação temporariamente indisponível.",
          503,
          "AUTH_SERVICE_UNAVAILABLE"
        )
      );
    }

    return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
  }
}

module.exports = {
  authMiddleware,
};

