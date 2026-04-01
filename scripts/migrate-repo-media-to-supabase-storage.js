const fs = require("fs");
const path = require("path");
const { createHash } = require("crypto");
const {
  ensureBucketExists,
  getSupabaseStorageConfig,
  isSupabaseStorageEnabled,
  uploadLocalFileToSupabaseStorage,
} = require("../src/modules/uploads/uploads.storage");

const PROJECT_ROOT = process.cwd();
const TARGET_TEXT_FILES = ["index.html", "script.js", "styles.css"];
const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".gif",
  ".webp",
  ".bmp",
  ".avif",
]);
const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".webm",
  ".mov",
  ".avi",
  ".mkv",
  ".m4v",
]);

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function isRepositoryMediaDirectory(dirName) {
  const normalized = normalizeText(dirName);
  if (!normalized) return false;
  return (
    normalized === "aba de img" ||
    normalized === "img" ||
    normalized.startsWith("img ") ||
    normalized.startsWith("foto ") ||
    normalized.startsWith("fotos ") ||
    normalized.startsWith("video ") ||
    normalized.startsWith("videos ")
  );
}

function toPosixPath(filePath) {
  return String(filePath || "").split(path.sep).join("/");
}

function getTopLevelMediaDirectories() {
  return fs
    .readdirSync(PROJECT_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && isRepositoryMediaDirectory(entry.name))
    .map((entry) => entry.name)
    .sort((first, second) =>
      first.localeCompare(second, "pt-BR", { numeric: true, sensitivity: "base" })
    );
}

function collectFilesRecursively(directoryPath) {
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  const files = [];

  entries.forEach((entry) => {
    const absolutePath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFilesRecursively(absolutePath));
      return;
    }
    if (entry.isFile()) {
      files.push(absolutePath);
    }
  });

  return files;
}

function getMediaCategory(relativePath) {
  const extension = path.extname(relativePath).toLowerCase();
  if (IMAGE_EXTENSIONS.has(extension)) return "imagens";
  if (VIDEO_EXTENSIONS.has(extension)) return "videos";
  return "outros";
}

function createShortHash(value) {
  return createHash("sha1").update(String(value || "")).digest("hex").slice(0, 10);
}

function sanitizeStorageSegment(value, fallback = "asset") {
  const normalized = normalizeText(value)
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function buildStorageObjectPath(relativePath) {
  const normalizedRelativePath = toPosixPath(relativePath).replace(/^\/+/, "");
  const category = getMediaCategory(normalizedRelativePath);
  const pathSegments = normalizedRelativePath.split("/").filter(Boolean);
  const rawFileName = pathSegments.pop() || "asset";
  const parsedFileName = path.posix.parse(rawFileName);
  const safeDirectories = pathSegments.map((segment) => sanitizeStorageSegment(segment, "dir"));
  const safeBaseName = sanitizeStorageSegment(parsedFileName.name, "asset");
  const safeExtension = String(parsedFileName.ext || "")
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "");
  const hashedFileName = `${createShortHash(normalizedRelativePath)}-${safeBaseName}${safeExtension}`;
  return ["repo-media", category, ...safeDirectories, hashedFileName].join("/");
}

function buildReplacementCandidates(relativePath) {
  const normalizedRelativePath = toPosixPath(relativePath).replace(/^\/+/, "");
  return [`/${normalizedRelativePath}`, normalizedRelativePath].sort(
    (first, second) => second.length - first.length
  );
}

function replaceMediaReferencesInContent(content, filesByCandidate) {
  let nextContent = String(content || "");
  let placeholderIndex = 0;
  let replacements = 0;
  const placeholderMap = new Map();

  const sortedCandidates = Array.from(filesByCandidate.keys()).sort(
    (first, second) => second.length - first.length
  );

  sortedCandidates.forEach((candidate) => {
    if (!candidate || !nextContent.includes(candidate)) return;
    const parts = nextContent.split(candidate);
    const occurrenceCount = parts.length - 1;
    if (occurrenceCount <= 0) return;

    const placeholder = `__SUPABASE_MEDIA_${placeholderIndex}__`;
    placeholderIndex += 1;
    placeholderMap.set(placeholder, filesByCandidate.get(candidate));
    nextContent = parts.join(placeholder);
    replacements += occurrenceCount;
  });

  placeholderMap.forEach((publicUrl, placeholder) => {
    nextContent = nextContent.split(placeholder).join(publicUrl);
  });

  return {
    content: nextContent,
    replacements,
  };
}

