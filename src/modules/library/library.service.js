const { AppError } = require("../../utils/AppError");

const ALLOWED_GROUPS = new Set([
  "peito",
  "costas",
  "ombros",
  "biceps",
  "triceps",
  "antebraco",
  "abdomen",
  "lombar",
  "gluteos",
  "quadriceps",
  "posterior",
  "adutores",
  "abdutores",
  "panturrilhas",
  "geral",
]);

const ALLOWED_LEVELS = new Set(["iniciante", "intermediario", "avancado"]);
const ALLOWED_TYPES = new Set(["forca", "cardio", "mobilidade", "funcional", "resistencia", "geral"]);
const ADMIN_ROLES = new Set(["ADMIN", "ADMIN_GERAL"]);
const INSTRUCTOR_ROLE = "INSTRUTOR";
const STUDENT_ROLE = "ALUNO";

function createLibraryService({
  libraryRepository,
  libraryDatabaseRepository,
  workoutsRepository,
  exercisesRepository
}) {
  function normalizeRole(role) {
    const normalized = String(role || "").trim().toUpperCase();
    if (normalized === "INSTRUCTOR") return INSTRUCTOR_ROLE;
    if (normalized === "STUDENT") return STUDENT_ROLE;
    return normalized;
  }

  function normalizeString(value) {
    return String(value || "").trim();
  }

  function normalizeBoolean(value, fallback = false) {
    if (value === undefined || value === null || value === "") return fallback;
    if (value === true || value === false) return value;
    if (typeof value === "string") return value.trim().toLowerCase() === "true";
    return Boolean(value);
  }

  function normalizeId(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0;
  }

  function normalizeInteger(value, fallback = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.trunc(parsed);
  }

  function normalizeDecimal(value, fallback = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Number(parsed);
  }

  function normalizeStringList(value, { splitCommas = true } = {}) {
    if (Array.isArray(value)) {
      return value
        .map((item) => normalizeString(item).replace(/^[\-\*]\s*/, "").replace(/^\d+[\.\)\-:]\s*/, ""))
        .filter(Boolean);
    }

    const raw = normalizeString(value);
    if (!raw) return [];

    const pattern = splitCommas ? /\r?\n|[,;]+/ : /\r?\n+/;
    return raw
      .split(pattern)
      .map((item) => normalizeString(item).replace(/^[\-\*]\s*/, "").replace(/^\d+[\.\)\-:]\s*/, ""))
      .filter(Boolean);
  }

  function normalizeIntensityScore(value, fallback = 3) {
    const parsed = normalizeInteger(value, fallback);
    return Math.max(1, Math.min(5, parsed));
  }

  function normalizeGroup(group) {
    const normalized = normalizeString(group).toLowerCase();
    return ALLOWED_GROUPS.has(normalized) ? normalized : "geral";
  }

  function normalizeLevel(level) {
    const normalized = normalizeString(level).toLowerCase();
    return ALLOWED_LEVELS.has(normalized) ? normalized : "intermediario";
  }

  function normalizeType(type) {
    const normalized = normalizeString(type).toLowerCase();
    return ALLOWED_TYPES.has(normalized) ? normalized : "forca";
  }

  function ensureAuthenticated(authUser) {
    const role = normalizeRole(authUser && authUser.role);
    const userId = normalizeId(authUser && authUser.id);
    if (!role || !userId) {
      throw new AppError("Usuario nao autenticado.", 401, "UNAUTHORIZED");
    }

    return {
      role,
      userId,
    };
  }

  function ensureLibraryAdmin(authUser) {
    const actor = ensureAuthenticated(authUser);
    if (!ADMIN_ROLES.has(actor.role)) {
      throw new AppError(
        "Somente ADMIN e ADMIN_GERAL podem gerenciar a biblioteca de exercicios.",
        403,
        "FORBIDDEN"
      );
    }
    return actor;
  }

  async function listStudentExerciseIdsFromWorkouts(studentId) {
    if (!workoutsRepository || !exercisesRepository) return [];
    if (typeof workoutsRepository.findByStudentId !== "function") return [];

    const workouts = await workoutsRepository.findByStudentId(studentId);
    const workoutIds = (Array.isArray(workouts) ? workouts : [])
      .map((workout) => normalizeId(workout && workout.id))
      .filter(Boolean);

    if (!workoutIds.length) return [];

    let workoutExercises = [];
    if (typeof exercisesRepository.listByWorkoutIds === "function") {
      workoutExercises = await exercisesRepository.listByWorkoutIds(workoutIds);
    } else if (typeof exercisesRepository.listByWorkoutId === "function") {
      const groupedExercises = await Promise.all(
        workoutIds.map((workoutId) => exercisesRepository.listByWorkoutId(workoutId))
      );
      workoutExercises = groupedExercises.flatMap((items) => (Array.isArray(items) ? items : []));
    }

    const ids = new Set();
    (Array.isArray(workoutExercises) ? workoutExercises : []).forEach((exercise) => {
      const exerciseId = normalizeId(
        exercise && (exercise.exerciseId || exercise.exercise_id || exercise.libraryExerciseId)
      );
      if (exerciseId) ids.add(exerciseId);
    });

    return Array.from(ids);
  }

  function hasDatabaseRepository() {
    return Boolean(
      libraryDatabaseRepository &&
      typeof libraryDatabaseRepository.createLibraryExercise === "function"
    );
  }

  async function syncDatabaseExerciseRecord(exercise) {
    if (!hasDatabaseRepository() || !exercise) return exercise;
    const exerciseId = normalizeId(exercise.id);
    if (!exerciseId) return exercise;

    const existing = await libraryDatabaseRepository.findById(exerciseId, { includeInactive: true });
    if (existing) {
      return libraryDatabaseRepository.updateLibraryExercise(exerciseId, exercise);
    }

    return libraryDatabaseRepository.createLibraryExercise({
      ...exercise,
      id: exerciseId,
    });
  }

  function syncMemoryExerciseRecord(exercise) {
    if (!exercise || !libraryRepository) return;
    const exerciseId = normalizeId(exercise.id);
    if (!exerciseId) return;

    if (typeof libraryRepository.findById !== "function") return;

    const existing = libraryRepository.findById(exerciseId, { includeInactive: true });
    if (existing && typeof libraryRepository.updateLibraryExercise === "function") {
      libraryRepository.updateLibraryExercise(exerciseId, exercise);
      return;
    }

    if (typeof libraryRepository.createLibraryExercise === "function") {
      libraryRepository.createLibraryExercise({
        ...exercise,
        id: exerciseId,
      });
    }
  }

  function removeMemoryExerciseRecord(exerciseId) {
    if (!libraryRepository || typeof libraryRepository.deleteLibraryExercise !== "function") return;
    const normalizedExerciseId = normalizeId(exerciseId);
    if (!normalizedExerciseId) return;
    libraryRepository.deleteLibraryExercise(normalizedExerciseId);
  }

  async function bootstrapDatabaseFromMemory({ includeInactive = false } = {}) {
    if (!hasDatabaseRepository() || !libraryRepository) return;
    if (
      typeof libraryRepository.listLibraryExercises !== "function" ||
      typeof libraryDatabaseRepository.listLibraryExercises !== "function"
    ) {
      return;
    }

    const dbList = await libraryDatabaseRepository.listLibraryExercises({ includeInactive: true });
    if (Array.isArray(dbList) && dbList.length) return;

    const memoryList = libraryRepository.listLibraryExercises({ includeInactive: true });
    const safeList = Array.isArray(memoryList) ? memoryList : [];
    for (const exercise of safeList) {
      try {
        await syncDatabaseExerciseRecord(exercise);
      } catch (_error) {
        // ignore bootstrap single-item error to keep API responsive
      }
    }

  }

  async function mergeDatabaseExercisesWithMemoryMedia(exercises) {
    const list = Array.isArray(exercises) ? exercises : [];
    if (!list.length || !libraryRepository || typeof libraryRepository.listLibraryExercises !== "function") {
      return list;
    }

    const memoryList = libraryRepository.listLibraryExercises({ includeInactive: true });
    const memoryById = new Map(
      (Array.isArray(memoryList) ? memoryList : [])
        .map((item) => [normalizeId(item && item.id), item])
        .filter(([id]) => id > 0)
    );

    const merged = [];
    for (const exercise of list) {
      const id = normalizeId(exercise && exercise.id);
      const memoryExercise = memoryById.get(id);
      if (!memoryExercise) {
        merged.push(exercise);
        continue;
      }

      const dbImageUrl = normalizeString(exercise && exercise.imageUrl);
      const dbVideoUrl = normalizeString(exercise && exercise.videoUrl);
      const memoryImageUrl = normalizeString(memoryExercise && memoryExercise.imageUrl);
      const memoryVideoUrl = normalizeString(memoryExercise && memoryExercise.videoUrl);
      const dbSeriesRaw =
        exercise &&
        (
          exercise.seriesCount !== undefined
            ? exercise.seriesCount
            : exercise.series !== undefined
              ? exercise.series
              : exercise.series_count
        );
      const memorySeriesRaw =
        memoryExercise &&
        (
          memoryExercise.seriesCount !== undefined
            ? memoryExercise.seriesCount
            : memoryExercise.series !== undefined
              ? memoryExercise.series
              : memoryExercise.series_count
        );
      const dbSeriesCount = Math.max(1, normalizeInteger(dbSeriesRaw, 3));
      const hasMemorySeries =
        memorySeriesRaw !== undefined &&
        memorySeriesRaw !== null &&
        String(memorySeriesRaw).trim() !== "";
      const mergedSeriesCount = hasMemorySeries
        ? Math.max(1, normalizeInteger(memorySeriesRaw, dbSeriesCount))
        : dbSeriesCount;

      const needsImageFix = !dbImageUrl && !!memoryImageUrl;
      const needsVideoFix = !dbVideoUrl && !!memoryVideoUrl;

      const nextExercise = {
        ...exercise,
        seriesCount: mergedSeriesCount,
        series: mergedSeriesCount,
        series_count: mergedSeriesCount,
        imageUrl: needsImageFix ? memoryImageUrl : dbImageUrl,
        image_url: needsImageFix ? memoryImageUrl : exercise && exercise.image_url,
        videoUrl: needsVideoFix ? memoryVideoUrl : dbVideoUrl,
        video_url: needsVideoFix ? memoryVideoUrl : exercise && exercise.video_url,
      };
      merged.push(nextExercise);

      if (hasDatabaseRepository() && (needsImageFix || needsVideoFix)) {
        try {
          await libraryDatabaseRepository.updateLibraryExercise(id, {
            imageUrl: nextExercise.imageUrl,
            videoUrl: nextExercise.videoUrl,
          });
        } catch (_) {
          // keep response working even if persistence retry fails
        }
      }
    }

    return merged;
  }

  function buildLibraryPayload(
    {
      name,
      muscleGroup,
      muscle_group,
      group,
      description,
      animationUrl,
      animation_url,
      tutorialText,
      tutorial_text,
      level,
      type,
      isActive,
      is_active,
      imageUrl,
      videoUrl,
      seriesCount,
      series,
      series_count,
      repetitions,
      durationSeconds,
      restSeconds,
      caloriesEstimate,
      calories_estimate,
      calories,
      kcal,
      loadKg,
      musclesWorked,
      muscles_worked,
      muscles,
      intensityScore,
      intensity_score,
      intensity,
      tutorialSteps,
      tutorial_steps,
      instructionsList,
      instructions_list,
      importantTips,
      important_tips,
    },
    { partial = false } = {}
  ) {
    const payload = {};

    if (!partial || name !== undefined) {
      const normalizedName = normalizeString(name);
      if (!normalizedName) {
        throw new AppError("Campo obrigatorio: name.", 400, "VALIDATION_ERROR");
      }
      payload.name = normalizedName;
    }

    if (!partial || description !== undefined) {
      const normalizedDescription = normalizeString(description);
      if (!normalizedDescription) {
        throw new AppError("Campo obrigatorio: description.", 400, "VALIDATION_ERROR");
      }
      payload.description = normalizedDescription;
    }

    if (!partial || muscleGroup !== undefined || muscle_group !== undefined || group !== undefined) {
      payload.muscleGroup = normalizeGroup(muscleGroup || muscle_group || group);
      payload.group = payload.muscleGroup;
    }

    if (!partial || animationUrl !== undefined || animation_url !== undefined || videoUrl !== undefined || imageUrl !== undefined) {
      payload.animationUrl = normalizeString(animationUrl || animation_url || videoUrl || imageUrl);
    }

    if (!partial || tutorialText !== undefined || tutorial_text !== undefined || description !== undefined) {
      const fallbackText = payload.description || normalizeString(description);
      payload.tutorialText = normalizeString(tutorialText || tutorial_text || fallbackText);
    }

    if (!partial || level !== undefined) {
      payload.level = normalizeLevel(level);
    }

    if (!partial || type !== undefined) {
      payload.type = normalizeType(type);
    }

    if (!partial || imageUrl !== undefined) {
      payload.imageUrl = normalizeString(imageUrl);
    }

    if (!partial || videoUrl !== undefined || animationUrl !== undefined || animation_url !== undefined) {
      payload.videoUrl = normalizeString(videoUrl || animationUrl || animation_url);
    }

    if (!partial || seriesCount !== undefined || series !== undefined || series_count !== undefined) {
      payload.seriesCount = Math.max(
        1,
        normalizeInteger(
          seriesCount !== undefined
            ? seriesCount
            : series !== undefined
              ? series
              : series_count,
          3
        )
      );
      payload.series = payload.seriesCount;
      payload.series_count = payload.seriesCount;
    }

    if (!partial || repetitions !== undefined) {
      payload.repetitions = Math.max(1, normalizeInteger(repetitions, 10));
    }

    if (!partial || durationSeconds !== undefined) {
      payload.durationSeconds = Math.max(10, normalizeInteger(durationSeconds, 60));
    }

    if (!partial || restSeconds !== undefined) {
      payload.restSeconds = Math.max(0, normalizeInteger(restSeconds, 30));
    }

    if (
      !partial ||
      caloriesEstimate !== undefined ||
      calories_estimate !== undefined ||
      calories !== undefined ||
      kcal !== undefined
    ) {
      payload.caloriesEstimate = Math.max(
        0,
        normalizeInteger(
          caloriesEstimate !== undefined
            ? caloriesEstimate
            : calories_estimate !== undefined
              ? calories_estimate
              : calories !== undefined
                ? calories
                : kcal,
          0
        )
      );
    }

    if (!partial || loadKg !== undefined) {
      payload.loadKg = Math.max(0, normalizeDecimal(loadKg, 0));
    }

    if (!partial || musclesWorked !== undefined || muscles_worked !== undefined || muscles !== undefined) {
      payload.musclesWorked = normalizeStringList(
        musclesWorked !== undefined
          ? musclesWorked
          : muscles_worked !== undefined
            ? muscles_worked
            : muscles
      );
    }

    if (!partial || intensityScore !== undefined || intensity_score !== undefined || intensity !== undefined) {
      payload.intensityScore = normalizeIntensityScore(
        intensityScore !== undefined
          ? intensityScore
          : intensity_score !== undefined
            ? intensity_score
            : intensity,
        3
      );
    }

    if (
      !partial ||
      tutorialSteps !== undefined ||
      tutorial_steps !== undefined ||
      instructionsList !== undefined ||
      instructions_list !== undefined
    ) {
      payload.tutorialSteps = normalizeStringList(
        tutorialSteps !== undefined
          ? tutorialSteps
          : tutorial_steps !== undefined
            ? tutorial_steps
            : instructionsList !== undefined
              ? instructionsList
              : instructions_list,
        { splitCommas: false }
      );
    }

    if (!partial || importantTips !== undefined || important_tips !== undefined) {
      payload.importantTips = normalizeStringList(
        importantTips !== undefined ? importantTips : important_tips,
        { splitCommas: false }
      );
    }

    if (isActive !== undefined || is_active !== undefined) {
      payload.isActive = normalizeBoolean(
        isActive !== undefined ? isActive : is_active,
        true
      );
    }

    return payload;
  }

  async function listLibraryExercises({ authUser, includeInactive = false } = {}) {
    const actor = ensureAuthenticated(authUser);
    const shouldIncludeInactive = normalizeBoolean(includeInactive, false);
    const databaseEnabled = hasDatabaseRepository();
    const syncListToMemory = (items) => {
      (Array.isArray(items) ? items : []).forEach((exercise) => {
        try {
          syncMemoryExerciseRecord(exercise);
        } catch (_) {
          // keep listing resilient even if one sync item fails
        }
      });
    };

    if (ADMIN_ROLES.has(actor.role)) {
      if (databaseEnabled) {
        await bootstrapDatabaseFromMemory({ includeInactive: true });
        const exercises = await libraryDatabaseRepository.listLibraryExercises({
          includeInactive: shouldIncludeInactive,
        });
        const merged = await mergeDatabaseExercisesWithMemoryMedia(exercises);
        syncListToMemory(merged);
        return merged;
      }
      return libraryRepository.listLibraryExercises({ includeInactive: shouldIncludeInactive });
    }

    if (actor.role === INSTRUCTOR_ROLE) {
      if (databaseEnabled) {
        await bootstrapDatabaseFromMemory({ includeInactive: false });
        const exercises = await libraryDatabaseRepository.listLibraryExercises({ includeInactive: false });
        const merged = await mergeDatabaseExercisesWithMemoryMedia(exercises);
        syncListToMemory(merged);
        return merged;
      }
      return libraryRepository.listLibraryExercises({ includeInactive: false });
    }

    if (actor.role === STUDENT_ROLE) {
      if (databaseEnabled) {
        await bootstrapDatabaseFromMemory({ includeInactive: false });
        const exercises = await libraryDatabaseRepository.listLibraryExercises({ includeInactive: false });
        const merged = await mergeDatabaseExercisesWithMemoryMedia(exercises);
        syncListToMemory(merged);
        return merged;
      }
      return libraryRepository.listLibraryExercises({ includeInactive: false });
    }

    throw new AppError("Acesso negado para este perfil.", 403, "FORBIDDEN");
  }

  async function createLibraryExercise(input) {
    const actor = ensureLibraryAdmin(input && input.authUser);
    const payload = buildLibraryPayload(input || {}, { partial: false });

    const dataToCreate = {
      ...payload,
      createdById: actor.userId,
      createdByRole: actor.role,
      isActive: payload.isActive !== false,
    };

    if (hasDatabaseRepository()) {
      const created = await libraryDatabaseRepository.createLibraryExercise(dataToCreate);
      const createdWithSeries =
        payload.seriesCount !== undefined
          ? {
            ...created,
            seriesCount: Math.max(1, normalizeInteger(payload.seriesCount, 3)),
            series: Math.max(1, normalizeInteger(payload.seriesCount, 3)),
            series_count: Math.max(1, normalizeInteger(payload.seriesCount, 3)),
          }
          : created;
      syncMemoryExerciseRecord(createdWithSeries);
      return createdWithSeries;
    }

    return libraryRepository.createLibraryExercise(dataToCreate);
  }

  async function updateLibraryExercise({ authUser, exerciseId, ...data }) {
    ensureLibraryAdmin(authUser);

    const normalizedExerciseId = normalizeId(exerciseId);
    if (!normalizedExerciseId) {
      throw new AppError("Campo obrigatorio: exerciseId.", 400, "VALIDATION_ERROR");
    }

    const existing = hasDatabaseRepository()
      ? await libraryDatabaseRepository.findById(normalizedExerciseId, { includeInactive: true })
      : libraryRepository.findById(normalizedExerciseId, { includeInactive: true });
    if (!existing) {
      throw new AppError("Exercicio da biblioteca nao encontrado.", 404, "LIBRARY_EXERCISE_NOT_FOUND");
    }

    const payload = buildLibraryPayload(data || {}, { partial: true });
    if (!Object.keys(payload).length) {
      throw new AppError("Nenhum campo valido informado para atualizacao.", 400, "VALIDATION_ERROR");
    }

    const updated = hasDatabaseRepository()
      ? await libraryDatabaseRepository.updateLibraryExercise(normalizedExerciseId, payload)
      : libraryRepository.updateLibraryExercise(normalizedExerciseId, payload);
    if (!updated) {
      throw new AppError("Exercicio da biblioteca nao encontrado.", 404, "LIBRARY_EXERCISE_NOT_FOUND");
    }

    const updatedWithSeries =
      payload.seriesCount !== undefined
        ? {
          ...updated,
          seriesCount: Math.max(1, normalizeInteger(payload.seriesCount, 3)),
          series: Math.max(1, normalizeInteger(payload.seriesCount, 3)),
          series_count: Math.max(1, normalizeInteger(payload.seriesCount, 3)),
        }
        : updated;

    syncMemoryExerciseRecord(updatedWithSeries);

    return updatedWithSeries;
  }

  async function setLibraryExerciseStatus({ authUser, exerciseId, isActive }) {
    ensureLibraryAdmin(authUser);

    const normalizedExerciseId = normalizeId(exerciseId);
    if (!normalizedExerciseId) {
      throw new AppError("Campo obrigatorio: exerciseId.", 400, "VALIDATION_ERROR");
    }

    const updated = hasDatabaseRepository()
      ? await libraryDatabaseRepository.updateLibraryExerciseStatus(
        normalizedExerciseId,
        normalizeBoolean(isActive, false)
      )
      : libraryRepository.updateLibraryExerciseStatus(
        normalizedExerciseId,
        normalizeBoolean(isActive, false)
      );
    if (!updated) {
      throw new AppError("Exercicio da biblioteca nao encontrado.", 404, "LIBRARY_EXERCISE_NOT_FOUND");
    }

    syncMemoryExerciseRecord(updated);

    return updated;
  }

  async function deleteLibraryExercise({ authUser, exerciseId }) {
    ensureLibraryAdmin(authUser);

    const normalizedExerciseId = normalizeId(exerciseId);
    if (!normalizedExerciseId) {
      throw new AppError("Campo obrigatorio: exerciseId.", 400, "VALIDATION_ERROR");
    }

    const removed = hasDatabaseRepository()
      ? await libraryDatabaseRepository.deleteLibraryExercise(normalizedExerciseId)
      : libraryRepository.deleteLibraryExercise(normalizedExerciseId);
    if (!removed) {
      throw new AppError("Exercicio da biblioteca nao encontrado.", 404, "LIBRARY_EXERCISE_NOT_FOUND");
    }

    removeMemoryExerciseRecord(normalizedExerciseId);

    return removed;
  }

  return {
    listLibraryExercises,
    createLibraryExercise,
    updateLibraryExercise,
    setLibraryExerciseStatus,
    deleteLibraryExercise,
  };
}

module.exports = {
  createLibraryService,
};
