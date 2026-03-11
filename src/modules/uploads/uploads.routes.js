const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { Router } = require("express");
const { env } = require("../../config/env");
const {
  buildStorageObjectPath,
  ensureBucketExists,
  isSupabaseStorageEnabled,
  uploadBufferToSupabaseStorage,
} = require("./uploads.storage");

function ensureMediaUploadsDir() {
  const uploadsRoot = path.resolve(process.cwd(), env.uploadsDir || "uploads");
  const mediaDir = path.join(uploadsRoot, "media");
  fs.mkdirSync(mediaDir, { recursive: true });
  return mediaDir;
}

function resolveExtension(file) {
  const originalExt = path.extname(String(file && file.originalname ? file.originalname : "")).toLowerCase();
  const safeOriginalExt = originalExt.replace(/[^a-z0-9.]/g, "");
  if (safeOriginalExt) return safeOriginalExt;

  const mimeType = String(file && file.mimetype ? file.mimetype : "").toLowerCase();
  const subtype = mimeType.includes("/") ? mimeType.split("/")[1] : "";
  const safeSubtype = subtype.split("+")[0].replace(/[^a-z0-9]/g, "");
  return safeSubtype ? `.${safeSubtype}` : ".bin";
}

function createUploadMiddleware() {
  const useSupabaseStorage = isSupabaseStorageEnabled();
  const storage = useSupabaseStorage
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination(_req, _file, callback) {
          try {
            callback(null, ensureMediaUploadsDir());
          } catch (error) {
            callback(error);
          }
        },
        filename(_req, file, callback) {
          const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
          callback(null, `${uniqueSuffix}${resolveExtension(file)}`);
        },
      });

  return multer({
    storage,
    limits: {
      fileSize: Math.max(1, Number(env.uploadMaxFileSizeMb) || 50) * 1024 * 1024,
    },
    fileFilter(_req, file, callback) {
      const mimeType = String(file && file.mimetype ? file.mimetype : "").toLowerCase();
      const isAllowed = mimeType.startsWith("image/") || mimeType.startsWith("video/");
      if (isAllowed) {
        callback(null, true);
        return;
      }

      callback(new Error("Envie apenas arquivos de imagem ou video."));
    },
  });
}

function buildAbsoluteUrl(req, relativeUrl) {
  const protocol = String((req && req.protocol) || "http").trim() || "http";
  const host = req && typeof req.get === "function" ? String(req.get("host") || "").trim() : "";
  if (!host) return relativeUrl;
  return `${protocol}://${host}${relativeUrl}`;
}

function createUploadsRoutes({ authMiddleware }) {
  const router = Router();
  const upload = createUploadMiddleware();

  async function handleUploadedMediaRequest(req, res) {
    if (!req.file) {
      return res.status(400).json({
        message: "Envie um arquivo no campo file.",
      });
    }

    try {
      if (isSupabaseStorageEnabled()) {
        const storageFilename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${resolveExtension(req.file)}`;
        await ensureBucketExists();
        const uploadedMedia = await uploadBufferToSupabaseStorage({
          fileBuffer: req.file.buffer,
          fileName: storageFilename,
          mimeType: req.file.mimetype,
          objectPath: buildStorageObjectPath(storageFilename),
        });

        return res.status(201).json({
          message: "Upload realizado com sucesso.",
          media: {
            filename: uploadedMedia.filename,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
            url: uploadedMedia.publicUrl,
            absoluteUrl: uploadedMedia.publicUrl,
            bucket: uploadedMedia.bucket,
            objectPath: uploadedMedia.objectPath,
            storage: uploadedMedia.storage,
          },
        });
      }

      const relativeUrl = `/uploads/media/${req.file.filename}`;
      return res.status(201).json({
        message: "Upload realizado com sucesso.",
        media: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          url: relativeUrl,
          absoluteUrl: buildAbsoluteUrl(req, relativeUrl),
          storage: "local",
        },
      });
    } catch (storageError) {
      return res.status(502).json({
        message:
          storageError && storageError.message
            ? storageError.message
            : "Nao foi possivel enviar o arquivo para o storage configurado.",
      });
    }
  }

  router.post("/uploads/media", authMiddleware, (req, res) => {
    upload.single("file")(req, res, (error) => {
      if (error) {
        const isMulterLimit = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE";
        const statusCode = isMulterLimit ? 413 : 400;
        const fallbackMessage = isMulterLimit
          ? `Arquivo excede o limite de ${Math.max(1, Number(env.uploadMaxFileSizeMb) || 50)} MB.`
          : "Nao foi possivel processar o upload.";
        return res.status(statusCode).json({
          message: error && error.message ? error.message : fallbackMessage,
        });
      }

      void handleUploadedMediaRequest(req, res);
    });
  });

  return router;
}

module.exports = {
  createUploadsRoutes,
};
