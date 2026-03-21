const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.resolve(process.cwd(), ".env"),
});

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return defaultValue;
  return String(value).trim().toLowerCase() === "true";
}

function parseNumber(value, defaultValue) {
  if (value === undefined || value === null || value === "") return defaultValue;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

function parseTrustProxy(value) {
  if (value === undefined || value === null || value === "") return false;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return value;
}

function parseCsv(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const weakJwtSecretValues = new Set([
  "sua_chave_super_secreta",
  "change_me",
  "jwt_secret",
  "secret",
]);

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseNumber(process.env.PORT, 3000),
  jwtSecret: process.env.JWT_SECRET || "sua_chave_super_secreta",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  jwtSessionExpiresIn: process.env.JWT_EXPIRES_IN_SESSION || "12h",
  jwtRememberExpiresIn: process.env.JWT_EXPIRES_IN_REMEMBER || process.env.JWT_EXPIRES_IN || "30d",
  onlinePresenceWindowMinutes: parseNumber(process.env.ONLINE_PRESENCE_WINDOW_MINUTES, 5),
  corsOrigins: parseCsv(process.env.CORS_ORIGINS),
  passwordResetTokenMinutes: parseNumber(process.env.PASSWORD_RESET_TOKEN_MINUTES, 30),
  mailService: process.env.MAIL_SERVICE || "",
  mailHost: process.env.MAIL_HOST || "",
  mailPort: parseNumber(process.env.MAIL_PORT, 587),
  mailSecure: parseBoolean(process.env.MAIL_SECURE, false),
  mailUser: process.env.MAIL_USER || "",
  mailPass: process.env.MAIL_PASS || "",
  mailFromName: process.env.MAIL_FROM_NAME || "DNA Monster Fitness",
  mailFromEmail: process.env.MAIL_FROM_EMAIL || "",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
  supabasePasswordResetRedirectUrl: process.env.SUPABASE_PASSWORD_RESET_REDIRECT_URL || "",
  databaseUrl: process.env.DATABASE_URL || "",
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
  uploadsDir: process.env.UPLOADS_DIR || "uploads",
  uploadMaxFileSizeMb: Math.max(1, parseNumber(process.env.UPLOAD_MAX_FILE_SIZE_MB, 50)),
  seedSampleWorkouts: parseBoolean(process.env.SEED_SAMPLE_WORKOUTS, false),
};

if (env.nodeEnv === "production") {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required in production.");
  }

  if (env.jwtSecret.length < 32 || weakJwtSecretValues.has(env.jwtSecret.toLowerCase().trim())) {
    throw new Error("JWT_SECRET is too weak for production. Use a strong secret with at least 32 characters.");
  }

  if (!env.corsOrigins.length) {
    throw new Error("CORS_ORIGINS is required in production.");
  }

  if (env.corsOrigins.includes("*")) {
    throw new Error("CORS_ORIGINS cannot use wildcard (*) in production.");
  }
}

module.exports = {
  env,
};
