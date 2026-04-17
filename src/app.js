const express = require("express");
const cors = require("cors");
const path = require("path");
const { env } = require("./config/env");
const { createContainer } = require("./shared/container");
const { createApiRouter } = require("./routes");
const { authMiddleware } = require("./middlewares/auth.middleware");
const { roleMiddleware } = require("./middlewares/role.middleware");
const { notFoundMiddleware } = require("./middlewares/notFoundMiddleware");
const { errorMiddleware } = require("./middlewares/errorMiddleware");
const { ROLES } = require("./shared/roles");

let compression = null;
try {
  compression = require("compression");
} catch (_error) {
  compression = null;
}

function createCorsOptions() {
  const allowedOrigins = env.corsOrigins || [];
  const allowAnyOrigin = allowedOrigins.includes("*");
  const isDevWithoutExplicitOrigins = env.nodeEnv !== "production" && allowedOrigins.length === 0;

  return {
    origin(origin, callback) {
      // Requests without Origin (curl, server-to-server, mobile apps)
      if (!origin) return callback(null, true);

      if (allowAnyOrigin || isDevWithoutExplicitOrigins) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  };
}

function createApp() {
  const app = express();
  const container = createContainer();

  app.disable("x-powered-by");
  app.set("trust proxy", env.trustProxy);

  app.use(cors(createCorsOptions()));
  if (env.httpCompressionEnabled && typeof compression === "function") {
    app.use(
      compression({
        threshold: env.httpCompressionThreshold,
      })
    );
  }
  app.use(express.json());
  app.use("/uploads", express.static(path.resolve(process.cwd(), env.uploadsDir || "uploads")));

  app.get("/health", (_req, res) => {
    return res.status(200).json({
      status: "ok",
      service: "dna-monster-fitness-api",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/", (_req, res) => {
    return res.status(200).send("API ONLINE 🚀");
  });

  app.use(
    "/api",
    createApiRouter({
      controllers: container.controllers,
      authMiddleware,
      roleMiddleware,
      roles: ROLES,
    })
  );

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}

module.exports = {
  createApp,
};
