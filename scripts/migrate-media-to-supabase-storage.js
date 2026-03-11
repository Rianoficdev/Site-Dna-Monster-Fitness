const fs = require("fs");
const path = require("path");
const { prisma } = require("../src/config/prisma");
const { STORE_FILE_PATH } = require("../src/shared/inMemoryStore");
const {
  ensureBucketExists,
  getSupabaseStorageConfig,
  isSupabaseStorageEnabled,
  uploadLocalFileToSupabaseStorage,
} = require("../src/modules/uploads/uploads.storage");

function normalizeLegacyMediaUrl(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";

  if (rawValue.startsWith("/uploads/media/")) {
    return rawValue;
  }

  if (rawValue.toLowerCase().startsWith("uploads/media/")) {
    return `/${rawValue.replace(/^\/+/, "")}`;
  }

  if (/^https?:\/\//i.test(rawValue)) {
    try {
      const parsed = new URL(rawValue);
      const pathname = String(parsed.pathname || "").trim();
      if (pathname.startsWith("/uploads/media/")) {
        return pathname;
      }
    } catch (_error) {
      return "";
    }
  }

  return "";
}

function collectLegacyMediaUrls(value, targetSet) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectLegacyMediaUrls(item, targetSet));
    return;
  }

  if (!value || typeof value !== "object") {
    const normalized = normalizeLegacyMediaUrl(value);
    if (normalized) targetSet.add(normalized);
    return;
  }

  Object.values(value).forEach((item) => collectLegacyMediaUrls(item, targetSet));
}

function replaceLegacyMediaUrls(value, urlMap) {
  if (Array.isArray(value)) {
    let changed = false;
    const nextArray = value.map((item) => {
      const nextItem = replaceLegacyMediaUrls(item, urlMap);
      if (nextItem !== item) changed = true;
      return nextItem;
    });
    return changed ? nextArray : value;
  }

  if (!value || typeof value !== "object") {
    const normalized = normalizeLegacyMediaUrl(value);
    if (!normalized) return value;
    return urlMap.get(normalized) || value;
  }

  let changed = false;
  const nextObject = {};
  Object.entries(value).forEach(([key, item]) => {
    const nextItem = replaceLegacyMediaUrls(item, urlMap);
    if (nextItem !== item) changed = true;
    nextObject[key] = nextItem;
  });

  return changed ? nextObject : value;
}

function buildObjectPathFromLegacyUrl(legacyUrl) {
  return String(legacyUrl || "").trim().replace(/^\/+/, "");
}

function buildLocalFilePathFromLegacyUrl(legacyUrl) {
  return path.resolve(process.cwd(), buildObjectPathFromLegacyUrl(legacyUrl));
}

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJsonFile(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function collectDatabaseMediaState() {
  const [
    users,
    exercises,
    workouts,
    workoutCompletions,
  ] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        avatarUrl: true,
      },
    }),
    prisma.exercise.findMany({
      select: {
        id: true,
        animationUrl: true,
        imageUrl: true,
        videoUrl: true,
      },
    }),
    prisma.workout.findMany({
      select: {
        id: true,
        coverImageUrl: true,
      },
    }),
    prisma.workoutCompletion.findMany({
      select: {
        id: true,
        thumbnailUrl: true,
        coverImageUrl: true,
        snapshot: true,
      },
    }),
  ]);

  const urls = new Set();
  collectLegacyMediaUrls(users, urls);
  collectLegacyMediaUrls(exercises, urls);
  collectLegacyMediaUrls(workouts, urls);
  collectLegacyMediaUrls(workoutCompletions, urls);

  return {
    urls,
    users,
    exercises,
    workouts,
    workoutCompletions,
  };
}

async function uploadReferencedFiles(legacyUrls) {
  const mapping = new Map();
  const missing = [];
  const uploaded = [];

  for (const legacyUrl of legacyUrls) {
    const localFilePath = buildLocalFilePathFromLegacyUrl(legacyUrl);
    if (!fs.existsSync(localFilePath)) {
      missing.push(legacyUrl);
      continue;
    }

    const uploadedMedia = await uploadLocalFileToSupabaseStorage({
      filePath: localFilePath,
      objectPath: buildObjectPathFromLegacyUrl(legacyUrl),
    });

    mapping.set(legacyUrl, uploadedMedia.publicUrl);
    uploaded.push({
      legacyUrl,
      publicUrl: uploadedMedia.publicUrl,
    });
  }

  return {
    mapping,
    missing,
    uploaded,
  };
}