function writeFileIfChanged(filePath, nextContent) {
  const absolutePath = path.resolve(PROJECT_ROOT, filePath);
  const currentContent = fs.readFileSync(absolutePath, "utf8");
  if (currentContent === nextContent) {
    return false;
  }

  fs.writeFileSync(absolutePath, nextContent, "utf8");
  return true;
}

async function main() {
  if (!isSupabaseStorageEnabled()) {
    const config = getSupabaseStorageConfig();
    throw new Error(
      `Supabase Storage não está habilitado. enabled=${config.enabled} bucket=${config.bucket || "-"}`
    );
  }

  const config = getSupabaseStorageConfig();
  const mediaDirectories = getTopLevelMediaDirectories();
  if (!mediaDirectories.length) {
    throw new Error("Nenhuma pasta de mídia da raiz foi encontrada para migrar.");
  }

  console.log(`Bucket: ${config.bucket}`);
  console.log(`Prefixo atual do storage: ${config.prefix || "(vazio)"}`);
  console.log(`Pastas de mídia encontradas: ${mediaDirectories.join(", ")}`);

  await ensureBucketExists();

  const allFiles = mediaDirectories
    .flatMap((directoryName) =>
      collectFilesRecursively(path.resolve(PROJECT_ROOT, directoryName)).map((absolutePath) => ({
        absolutePath,
        relativePath: toPosixPath(path.relative(PROJECT_ROOT, absolutePath)),
      }))
    )
    .sort((first, second) =>
      first.relativePath.localeCompare(second.relativePath, "pt-BR", {
        numeric: true,
        sensitivity: "base",
      })
    );

  if (!allFiles.length) {
    throw new Error("Nenhum arquivo de mídia foi encontrado nas pastas selecionadas.");
  }

  const filesByCandidate = new Map();
  const uploadedFiles = [];

  console.log(`Total de arquivos para upload: ${allFiles.length}`);
  for (let index = 0; index < allFiles.length; index += 1) {
    const file = allFiles[index];
    const objectPath = buildStorageObjectPath(file.relativePath);
    const uploadedMedia = await uploadLocalFileToSupabaseStorage({
      filePath: file.absolutePath,
      objectPath,
    });

    buildReplacementCandidates(file.relativePath).forEach((candidate) => {
      filesByCandidate.set(candidate, uploadedMedia.publicUrl);
    });

    uploadedFiles.push({
      relativePath: file.relativePath,
      category: getMediaCategory(file.relativePath),
      publicUrl: uploadedMedia.publicUrl,
    });

    console.log(`[${index + 1}/${allFiles.length}] ${file.relativePath}`);
  }

  const fileUpdateResults = [];
  for (const targetFile of TARGET_TEXT_FILES) {
    const absolutePath = path.resolve(PROJECT_ROOT, targetFile);
    if (!fs.existsSync(absolutePath)) continue;

    const currentContent = fs.readFileSync(absolutePath, "utf8");
    const replacementResult = replaceMediaReferencesInContent(currentContent, filesByCandidate);
    const changed = writeFileIfChanged(targetFile, replacementResult.content);
    fileUpdateResults.push({
      filePath: targetFile,
      changed,
      replacements: replacementResult.replacements,
    });
  }

  console.log("");
  console.log("Arquivos atualizados:");
  fileUpdateResults.forEach((result) => {
    console.log(
      `- ${result.filePath}: ${result.changed ? "alterado" : "sem mudança"} (${result.replacements} substituições)`
    );
  });

  const report = {
    bucket: config.bucket,
    storagePrefix: config.prefix,
    migratedAt: new Date().toISOString(),
    totalFiles: uploadedFiles.length,
    filesByCategory: uploadedFiles.reduce((acc, file) => {
      acc[file.category] = (acc[file.category] || 0) + 1;
      return acc;
    }, {}),
    updatedFiles: fileUpdateResults,
  };

  console.log("");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error && error.message ? error.message : error);
  process.exitCode = 1;
});
