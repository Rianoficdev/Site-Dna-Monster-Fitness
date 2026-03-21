const { env } = require("./config/env");
const { createApp } = require("./app");
const { prisma } = require("./config/prisma");
const logger = require("./shared/logger");

const app = createApp();
const PORT = env.port;

const server = app.listen(PORT, () => {
  logger.info("DNA Monster API started", {
    port: PORT,
    env: env.nodeEnv,
    pid: process.pid,
  });
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info("Shutdown signal received", { signal });

  const forceExitTimer = setTimeout(() => {
    logger.error("Forced shutdown after timeout", { signal });
    process.exit(1);
  }, 10_000);

  try {
    server.close(async () => {
      try {
        await prisma.$disconnect();
      } catch (error) {
        logger.error("Prisma disconnect failed", {
          message: error && error.message ? error.message : "Unknown error",
        });
      } finally {
        clearTimeout(forceExitTimer);
        logger.info("HTTP server closed", { signal });
        process.exit(0);
      }
    });
  } catch (error) {
    clearTimeout(forceExitTimer);
    logger.error("Shutdown failed", {
      signal,
      message: error && error.message ? error.message : "Unknown error",
    });
    process.exit(1);
  }
}

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", {
    reason: reason && reason.message ? reason.message : String(reason),
  });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", {
    message: error && error.message ? error.message : "Unknown error",
  });
  void shutdown("UNCAUGHT_EXCEPTION");
});