async function updateDatabaseUrls(databaseState, urlMap) {
  let updatedUsers = 0;
  let updatedExercises = 0;
  let updatedWorkouts = 0;
  let updatedWorkoutCompletions = 0;

  for (const user of databaseState.users) {
    const nextAvatarUrl = replaceLegacyMediaUrls(user.avatarUrl, urlMap);
    if (nextAvatarUrl === user.avatarUrl) continue;
    await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: nextAvatarUrl },
    });
    updatedUsers += 1;
  }

  for (const exercise of databaseState.exercises) {
    const nextAnimationUrl = replaceLegacyMediaUrls(exercise.animationUrl, urlMap);
    const nextImageUrl = replaceLegacyMediaUrls(exercise.imageUrl, urlMap);
    const nextVideoUrl = replaceLegacyMediaUrls(exercise.videoUrl, urlMap);
    if (
      nextAnimationUrl === exercise.animationUrl &&
      nextImageUrl === exercise.imageUrl &&
      nextVideoUrl === exercise.videoUrl
    ) {
      continue;
    }

    await prisma.exercise.update({
      where: { id: exercise.id },
      data: {
        animationUrl: nextAnimationUrl,
        imageUrl: nextImageUrl,
        videoUrl: nextVideoUrl,
      },
    });
    updatedExercises += 1;
  }

  for (const workout of databaseState.workouts) {
    const nextCoverImageUrl = replaceLegacyMediaUrls(workout.coverImageUrl, urlMap);
    if (nextCoverImageUrl === workout.coverImageUrl) continue;
    await prisma.workout.update({
      where: { id: workout.id },
      data: { coverImageUrl: nextCoverImageUrl },
    });
    updatedWorkouts += 1;
  }

  for (const workoutCompletion of databaseState.workoutCompletions) {
    const nextThumbnailUrl = replaceLegacyMediaUrls(workoutCompletion.thumbnailUrl, urlMap);
    const nextCoverImageUrl = replaceLegacyMediaUrls(workoutCompletion.coverImageUrl, urlMap);
    const nextSnapshot = replaceLegacyMediaUrls(workoutCompletion.snapshot, urlMap);

    if (
      nextThumbnailUrl === workoutCompletion.thumbnailUrl &&
      nextCoverImageUrl === workoutCompletion.coverImageUrl &&
      nextSnapshot === workoutCompletion.snapshot
    ) {
      continue;
    }

    await prisma.workoutCompletion.update({
      where: { id: workoutCompletion.id },
      data: {
        thumbnailUrl: nextThumbnailUrl,
        coverImageUrl: nextCoverImageUrl,
        snapshot: nextSnapshot,
      },
    });
    updatedWorkoutCompletions += 1;
  }

  return {
    updatedUsers,
    updatedExercises,
    updatedWorkouts,
    updatedWorkoutCompletions,
  };
}

function updateInMemoryStore(urlMap) {
  if (!fs.existsSync(STORE_FILE_PATH)) {
    return {
      changed: false,
    };
  }

  const currentStore = readJsonFile(STORE_FILE_PATH);
  const nextStore = replaceLegacyMediaUrls(currentStore, urlMap);
  if (nextStore === currentStore) {
    return {
      changed: false,
    };
  }

  writeJsonFile(STORE_FILE_PATH, nextStore);
  return {
    changed: true,
  };
}

async function main() {
  if (!isSupabaseStorageEnabled()) {
    const config = getSupabaseStorageConfig();
    throw new Error(
      [
        "Supabase Storage nao esta habilitado.",
        `SUPABASE_STORAGE_ENABLED=${config.enabled}`,
        `SUPABASE_URL configurado=${Boolean(config.url)}`,
        `SUPABASE auth key configurada=${Boolean(config.authKey)}`,
      ].join(" ")
    );
  }

  await ensureBucketExists();

  const jsonUrls = new Set();
  if (fs.existsSync(STORE_FILE_PATH)) {
    collectLegacyMediaUrls(readJsonFile(STORE_FILE_PATH), jsonUrls);
  }

  const databaseState = await collectDatabaseMediaState();
  const referencedLegacyUrls = Array.from(
    new Set([...jsonUrls, ...databaseState.urls].filter(Boolean))
  ).sort();

  if (!referencedLegacyUrls.length) {
    console.log("Nenhuma URL local de /uploads/media foi encontrada para migrar.");
    return;
  }

  console.log(`Encontradas ${referencedLegacyUrls.length} URLs locais para migracao.`);

  const uploadResult = await uploadReferencedFiles(referencedLegacyUrls);
  const storeResult = updateInMemoryStore(uploadResult.mapping);
  const databaseResult = await updateDatabaseUrls(databaseState, uploadResult.mapping);

  console.log(`Arquivos enviados ao Supabase Storage: ${uploadResult.uploaded.length}`);
  console.log(`Arquivos locais ausentes: ${uploadResult.missing.length}`);
  console.log(`Store JSON atualizado: ${storeResult.changed ? "sim" : "nao"}`);
  console.log(`Usuarios atualizados: ${databaseResult.updatedUsers}`);
  console.log(`Exercicios atualizados: ${databaseResult.updatedExercises}`);
  console.log(`Treinos atualizados: ${databaseResult.updatedWorkouts}`);
  console.log(`Historico de treino atualizado: ${databaseResult.updatedWorkoutCompletions}`);

  if (uploadResult.missing.length) {
    console.log("Arquivos ausentes:");
    uploadResult.missing.forEach((legacyUrl) => {
      console.log(`- ${legacyUrl}`);
    });
  }
}

main()
  .catch((error) => {
    console.error(error && error.message ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
