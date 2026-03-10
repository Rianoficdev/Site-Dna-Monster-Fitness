const { persistInMemoryStore } = require("../../shared/inMemoryStore");

function createLibraryRepository(store) {
  function normalizeName(name) {
    return String(name || "").trim().toLowerCase();
  }

  function normalizeString(value) {
    return String(value || "").trim();
  }

  function normalizeGroup(group) {
    return normalizeString(group).toLowerCase();
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
        .map((item) =>
          normalizeString(item)
            .replace(/^[\-\*]\s*/, "")
            .replace(/^\d+[\.\)\-:]\s*/, "")
        )
        .filter(Boolean);
    }

    const raw = normalizeString(value);
    if (!raw) return [];

    const pattern = splitCommas ? /\r?\n|[,;]+/ : /\r?\n+/;
    return raw
      .split(pattern)
      .map((item) =>
        normalizeString(item)
          .replace(/^[\-\*]\s*/, "")
          .replace(/^\d+[\.\)\-:]\s*/, "")
      )
      .filter(Boolean);
  }

  function normalizeIntensityScore(value, fallback = 3) {
    const parsed = normalizeInteger(value, fallback);
    return Math.max(1, Math.min(5, parsed));
  }

  function normalizeLibraryExercisePayload(data = {}) {
    const name = normalizeString(data.name);
    const description = normalizeString(data.description);
    const muscleGroup = normalizeString(
      data.muscleGroup || data.muscle_group || data.group || "geral"
    ).toLowerCase();
    const animationUrl = normalizeString(
      data.animationUrl || data.animation_url || data.videoUrl || data.imageUrl
    );
    const tutorialText = normalizeString(
      data.tutorialText || data.tutorial_text || data.description
    );
    const level = normalizeString(data.level || "intermediario").toLowerCase();
    const type = normalizeString(data.type || "forca").toLowerCase();
    const hasModernIsActive = Object.prototype.hasOwnProperty.call(data, "isActive");
    const hasLegacyIsActive = Object.prototype.hasOwnProperty.call(data, "is_active");
    let isActive = true;
    if (hasModernIsActive) {
      isActive = data.isActive !== false;
    } else if (hasLegacyIsActive) {
      isActive = data.is_active !== false;
    }
    const repetitions = Math.max(1, normalizeInteger(data.repetitions, 10));
    const seriesCount = Math.max(
      1,
      normalizeInteger(
        data.seriesCount !== undefined
          ? data.seriesCount
          : data.series !== undefined
            ? data.series
            : data.series_count,
        3
      )
    );
    const durationSeconds = Math.max(10, normalizeInteger(data.durationSeconds, 60));
    const restSeconds = Math.max(0, normalizeInteger(data.restSeconds, 30));
    const caloriesEstimate = Math.max(
      0,
      normalizeInteger(
        data.caloriesEstimate !== undefined
          ? data.caloriesEstimate
          : data.calories_estimate !== undefined
            ? data.calories_estimate
            : data.calories !== undefined
              ? data.calories
              : data.kcal,
        0
      )
    );
    const loadKg = Math.max(0, normalizeDecimal(data.loadKg, 0));
    const musclesWorked = normalizeStringList(
      data.musclesWorked !== undefined
        ? data.musclesWorked
        : data.muscles_worked !== undefined
          ? data.muscles_worked
          : data.muscles
    );
    const intensityScore = normalizeIntensityScore(
      data.intensityScore !== undefined
        ? data.intensityScore
        : data.intensity_score !== undefined
          ? data.intensity_score
          : data.intensity,
      3
    );
    const tutorialSteps = normalizeStringList(
      data.tutorialSteps !== undefined
        ? data.tutorialSteps
        : data.tutorial_steps !== undefined
          ? data.tutorial_steps
          : data.instructionsList,
      { splitCommas: false }
    );
    const importantTips = normalizeStringList(
      data.importantTips !== undefined
        ? data.importantTips
        : data.important_tips !== undefined
          ? data.important_tips
          : data.tips,
      { splitCommas: false }
    );

    return {
      name,
      muscleGroup,
      description,
      animationUrl,
      tutorialText,
      level,
      type,
      isActive,
      group: muscleGroup,
      imageUrl: normalizeString(data.imageUrl),
      videoUrl: normalizeString(data.videoUrl || data.animationUrl || data.animation_url),
      seriesCount,
      series: seriesCount,
      series_count: seriesCount,
      repetitions,
      durationSeconds,
      restSeconds,
      caloriesEstimate,
      loadKg,
      musclesWorked,
      intensityScore,
      tutorialSteps,
      importantTips,
      createdById: Number(data.createdById) || 0,
      createdByRole: normalizeString(data.createdByRole || "INSTRUTOR").toUpperCase(),
    };
  }

  function withCompatibilityFields(exercise) {
    if (!exercise) return null;

    const createdById = Number(exercise.createdById || exercise.created_by || 0) || 0;
    const createdByRole = normalizeString(exercise.createdByRole || exercise.created_by_role).toUpperCase();
    const musclesWorked = normalizeStringList(
      exercise.musclesWorked !== undefined
        ? exercise.musclesWorked
        : exercise.muscles_worked !== undefined
          ? exercise.muscles_worked
          : exercise.muscles
    );
    const tutorialSteps = normalizeStringList(
      exercise.tutorialSteps !== undefined
        ? exercise.tutorialSteps
        : exercise.tutorial_steps !== undefined
          ? exercise.tutorial_steps
          : exercise.instructions_list,
      { splitCommas: false }
    );
    const importantTips = normalizeStringList(
      exercise.importantTips !== undefined
        ? exercise.importantTips
        : exercise.important_tips !== undefined
          ? exercise.important_tips
          : exercise.tips,
      { splitCommas: false }
    );
    const intensityScore = normalizeIntensityScore(
      exercise.intensityScore !== undefined
        ? exercise.intensityScore
        : exercise.intensity_score !== undefined
          ? exercise.intensity_score
          : exercise.intensity,
      3
    );
    const seriesCount = Math.max(
      1,
      normalizeInteger(
        exercise.seriesCount !== undefined
          ? exercise.seriesCount
          : exercise.series !== undefined
            ? exercise.series
            : exercise.series_count,
        3
      )
    );
    const caloriesEstimate = Math.max(
      0,
      normalizeInteger(
        exercise.caloriesEstimate !== undefined
          ? exercise.caloriesEstimate
          : exercise.calories_estimate !== undefined
            ? exercise.calories_estimate
            : exercise.calories !== undefined
              ? exercise.calories
              : exercise.kcal,
        0
      )
    );

    const normalized = {
      ...exercise,
      muscle_group: exercise.muscleGroup,
      animation_url: exercise.animationUrl,
      tutorial_text: exercise.tutorialText,
      musclesWorked,
      muscles_worked: musclesWorked,
      seriesCount,
      series: seriesCount,
      series_count: seriesCount,
      intensityScore,
      intensity_score: intensityScore,
      caloriesEstimate,
      calories_estimate: caloriesEstimate,
      calories: caloriesEstimate,
      kcal: caloriesEstimate,
      tutorialSteps,
      tutorial_steps: tutorialSteps,
      importantTips,
      important_tips: importantTips,
      is_active: Boolean(exercise.isActive),
      createdById,
      createdByRole,
      createdBy: createdById,
      created_by: createdById,
      created_by_role: createdByRole,
      created_at: exercise.createdAt || null,
      updated_at: exercise.updatedAt || null,
      muscles: musclesWorked,
      intensity: intensityScore,
      instructions_list: tutorialSteps,
    };

    if (!normalized.group) {
      normalized.group = normalized.muscleGroup || "geral";
    }
    if (!normalized.imageUrl) {
      normalized.imageUrl = "";
    }
    if (!normalized.videoUrl) {
      normalized.videoUrl = normalized.animationUrl || "";
    }

    return normalized;
  }

  function createLibraryExercise(data) {
    const now = new Date().toISOString();
    const payload = normalizeLibraryExercisePayload(data);
    const requestedId = Number(data && data.id) || 0;
    const nextId = requestedId > 0 ? requestedId : store.sequence.libraryExercise++;
    if (requestedId > 0 && requestedId >= Number(store.sequence.libraryExercise || 1)) {
      store.sequence.libraryExercise = requestedId + 1;
    }

    const exercise = withCompatibilityFields({
      id: nextId,
      ...payload,
      createdAt: now,
      updatedAt: now,
    });

    store.libraryExercises.push(exercise);
    persistInMemoryStore(store);
    return exercise;
  }

  function listLibraryExercises({ includeInactive = false } = {}) {
    return store.libraryExercises
      .filter((exercise) => includeInactive || exercise.isActive !== false)
      .map((exercise) => withCompatibilityFields({ ...exercise }));
  }

  function findById(id, { includeInactive = true } = {}) {
    const item =
      store.libraryExercises.find((exercise) => Number(exercise.id) === Number(id)) || null;
    if (!item) return null;
    if (!includeInactive && item.isActive === false) return null;
    return withCompatibilityFields({ ...item });
  }

  function findByIds(ids, { includeInactive = true } = {}) {
    const normalizedIds = new Set(
      (Array.isArray(ids) ? ids : [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
    );

    if (!normalizedIds.size) return [];

    return store.libraryExercises
      .filter((exercise) => normalizedIds.has(Number(exercise.id)))
      .filter((exercise) => includeInactive || exercise.isActive !== false)
      .map((exercise) => withCompatibilityFields({ ...exercise }));
  }

  function findByName(name, { includeInactive = true } = {}) {
    const normalized = normalizeName(name);
    if (!normalized) return null;

    const item =
      store.libraryExercises.find(
        (exercise) => normalizeName(exercise && exercise.name) === normalized
      ) || null;

    if (!item) return null;
    if (!includeInactive && item.isActive === false) return null;
    return withCompatibilityFields({ ...item });
  }

  function findByNameAndGroup(name, group, { includeInactive = true } = {}) {
    const normalizedName = normalizeName(name);
    const normalizedGroup = normalizeGroup(group);
    if (!normalizedName || !normalizedGroup) return null;

    const item =
      store.libraryExercises.find((exercise) => {
        const exerciseName = normalizeName(exercise && exercise.name);
        const exerciseGroup = normalizeGroup(
          exercise && (exercise.group || exercise.muscleGroup || exercise.muscle_group)
        );
        return exerciseName === normalizedName && exerciseGroup === normalizedGroup;
      }) || null;

    if (!item) return null;
    if (!includeInactive && item.isActive === false) return null;
    return withCompatibilityFields({ ...item });
  }

  function updateLibraryExercise(exerciseId, data = {}) {
    const index = store.libraryExercises.findIndex(
      (exercise) => Number(exercise.id) === Number(exerciseId)
    );
    if (index < 0) return null;

    const previous = store.libraryExercises[index];
    const payload = normalizeLibraryExercisePayload({
      ...previous,
      ...data,
      createdById: previous.createdById,
      createdByRole: previous.createdByRole,
    });

    const updated = withCompatibilityFields({
      ...previous,
      ...payload,
      id: Number(previous.id),
      createdAt: previous.createdAt,
      updatedAt: new Date().toISOString(),
    });

    store.libraryExercises[index] = updated;
    persistInMemoryStore(store);
    return withCompatibilityFields({ ...updated });
  }

  function updateLibraryExerciseStatus(exerciseId, isActive) {
    const index = store.libraryExercises.findIndex(
      (exercise) => Number(exercise.id) === Number(exerciseId)
    );
    if (index < 0) return null;

    const previous = store.libraryExercises[index];
    const updated = withCompatibilityFields({
      ...previous,
      isActive: Boolean(isActive),
      updatedAt: new Date().toISOString(),
    });

    store.libraryExercises[index] = updated;
    persistInMemoryStore(store);
    return withCompatibilityFields({ ...updated });
  }

  function deleteLibraryExercise(exerciseId) {
    const index = store.libraryExercises.findIndex(
      (exercise) => Number(exercise.id) === Number(exerciseId)
    );
    if (index < 0) return null;

    const [removed] = store.libraryExercises.splice(index, 1);
    persistInMemoryStore(store);
    return withCompatibilityFields({ ...removed });
  }

  return {
    createLibraryExercise,
    listLibraryExercises,
    findById,
    findByIds,
    findByName,
    findByNameAndGroup,
    updateLibraryExercise,
    updateLibraryExerciseStatus,
    deleteLibraryExercise,
  };
}

module.exports = {
  createLibraryRepository,
};
