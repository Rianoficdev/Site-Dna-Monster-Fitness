const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { env } = require("./env");
const logger = require("../shared/logger");
const { createPrismaTimingExtension } = require("../shared/timing");

const globalForPrisma = globalThis;

if (!env.databaseUrl) {
  throw new Error("DATABASE_URL is required to initialize Prisma.");
}

const pool =
  globalForPrisma.__dnaPgPool ||
  new Pool({
    connectionString: env.databaseUrl,
    max: env.databasePoolMax,
    idleTimeoutMillis: env.databasePoolIdleTimeoutMs,
    connectionTimeoutMillis: env.databasePoolConnectionTimeoutMs,
  });

const adapter = new PrismaPg(pool, {
  onPoolError(error) {
    if (env.nodeEnv !== "test") {
      logger.error("Prisma pg pool error", {
        errorMessage: error && error.message ? error.message : String(error),
      });
    }
  },
});

const prismaLogLevels = env.nodeEnv === "development" ? ["warn", "error"] : ["error"];

const basePrisma =
  globalForPrisma.__dnaBasePrisma ||
  new PrismaClient({
    adapter,
    log: prismaLogLevels,
  });

const prismaTimingExtension = createPrismaTimingExtension({
  enabled: env.prismaQueryTimingEnabled,
  slowThresholdMs: env.prismaQueryTimingSlowMs,
  loggerImpl: logger,
});

const prisma =
  (env.prismaQueryTimingEnabled && globalForPrisma.__dnaTimedPrisma) ||
  (prismaTimingExtension ? basePrisma.$extends(prismaTimingExtension) : basePrisma);

if (env.nodeEnv !== "production") {
  globalForPrisma.__dnaBasePrisma = basePrisma;
  if (env.prismaQueryTimingEnabled) {
    globalForPrisma.__dnaTimedPrisma = prisma;
  }
  globalForPrisma.prisma = prisma;
  globalForPrisma.__dnaPgPool = pool;
}

module.exports = {
  pool,
  prisma,
};
