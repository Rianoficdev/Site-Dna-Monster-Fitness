const { verifyAccessToken } = require("../config/jwt");
const { prisma } = require("../config/prisma");
const { AppError } = require("../utils/AppError");
const AUTH_DB_LOOKUP_TIMEOUT_MS = 1500;
const AUTH_USER_CACHE_TTL_MS = 30000;
const authUserCache = new Map();

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

function getCachedAuthUser(userId) {
  const cacheKey = Number(userId) || 0;
  if (!cacheKey) return null;

  const cached = authUserCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    authUserCache.delete(cacheKey);
    return null;
  }

  return cached.user;
}

function setCachedAuthUser(user) {
  const cacheKey = Number(user && user.id) || 0;
  if (!cacheKey) return;

  authUserCache.set(cacheKey, {
    user: {
      id: cacheKey,
      role: String(user.role || "").trim().toUpperCase(),
      isEnabled: user.isEnabled !== false,
    },
    expiresAt: Date.now() + AUTH_USER_CACHE_TTL_MS,
  });
}

function clearCachedAuthUser(userId) {
  const cacheKey = Number(userId) || 0;
  if (!cacheKey) return;
  authUserCache.delete(cacheKey);
}

function clearAllCachedAuthUsers() {
  authUserCache.clear();
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

    const cachedUser = getCachedAuthUser(userId);
    if (cachedUser) {
      if (!cachedUser.isEnabled) {
        return next(
          new AppError(
            "Conta desabilitada. Procure a administração para reativar o acesso.",
            403,
            "ACCOUNT_DISABLED"
          )
        );
      }

      req.user = {
        id: Number(cachedUser.id),
        role: String(cachedUser.role || "").trim().toUpperCase(),
      };
      req.userId = Number(cachedUser.id);
      return next();
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

    setCachedAuthUser(user);

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
  clearAllCachedAuthUsers,
  clearCachedAuthUser,
};

