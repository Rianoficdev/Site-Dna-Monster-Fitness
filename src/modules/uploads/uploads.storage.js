const fs = require("fs");
const path = require("path");
const { env } = require("../../config/env");

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return defaultValue;
  return String(value).trim().toLowerCase() === "true";
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function normalizeObjectPath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/")
    .trim();
}

function encodeStoragePathSegments(objectPath) {
  return normalizeObjectPath(objectPath)
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function getStorageAuthKey() {
  return String(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || env.supabaseAnonKey || "").trim();
}

function getSupabaseStorageConfig() {
  const authKey = getStorageAuthKey();
  const shouldEnableByDefault = Boolean(env.nodeEnv === "production" && env.supabaseUrl && authKey);
  return {
    enabled: parseBoolean(process.env.SUPABASE_STORAGE_ENABLED, shouldEnableByDefault),
    url: normalizeBaseUrl(env.supabaseUrl),
    authKey,
    bucket: String(process.env.SUPABASE_STORAGE_BUCKET || "media").trim(),
    prefix: normalizeObjectPath(process.env.SUPABASE_STORAGE_PREFIX || "uploads/media"),
    hasServiceRole: Boolean(String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim()),
  };
}

function isSupabaseStorageEnabled() {
  const config = getSupabaseStorageConfig();
  return Boolean(config.enabled && config.url && config.authKey && config.bucket);
}

function getSupabaseStoragePublicUrl(objectPath) {
  const config = getSupabaseStorageConfig();
  if (!config.url || !config.bucket) return "";
  const encodedBucket = encodeURIComponent(config.bucket);
  const encodedPath = encodeStoragePathSegments(objectPath);
  return `${config.url}/storage/v1/object/public/${encodedBucket}/${encodedPath}`;
}

function buildStorageObjectPath(fileName) {
  const config = getSupabaseStorageConfig();
  const safeFileName = path.basename(String(fileName || "").trim());
  return normalizeObjectPath(config.prefix ? `${config.prefix}/${safeFileName}` : safeFileName);
}

function guessMimeTypeFromPath(filePath) {
  const extension = path.extname(String(filePath || "")).toLowerCase();
  switch (extension) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".mov":
      return "video/quicktime";
    case ".avi":
      return "video/x-msvideo";
    default:
      return "application/octet-stream";
  }
}

async function ensureBucketExists() {
  const config = getSupabaseStorageConfig();
  if (!isSupabaseStorageEnabled()) {
    throw new Error("Supabase Storage nao esta configurado.");
  }

  if (!config.hasServiceRole) {
    return false;
  }

  const encodedBucket = encodeURIComponent(config.bucket);
  const baseHeaders = {
    Authorization: `Bearer ${config.authKey}`,
    apikey: config.authKey,
  };

  const response = await fetch(`${config.url}/storage/v1/bucket/${encodedBucket}`, {
    method: "GET",
    headers: baseHeaders,
  });

  if (response.ok) return true;
  const errorText = await response.text().catch(() => "");
  const bucketMissing =
    response.status === 404 ||
    (response.status === 400 && /bucket not found/i.test(errorText));

  if (!bucketMissing) {
    throw new Error(
      `Falha ao verificar bucket ${config.bucket} no Supabase Storage (${response.status}). ${errorText}`.trim()
    );
  }

  if (!config.hasServiceRole) {
    throw new Error(
      `Bucket ${config.bucket} nao existe e SUPABASE_SERVICE_ROLE_KEY nao esta configurada para cria-lo automaticamente.`
    );
  }

  const createResponse = await fetch(`${config.url}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      ...baseHeaders,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: config.bucket,
      name: config.bucket,
      public: true,
    }),
  });

  if (createResponse.ok || createResponse.status === 409) {
    return true;
  }

  const createErrorText = await createResponse.text().catch(() => "");
  throw new Error(
    `Falha ao criar bucket ${config.bucket} no Supabase Storage (${createResponse.status}). ${createErrorText}`.trim()
  );
}

async function uploadBufferToSupabaseStorage({
  fileBuffer,
  fileName,
  mimeType = "",
  objectPath = "",
}) {
  if (!Buffer.isBuffer(fileBuffer)) {
    throw new Error("Buffer de arquivo invalido para upload no Supabase Storage.");
  }

  const config = getSupabaseStorageConfig();
  if (!isSupabaseStorageEnabled()) {
    throw new Error("Supabase Storage nao esta habilitado.");
  }

  const finalObjectPath = normalizeObjectPath(objectPath || buildStorageObjectPath(fileName));
  const encodedBucket = encodeURIComponent(config.bucket);
  const encodedPath = encodeStoragePathSegments(finalObjectPath);
  const safeMimeType = String(mimeType || "").trim() || guessMimeTypeFromPath(fileName);

  const response = await fetch(`${config.url}/storage/v1/object/${encodedBucket}/${encodedPath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.authKey}`,
      apikey: config.authKey,
      "Content-Type": safeMimeType,
      "x-upsert": "true",
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Falha ao enviar ${finalObjectPath} para o Supabase Storage (${response.status}). ${errorText}`.trim()
    );
  }

  const publicUrl = getSupabaseStoragePublicUrl(finalObjectPath);
  return {
    storage: "supabase",
    bucket: config.bucket,
    objectPath: finalObjectPath,
    filename: path.basename(finalObjectPath),
    publicUrl,
    url: publicUrl,
    absoluteUrl: publicUrl,
  };
}

async function uploadLocalFileToSupabaseStorage({
  filePath,
  objectPath = "",
  mimeType = "",
}) {
  const resolvedFilePath = path.resolve(String(filePath || ""));
  if (!fs.existsSync(resolvedFilePath)) {
    throw new Error(`Arquivo local nao encontrado para migracao: ${resolvedFilePath}`);
  }

  const buffer = fs.readFileSync(resolvedFilePath);
  return uploadBufferToSupabaseStorage({
    fileBuffer: buffer,
    fileName: path.basename(resolvedFilePath),
    mimeType: mimeType || guessMimeTypeFromPath(resolvedFilePath),
    objectPath,
  });
}

module.exports = {
  buildStorageObjectPath,
  ensureBucketExists,
  getSupabaseStorageConfig,
  getSupabaseStoragePublicUrl,
  guessMimeTypeFromPath,
  isSupabaseStorageEnabled,
  normalizeObjectPath,
  uploadBufferToSupabaseStorage,
  uploadLocalFileToSupabaseStorage,
};
