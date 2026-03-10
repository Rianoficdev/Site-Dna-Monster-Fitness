const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { env } = require("./env");

const globalForPrisma = globalThis;

if (!env.databaseUrl) {
  throw new Error("DATABASE_URL is required to initialize Prisma.");
}

const adapter = new PrismaPg({
  connectionString: env.databaseUrl,
});

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: env.nodeEnv === "development" ? ["error", "warn"] : ["error"],
  });

if (env.nodeEnv !== "production") {
  globalForPrisma.prisma = prisma;
}

module.exports = {
  prisma,
};
