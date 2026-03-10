function createLibraryDatabaseRepository({ prisma }) {
  function normalizeString(value) {
    return String(value || "").trim();
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

  function normalizePayload(data = {}) {
    const forcedId = Number(data.id) || 0;
    const repetitions = Math.max(1, normalizeInteger(data.repetitions, 10));
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

    return {
      ...(forcedId > 0 ? { id: forcedId } : {}),
      name: normalizeString(data.name),
      muscleGroup: normalizeString(data.muscleGroup || data.muscle_group || data.group || "geral").toLowerCase(),
      description: normalizeString(data.description),
      animationUrl: normalizeString(data.animationUrl || data.animation_url || data.videoUrl || data.imageUrl),
      tutorialText: normalizeString(data.tutorialText || data.tutorial_text || data.description),
      level: normalizeString(data.level || "intermediario").toLowerCase(),
      type: normalizeString(data.type || "forca").toLowerCase(),
      imageUrl: normalizeString(data.imageUrl),
      videoUrl: normalizeString(data.videoUrl || data.animationUrl || data.animation_url),
      repetitions,
      durationSeconds,
      restSeconds,
      caloriesEstimate,
      loadKg: Math.max(0, normalizeDecimal(data.loadKg, 0)),
      musclesWorked: normalizeStringList(
        data.musclesWorked !== undefined
          ? data.musclesWorked
          : data.muscles_worked !== undefined
            ? data.muscles_worked
            : data.muscles
      ),
      intensityScore: normalizeIntensityScore(
        data.intensityScore !== undefined
          ? data.intensityScore
          : data.intensity_score !== undefined
            ? data.intensity_score
            : data.intensity,
        3
      ),
      tutorialSteps: normalizeStringList(
        data.tutorialSteps !== undefined
          ? data.tutorialSteps
          : data.tutorial_steps !== undefined
            ? data.tutorial_steps
            : data.instructionsList,
        { splitCommas: false }
      ),
      importantTips: normalizeStringList(
        data.importantTips !== undefined
          ? data.importantTips
          : data.important_tips !== undefined
            ? data.important_tips
            : data.tips,
        { splitCommas: false }
      ),
      isActive:
        Object.prototype.hasOwnProperty.call(data, "isActive")
          ? data.isActive !== false
          : Object.prototype.hasOwnProperty.call(data, "is_active")
            ? data.is_active !== false
            : true,
      createdById: Number(data.createdById || data.created_by_id) || 0,
      createdByRole: normalizeString(data.createdByRole || data.created_by_role || "INSTRUTOR").toUpperCase(),
    };
  }

  function withCompatibilityFields(exercise) {
    if (!exercise) return null;

    const musclesWorked = normalizeStringList(exercise.musclesWorked);
    const tutorialSteps = normalizeStringList(exercise.tutorialSteps, { splitCommas: false });
    const importantTips = normalizeStringList(exercise.importantTips, { splitCommas: false });
    const intensityScore = normalizeIntensityScore(exercise.intensityScore, 3);
    const caloriesEstimate = Math.max(0, normalizeInteger(exercise.caloriesEstimate, 0));
    const createdById = Number(exercise.createdById) || 0;
    const createdByRole = normalizeString(exercise.createdByRole || "INSTRUTOR").toUpperCase();

    return {
      ...exercise,
      id: Number(exercise.id) || 0,
      group: normalizeString(exercise.muscleGroup).toLowerCase() || "geral",
      muscle_group: exercise.muscleGroup,
      animation_url: exercise.animationUrl,
      tutorial_text: exercise.tutorialText,
      is_active: Boolean(exercise.isActive),
      createdById,
      createdByRole,
      created_by_id: createdById,
      created_by_role: createdByRole,
      createdBy: createdById,
      created_by: createdById,
      created_at: exercise.createdAt || null,
      updated_at: exercise.updatedAt || null,
      musclesWorked,
      muscles_worked: musclesWorked,
      muscles: musclesWorked,
      intensityScore,
      intensity_score: intensityScore,
      intensity: intensityScore,
      caloriesEstimate,
      calories_estimate: caloriesEstimate,
      calories: caloriesEstimate,
      kcal: caloriesEstimate,
      tutorialSteps,
      tutorial_steps: tutorialSteps,
      instructions_list: tutorialSteps,
      importantTips,
      important_tips: importantTips,
      imageUrl: normalizeString(exercise.imageUrl),
      videoUrl: normalizeString(exercise.videoUrl || exercise.animationUrl),
      durationSeconds: Math.max(10, normalizeInteger(exercise.durationSeconds, 60)),
      restSeconds: Math.max(0, normalizeInteger(exercise.restSeconds, 30)),
      repetitions: Math.max(1, normalizeInteger(exercise.repetitions, 10)),
      loadKg: Math.max(0, normalizeDecimal(exercise.loadKg, 0)),
    };
  }

  async function createLibraryExercise(data) {
    const payload = normalizePayload(data);
    const created = await prisma.exercise.create({ data: payload });
    if (payload.id && Number(payload.id) > 0) {
      await prisma.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"exercise"', 'id'), COALESCE((SELECT MAX(id) FROM "exercise"), 1), true)`
      );
    }
    return withCompatibilityFields(created);
  }

  async function listLibraryExercises({ includeInactive = false } = {}) {
    const list = await prisma.exercise.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { id: "desc" },
    });
    return list.map(withCompatibilityFields);
  }

  async function findById(id, { includeInactive = true } = {}) {
    const exerciseId = Number(id) || 0;
    if (!exerciseId) return null;
    const item = await prisma.exercise.findUnique({ where: { id: exerciseId } });
    if (!item) return null;
    if (!includeInactive && item.isActive === false) return null;
    return withCompatibilityFields(item);
  }

  async function findByIds(ids, { includeInactive = true } = {}) {
    const normalizedIds = Array.from(
      new Set(
        (Array.isArray(ids) ? ids : [])
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value) && value > 0)
      )
    );
    if (!normalizedIds.length) return [];
    const list = await prisma.exercise.findMany({
      where: {
        id: { in: normalizedIds },
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { id: "desc" },
    });
    return list.map(withCompatibilityFields);
  }

  async function findByName(name, { includeInactive = true } = {}) {
    const normalizedName = normalizeString(name);
    if (!normalizedName) return null;
    const list = await prisma.exercise.findMany({
      where: {
        name: normalizedName,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { id: "desc" },
      take: 1,
    });
    return list.length ? withCompatibilityFields(list[0]) : null;
  }

  async function findByNameAndGroup(name, group, { includeInactive = true } = {}) {
    const normalizedName = normalizeString(name);
    const normalizedGroup = normalizeString(group).toLowerCase();
    if (!normalizedName || !normalizedGroup) return null;
    const list = await prisma.exercise.findMany({
      where: {
        name: normalizedName,
        muscleGroup: normalizedGroup,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { id: "desc" },
      take: 1,
    });
    return list.length ? withCompatibilityFields(list[0]) : null;
  }

  async function updateLibraryExercise(exerciseId, data = {}) {
    const normalizedExerciseId = Number(exerciseId) || 0;
    if (!normalizedExerciseId) return null;
    const previous = await prisma.exercise.findUnique({
      where: { id: normalizedExerciseId },
    });
    if (!previous) return null;

    const payload = normalizePayload({
      ...previous,
      ...data,
      id: normalizedExerciseId,
      createdById: previous.createdById,
      createdByRole: previous.createdByRole,
    });
    const updated = await prisma.exercise.update({
      where: { id: normalizedExerciseId },
      data: payload,
    });
    return withCompatibilityFields(updated);
  }

  async function updateLibraryExerciseStatus(exerciseId, isActive) {
    const normalizedExerciseId = Number(exerciseId) || 0;
    if (!normalizedExerciseId) return null;
    const updated = await prisma.exercise.update({
      where: { id: normalizedExerciseId },
      data: { isActive: Boolean(isActive) },
    });
    return withCompatibilityFields(updated);
  }

  async function deleteLibraryExercise(exerciseId) {
    const normalizedExerciseId = Number(exerciseId) || 0;
    if (!normalizedExerciseId) return null;
    const removed = await prisma.exercise.delete({
      where: { id: normalizedExerciseId },
    });
    return withCompatibilityFields(removed);
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
  createLibraryDatabaseRepository,
};
