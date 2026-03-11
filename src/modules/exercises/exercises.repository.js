function createExercisesRepository({ prisma }) {
  let workoutExerciseObservationColumnPromise = null;

  function nowIso() {
    return new Date().toISOString();
  }

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

  function toIsoDate(value) {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
  }

  function isObservationArgumentUnsupported(error) {
    const message = String((error && error.message) || "").trim().toLowerCase();
    return (
      String((error && error.name) || "").trim() === "PrismaClientValidationError" &&
      message.includes("unknown argument") &&
      message.includes("observation")
    );
  }

  function mapFromLibraryExercise(exercise) {
    if (!exercise) return null;
    return {
      name: normalizeString(exercise.name),
      description: normalizeString(exercise.description),
      animationUrl: normalizeString(exercise.animationUrl || exercise.videoUrl),
      tutorialText: normalizeString(exercise.tutorialText || exercise.description),
      level: normalizeString(exercise.level || "intermediario").toLowerCase(),
      type: normalizeString(exercise.type || "forca").toLowerCase(),
      isActive: exercise.isActive !== false,
      imageUrl: normalizeString(exercise.imageUrl),
      videoUrl: normalizeString(exercise.videoUrl || exercise.animationUrl),
      durationSeconds: Math.max(10, normalizeInteger(exercise.durationSeconds, 60)),
    };
  }

  function withWorkoutExerciseCompatibility(item) {
    if (!item) return null;

    const libraryExercise = mapFromLibraryExercise(item.exercise);
    const normalized = {
      id: Number(item.id),
      workoutId: normalizeInteger(item.workoutId || item.workout_id, 0),
      exerciseId: normalizeInteger(
        item.exerciseId || item.exercise_id || item.libraryExerciseId,
        0
      ),
      order: Math.max(1, normalizeInteger(item.order, 1)),
      series: Math.max(1, normalizeInteger(item.series, 3)),
      reps: Math.max(1, normalizeInteger(item.reps || item.repetitions, 10)),
      load: Math.max(0, normalizeDecimal(item.load || item.loadKg, 0)),
      restTime: Math.max(0, normalizeInteger(item.restTime || item.restSeconds, 30)),
      completed: Boolean(item.completed),
      replacedFromExerciseId:
        item.replacedFromExerciseId === null || item.replacedFromExerciseId === undefined
          ? null
          : normalizeInteger(item.replacedFromExerciseId, 0),
      name: normalizeString(item.name || (libraryExercise && libraryExercise.name)),
      description: normalizeString(item.description || (libraryExercise && libraryExercise.description)),
      animationUrl: normalizeString(item.animationUrl || (libraryExercise && libraryExercise.animationUrl)),
      tutorialText: normalizeString(item.tutorialText || (libraryExercise && libraryExercise.tutorialText)),
      observation: normalizeString(
        item.observation || item.observacao || item.note || item.notes
      ),
      level: normalizeString(item.level || (libraryExercise && libraryExercise.level) || "intermediario").toLowerCase(),
      type: normalizeString(item.type || (libraryExercise && libraryExercise.type) || "forca").toLowerCase(),
      isActive: item.isActive !== false && item.is_active !== false && (!libraryExercise || libraryExercise.isActive !== false),
      imageUrl: normalizeString(item.imageUrl || (libraryExercise && libraryExercise.imageUrl)),
      videoUrl: normalizeString(item.videoUrl || (libraryExercise && libraryExercise.videoUrl)),
      durationSeconds: Math.max(
        10,
        normalizeInteger(item.durationSeconds || (libraryExercise && libraryExercise.durationSeconds), 60)
      ),
      createdAt: toIsoDate(item.createdAt || item.created_at) || nowIso(),
      updatedAt: toIsoDate(item.updatedAt || item.updated_at) || nowIso(),
    };

    return {
      ...normalized,
      workout_id: normalized.workoutId,
      exercise_id: normalized.exerciseId,
      rest_time: normalized.restTime,
      replaced_from_exercise_id: normalized.replacedFromExerciseId,
      libraryExerciseId: normalized.exerciseId,
      repetitions: normalized.reps,
      loadKg: normalized.load,
      restSeconds: normalized.restTime,
      animation_url: normalized.animationUrl,
      tutorial_text: normalized.tutorialText,
      observation: normalized.observation,
      observacao: normalized.observation,
      is_active: normalized.isActive,
    };
  }

  async function ensureWorkoutExerciseObservationColumn() {
    if (!workoutExerciseObservationColumnPromise) {
      workoutExerciseObservationColumnPromise = prisma.$executeRawUnsafe(`
ALTER TABLE workout_exercise
  ADD COLUMN IF NOT EXISTS observation text NOT NULL DEFAULT '';
      `).catch((error) => {
        workoutExerciseObservationColumnPromise = null;
        throw error;
      });
    }

    await workoutExerciseObservationColumnPromise;
  }

  async function createExercise(data) {
    await ensureWorkoutExerciseObservationColumn();

    const payload = {
      workoutId: Number(data && data.workoutId) || 0,
      exerciseId: Number(data && data.exerciseId) || 0,
      order: Math.max(1, normalizeInteger(data && data.order, 1)),
      series: Math.max(1, normalizeInteger(data && data.series, 3)),
      reps: Math.max(1, normalizeInteger(data && (data.reps || data.repetitions), 10)),
      load: Math.max(0, normalizeDecimal(data && (data.load || data.loadKg), 0)),
      restTime: Math.max(0, normalizeInteger(data && (data.restTime || data.restSeconds), 30)),
      completed: Boolean(data && data.completed),
      replacedFromExerciseId:
        data && data.replacedFromExerciseId !== null && data.replacedFromExerciseId !== undefined
          ? Number(data.replacedFromExerciseId) || null
          : null,
      observation: normalizeString(data && (data.observation || data.observacao || data.note || data.notes)),
    };

    let created;
    try {
      created = await prisma.workoutExercise.create({
        data: payload,
        include: {
          exercise: true,
        },
      });
    } catch (error) {
      if (!isObservationArgumentUnsupported(error)) throw error;

      const { observation, ...fallbackPayload } = payload;
      created = await prisma.workoutExercise.create({
        data: fallbackPayload,
        include: {
          exercise: true,
        },
      });
    }

    return withWorkoutExerciseCompatibility(created);
  }

  async function listByWorkoutId(workoutId) {
    const normalizedWorkoutId = Number(workoutId) || 0;
    if (!normalizedWorkoutId) return [];

    await ensureWorkoutExerciseObservationColumn();

    const list = await prisma.workoutExercise.findMany({
      where: {
        workoutId: normalizedWorkoutId,
      },
      orderBy: [
        { order: "asc" },
        { id: "asc" },
      ],
      include: {
        exercise: true,
      },
    });

    return list.map((item) => withWorkoutExerciseCompatibility(item));
  }

  async function listByWorkoutIds(workoutIds) {
    const ids = new Set(
      (Array.isArray(workoutIds) ? workoutIds : [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
    );

    if (!ids.size) return [];

    await ensureWorkoutExerciseObservationColumn();

    const list = await prisma.workoutExercise.findMany({
      where: {
        workoutId: {
          in: Array.from(ids),
        },
      },
      include: {
        exercise: true,
      },
    });

    return list.map((item) => withWorkoutExerciseCompatibility(item));
  }

  async function findById(id) {
    const normalizedId = Number(id) || 0;
    if (!normalizedId) return null;

    await ensureWorkoutExerciseObservationColumn();

    const item = await prisma.workoutExercise.findUnique({
      where: {
        id: normalizedId,
      },
      include: {
        exercise: true,
      },
    });

    return item ? withWorkoutExerciseCompatibility(item) : null;
  }

  async function findByWorkoutAndId({ workoutId, workoutExerciseId }) {
    const normalizedWorkoutId = Number(workoutId) || 0;
    const normalizedWorkoutExerciseId = Number(workoutExerciseId) || 0;
    if (!normalizedWorkoutId || !normalizedWorkoutExerciseId) return null;

    await ensureWorkoutExerciseObservationColumn();

    const item = await prisma.workoutExercise.findFirst({
      where: {
        id: normalizedWorkoutExerciseId,
        workoutId: normalizedWorkoutId,
      },
      include: {
        exercise: true,
      },
    });

    return item ? withWorkoutExerciseCompatibility(item) : null;
  }

  async function updateExercise({ workoutId, workoutExerciseId, data }) {
    const normalizedWorkoutId = Number(workoutId) || 0;
    const normalizedWorkoutExerciseId = Number(workoutExerciseId) || 0;
    if (!normalizedWorkoutId || !normalizedWorkoutExerciseId) return null;

    await ensureWorkoutExerciseObservationColumn();

    const current = await prisma.workoutExercise.findFirst({
      where: {
        id: normalizedWorkoutExerciseId,
        workoutId: normalizedWorkoutId,
      },
      include: {
        exercise: true,
      },
    });
    if (!current) return null;

    const payload = {};
    if (data && data.exerciseId !== undefined) payload.exerciseId = Number(data.exerciseId) || current.exerciseId;
    if (data && data.order !== undefined) payload.order = Math.max(1, normalizeInteger(data.order, current.order));
    if (data && data.series !== undefined) payload.series = Math.max(1, normalizeInteger(data.series, current.series));
    if (data && (data.reps !== undefined || data.repetitions !== undefined)) {
      payload.reps = Math.max(
        1,
        normalizeInteger(data.reps !== undefined ? data.reps : data.repetitions, current.reps)
      );
    }
    if (data && (data.load !== undefined || data.loadKg !== undefined)) {
      payload.load = Math.max(
        0,
        normalizeDecimal(data.load !== undefined ? data.load : data.loadKg, current.load)
      );
    }
    if (data && (data.restTime !== undefined || data.restSeconds !== undefined)) {
      payload.restTime = Math.max(
        0,
        normalizeInteger(data.restTime !== undefined ? data.restTime : data.restSeconds, current.restTime)
      );
    }
    if (data && data.completed !== undefined) payload.completed = Boolean(data.completed);
    if (data && data.replacedFromExerciseId !== undefined) {
      payload.replacedFromExerciseId =
        data.replacedFromExerciseId === null || data.replacedFromExerciseId === ""
          ? null
          : Number(data.replacedFromExerciseId) || null;
    }
    if (
      data &&
      (data.observation !== undefined ||
        data.observacao !== undefined ||
        data.note !== undefined ||
        data.notes !== undefined)
    ) {
      payload.observation = normalizeString(
        data.observation || data.observacao || data.note || data.notes
      );
    }

    try {
      const updated = await prisma.workoutExercise.update({
        where: {
          id: normalizedWorkoutExerciseId,
        },
        data: payload,
        include: {
          exercise: true,
        },
      });

      if (Number(updated.workoutId) !== normalizedWorkoutId) return null;
      return withWorkoutExerciseCompatibility(updated);
    } catch (error) {
      if (isObservationArgumentUnsupported(error) && Object.prototype.hasOwnProperty.call(payload, "observation")) {
        const { observation, ...fallbackPayload } = payload;
        const updated = await prisma.workoutExercise.update({
          where: {
            id: normalizedWorkoutExerciseId,
          },
          data: fallbackPayload,
          include: {
            exercise: true,
          },
        });

        if (Number(updated.workoutId) !== normalizedWorkoutId) return null;
        return withWorkoutExerciseCompatibility(updated);
      }

      const code = String((error && error.code) || "").toUpperCase();
      if (code === "P2025") return null;
      throw error;
    }
  }

  async function deleteExercise({ workoutId, workoutExerciseId }) {
    const normalizedWorkoutId = Number(workoutId) || 0;
    const normalizedWorkoutExerciseId = Number(workoutExerciseId) || 0;
    if (!normalizedWorkoutId || !normalizedWorkoutExerciseId) return null;

    await ensureWorkoutExerciseObservationColumn();

    const existing = await prisma.workoutExercise.findFirst({
      where: {
        id: normalizedWorkoutExerciseId,
        workoutId: normalizedWorkoutId,
      },
      include: {
        exercise: true,
      },
    });
    if (!existing) return null;

    const deleted = await prisma.workoutExercise.delete({
      where: {
        id: normalizedWorkoutExerciseId,
      },
      include: {
        exercise: true,
      },
    });

    return withWorkoutExerciseCompatibility(deleted);
  }

  return {
    createExercise,
    listByWorkoutId,
    listByWorkoutIds,
    findById,
    findByWorkoutAndId,
    updateExercise,
    deleteExercise,
  };
}

module.exports = {
  createExercisesRepository,
};
