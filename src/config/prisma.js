const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const { env } = require("./env");

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
      console.error("[prisma] pg pool error:", error && error.message ? error.message : error);
    }
  },
});

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: env.nodeEnv === "development" ? ["error", "warn"] : ["error"],
  });

if (env.nodeEnv !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.__dnaPgPool = pool;
}

module.exports = {
  pool,
  prisma,
};
