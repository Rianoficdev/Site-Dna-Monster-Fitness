const { AppError } = require("../../utils/AppError");

function createExercisesService({ exercisesRepository, workoutsService, libraryRepository }) {
  function normalizeRole(role) {
    return String(role || "").trim().toUpperCase();
  }

  function normalizeString(value) {
    return String(value || "").trim();
  }

  function normalizeInteger(value, fallback = 0) {
    const normalized = Number(value);
    if (!Number.isFinite(normalized)) return fallback;
    return Math.trunc(normalized);
  }

  function normalizeDecimal(value, fallback = 0) {
    const normalized = Number(value);
    if (!Number.isFinite(normalized)) return fallback;
    return Number(normalized);
  }

  function normalizeBoolean(value, fallback = false) {
    if (value === undefined || value === null || value === "") return fallback;
    if (value === true || value === false) return value;
    if (typeof value === "string") return value.trim().toLowerCase() === "true";
    return Boolean(value);
  }

  function calculateProgress(exercises) {
    const list = Array.isArray(exercises) ? exercises : [];
    const totalExercises = list.length;
    const completedExercises = list.filter((exercise) => Boolean(exercise && exercise.completed)).length;
    const progressPercent = totalExercises
      ? Math.round((completedExercises / totalExercises) * 100)
      : 0;

    return {
      totalExercises,
      completedExercises,
      progressPercent,
    };
  }

  function resolveLibraryExercise({ libraryExerciseId, exerciseId, includeInactive = false }) {
    const normalizedLibraryExerciseId = Math.max(
      0,
      normalizeInteger(libraryExerciseId || exerciseId, 0)
    );

    if (!normalizedLibraryExerciseId) return null;
    const libraryExercise = libraryRepository.findById(normalizedLibraryExerciseId, {
      includeInactive,
    });

    if (!libraryExercise) {
      throw new AppError("Exercicio da biblioteca nao encontrado.", 404, "LIBRARY_EXERCISE_NOT_FOUND");
    }

    return libraryExercise;
  }

  async function createExercise({
    authUser,
    workoutId,
    libraryExerciseId,
    exerciseId,
    name,
    description,
    imageUrl,
    videoUrl,
    series,
    repeticoes,
    repetitions,
    reps,
    carga,
    loadKg,
    load,
    durationSeconds,
    descanso,
    restSeconds,
    restTime,
    observation,
    observacao,
    note,
    notes,
    order,
    completed,
  }) {
    const normalizedWorkoutId = normalizeInteger(workoutId);
    if (!normalizedWorkoutId) {
      throw new AppError("Campo obrigatorio: workoutId.", 400, "VALIDATION_ERROR");
    }

    await workoutsService.ensureWorkoutAccess(authUser, normalizedWorkoutId, { forManagement: true });

    const libraryExercise = resolveLibraryExercise({
      libraryExerciseId,
      exerciseId,
      includeInactive: false,
    });

    if (!libraryExercise) {
      throw new AppError(
        "Campo obrigatorio: exerciseId (exercicio da biblioteca).",
        400,
        "VALIDATION_ERROR"
      );
    }

    const incomingName = normalizeString(name);
    const incomingDescription = normalizeString(description);
    const normalizedName = normalizeString(incomingName || libraryExercise.name);
    const normalizedDescription = normalizeString(incomingDescription || libraryExercise.description);
    const normalizedObservation = normalizeString(observacao || observation || note || notes);

    const existingExercises = await exercisesRepository.listByWorkoutId(normalizedWorkoutId);
    const normalizedOrder = Math.max(
      1,
      normalizeInteger(order, 0) || (Array.isArray(existingExercises) ? existingExercises.length + 1 : 1)
    );
    const normalizedSeries = Math.max(1, normalizeInteger(series, 3));
    const normalizedReps = Math.max(1, normalizeInteger(reps || repetitions || repeticoes, 10));
    const normalizedLoad = Math.max(
      0,
      normalizeDecimal(
        load !== undefined ? load : loadKg !== undefined ? loadKg : carga,
        0
      )
    );
    const normalizedRestTime = Math.max(
      0,
      normalizeInteger(
        restTime !== undefined ? restTime : restSeconds !== undefined ? restSeconds : descanso,
        30
      )
    );
    const normalizedDurationSeconds = Math.max(
      10,
      normalizeInteger(
        durationSeconds !== undefined ? durationSeconds : libraryExercise.durationSeconds,
        60
      )
    );

    return exercisesRepository.createExercise({
      workoutId: normalizedWorkoutId,
      exerciseId: Number(libraryExercise.id),
      order: normalizedOrder,
      series: normalizedSeries,
      reps: normalizedReps,
      load: normalizedLoad,
      restTime: normalizedRestTime,
      completed: normalizeBoolean(completed, false),
      replacedFromExerciseId: null,
      name: normalizedName,
      description: normalizedDescription,
      animationUrl: normalizeString(videoUrl || libraryExercise.animationUrl),
      tutorialText: normalizeString(libraryExercise.tutorialText || normalizedDescription),
      level: normalizeString(libraryExercise.level || "intermediario"),
      type: normalizeString(libraryExercise.type || "forca"),
      isActive: libraryExercise.isActive !== false,
      imageUrl: normalizeString(imageUrl || libraryExercise.imageUrl),
      videoUrl: normalizeString(videoUrl || libraryExercise.videoUrl),
      repetitions: normalizedReps,
      loadKg: normalizedLoad,
      durationSeconds: normalizedDurationSeconds,
      restSeconds: normalizedRestTime,
      observation: normalizedObservation,
    });
  }

  async function listWorkoutExercises(authUser, workoutId) {
    const normalizedWorkoutId = normalizeInteger(workoutId);
    await workoutsService.ensureWorkoutAccess(authUser, normalizedWorkoutId);
    return exercisesRepository.listByWorkoutId(normalizedWorkoutId);
  }

  async function setWorkoutExerciseCompleted({
    authUser,
    workoutId,
    workoutExerciseId,
    completed,
  }) {
    const normalizedWorkoutId = normalizeInteger(workoutId);
    const normalizedWorkoutExerciseId = normalizeInteger(workoutExerciseId);
    if (!normalizedWorkoutId || !normalizedWorkoutExerciseId) {
      throw new AppError("workoutId e workoutExerciseId sao obrigatorios.", 400, "VALIDATION_ERROR");
    }

    await workoutsService.ensureWorkoutAccess(authUser, normalizedWorkoutId);
    const exercise = await exercisesRepository.findByWorkoutAndId({
      workoutId: normalizedWorkoutId,
      workoutExerciseId: normalizedWorkoutExerciseId,
    });
    if (!exercise) {
      throw new AppError("Exercicio do treino nao encontrado.", 404, "WORKOUT_EXERCISE_NOT_FOUND");
    }

    const updated = await exercisesRepository.updateExercise({
      workoutId: normalizedWorkoutId,
      workoutExerciseId: normalizedWorkoutExerciseId,
      data: {
        completed: normalizeBoolean(completed, false),
      },
    });

    const exercises = await exercisesRepository.listByWorkoutId(normalizedWorkoutId);
    return {
      exercise: updated,
      progress: calculateProgress(exercises),
    };
  }

  async function replaceWorkoutExercise({
    authUser,
    workoutId,
    workoutExerciseId,
    exerciseId,
  }) {
    const normalizedWorkoutId = normalizeInteger(workoutId);
    const normalizedWorkoutExerciseId = normalizeInteger(workoutExerciseId);
    const normalizedExerciseId = normalizeInteger(exerciseId);
    if (!normalizedWorkoutId || !normalizedWorkoutExerciseId || !normalizedExerciseId) {
      throw new AppError(
        "Campos obrigatorios: workoutId, workoutExerciseId e exerciseId.",
        400,
        "VALIDATION_ERROR"
      );
    }

    await workoutsService.ensureWorkoutAccess(authUser, normalizedWorkoutId, { forManagement: true });
    const existing = await exercisesRepository.findByWorkoutAndId({
      workoutId: normalizedWorkoutId,
      workoutExerciseId: normalizedWorkoutExerciseId,
    });
    if (!existing) {
      throw new AppError("Exercicio do treino nao encontrado.", 404, "WORKOUT_EXERCISE_NOT_FOUND");
    }

    const newLibraryExercise = resolveLibraryExercise({
      exerciseId: normalizedExerciseId,
      includeInactive: false,
    });

    const updated = await exercisesRepository.updateExercise({
      workoutId: normalizedWorkoutId,
      workoutExerciseId: normalizedWorkoutExerciseId,
      data: {
        exerciseId: Number(newLibraryExercise.id),
        replacedFromExerciseId: Number(existing.exerciseId) || null,
        name: newLibraryExercise.name,
        description: newLibraryExercise.description,
        animationUrl: newLibraryExercise.animationUrl,
        tutorialText: newLibraryExercise.tutorialText,
        level: newLibraryExercise.level,
        type: newLibraryExercise.type,
        isActive: newLibraryExercise.isActive !== false,
        imageUrl: newLibraryExercise.imageUrl,
        videoUrl: newLibraryExercise.videoUrl,
        durationSeconds: Number(newLibraryExercise.durationSeconds) || existing.durationSeconds || 60,
      },
    });

    return updated;
  }

  async function updateWorkoutExerciseLoad({
    authUser,
    workoutId,
    workoutExerciseId,
    load,
    loadKg,
  }) {
    const normalizedWorkoutId = normalizeInteger(workoutId);
    const normalizedWorkoutExerciseId = normalizeInteger(workoutExerciseId);
    if (!normalizedWorkoutId || !normalizedWorkoutExerciseId) {
      throw new AppError("workoutId e workoutExerciseId sao obrigatorios.", 400, "VALIDATION_ERROR");
    }

    await workoutsService.ensureWorkoutAccess(authUser, normalizedWorkoutId, { forManagement: true });
    const current = await exercisesRepository.findByWorkoutAndId({
      workoutId: normalizedWorkoutId,
      workoutExerciseId: normalizedWorkoutExerciseId,
    });
    if (!current) {
      throw new AppError("Exercicio do treino nao encontrado.", 404, "WORKOUT_EXERCISE_NOT_FOUND");
    }

    const normalizedLoad = Math.max(
      0,
      normalizeDecimal(load !== undefined ? load : loadKg, current.load)
    );
    return exercisesRepository.updateExercise({
      workoutId: normalizedWorkoutId,
      workoutExerciseId: normalizedWorkoutExerciseId,
      data: {
        load: normalizedLoad,
        loadKg: normalizedLoad,
      },
    });
  }

  async function updateWorkoutExercise({
    authUser,
    workoutId,
    workoutExerciseId,
    exerciseId,
    libraryExerciseId,
    order,
    series,
    repeticoes,
    repetitions,
    reps,
    carga,
    load,
    loadKg,
    descanso,
    restTime,
    restSeconds,
    observation,
    observacao,
    notes,
    note,
  }) {
    const normalizedWorkoutId = normalizeInteger(workoutId);
    const normalizedWorkoutExerciseId = normalizeInteger(workoutExerciseId);
    if (!normalizedWorkoutId || !normalizedWorkoutExerciseId) {
      throw new AppError("workoutId e workoutExerciseId sao obrigatorios.", 400, "VALIDATION_ERROR");
    }

    await workoutsService.ensureWorkoutAccess(authUser, normalizedWorkoutId, { forManagement: true });
    const current = await exercisesRepository.findByWorkoutAndId({
      workoutId: normalizedWorkoutId,
      workoutExerciseId: normalizedWorkoutExerciseId,
    });
    if (!current) {
      throw new AppError("Exercicio do treino nao encontrado.", 404, "WORKOUT_EXERCISE_NOT_FOUND");
    }

    const payload = {};

    if (exerciseId !== undefined || libraryExerciseId !== undefined) {
      const nextLibraryExercise = resolveLibraryExercise({
        exerciseId,
        libraryExerciseId,
        includeInactive: false,
      });

      payload.exerciseId = Number(nextLibraryExercise.id);
      payload.replacedFromExerciseId = Number(current.exerciseId) || null;
      payload.name = normalizeString(nextLibraryExercise.name);
      payload.description = normalizeString(nextLibraryExercise.description);
      payload.animationUrl = normalizeString(nextLibraryExercise.animationUrl);
      payload.tutorialText = normalizeString(nextLibraryExercise.tutorialText);
      payload.level = normalizeString(nextLibraryExercise.level || "intermediario");
      payload.type = normalizeString(nextLibraryExercise.type || "forca");
      payload.isActive = nextLibraryExercise.isActive !== false;
      payload.imageUrl = normalizeString(nextLibraryExercise.imageUrl);
      payload.videoUrl = normalizeString(nextLibraryExercise.videoUrl);
      payload.durationSeconds = Math.max(10, Number(nextLibraryExercise.durationSeconds) || 60);
    }

    if (order !== undefined) payload.order = Math.max(1, normalizeInteger(order, current.order || 1));
    if (series !== undefined) payload.series = Math.max(1, normalizeInteger(series, current.series || 1));

    if (repeticoes !== undefined || repetitions !== undefined || reps !== undefined) {
      payload.reps = Math.max(
        1,
        normalizeInteger(reps !== undefined ? reps : repetitions !== undefined ? repetitions : repeticoes, current.reps || 10)
      );
      payload.repetitions = payload.reps;
    }

    if (carga !== undefined || load !== undefined || loadKg !== undefined) {
      const nextLoad = Math.max(
        0,
        normalizeDecimal(
          load !== undefined ? load : loadKg !== undefined ? loadKg : carga,
          current.load || 0
        )
      );
      payload.load = nextLoad;
      payload.loadKg = nextLoad;
    }

    if (descanso !== undefined || restTime !== undefined || restSeconds !== undefined) {
      const nextRest = Math.max(
        0,
        normalizeInteger(
          restTime !== undefined ? restTime : restSeconds !== undefined ? restSeconds : descanso,
          current.restTime || 30
        )
      );
      payload.restTime = nextRest;
      payload.restSeconds = nextRest;
    }

    if (
      observation !== undefined ||
      observacao !== undefined ||
      notes !== undefined ||
      note !== undefined
    ) {
      payload.observation = normalizeString(observacao || observation || notes || note);
    }

    const updated = await exercisesRepository.updateExercise({
      workoutId: normalizedWorkoutId,
      workoutExerciseId: normalizedWorkoutExerciseId,
      data: payload,
    });

    if (!updated) {
      throw new AppError("Exercicio do treino nao encontrado.", 404, "WORKOUT_EXERCISE_NOT_FOUND");
    }

    return updated;
  }

  async function removeWorkoutExercise({ authUser, workoutId, workoutExerciseId }) {
    const normalizedWorkoutId = normalizeInteger(workoutId);
    const normalizedWorkoutExerciseId = normalizeInteger(workoutExerciseId);
    if (!normalizedWorkoutId || !normalizedWorkoutExerciseId) {
      throw new AppError("workoutId e workoutExerciseId sao obrigatorios.", 400, "VALIDATION_ERROR");
    }

    await workoutsService.ensureWorkoutAccess(authUser, normalizedWorkoutId, { forManagement: true });
    const removed = await exercisesRepository.deleteExercise({
      workoutId: normalizedWorkoutId,
      workoutExerciseId: normalizedWorkoutExerciseId,
    });

    if (!removed) {
      throw new AppError("Exercicio do treino nao encontrado.", 404, "WORKOUT_EXERCISE_NOT_FOUND");
    }

    return removed;
  }

  return {
    createExercise,
    listWorkoutExercises,
    setWorkoutExerciseCompleted,
    replaceWorkoutExercise,
    updateWorkoutExerciseLoad,
    updateWorkoutExercise,
    removeWorkoutExercise,
    calculateProgress,
  };
}

module.exports = {
  createExercisesService,
};
