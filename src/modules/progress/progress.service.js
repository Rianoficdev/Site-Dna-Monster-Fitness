const { AppError } = require("../../utils/AppError");

function createProgressService({
  progressRepository,
  workoutsService,
  exercisesRepository,
  libraryRepository,
  userRepository,
}) {
  const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
  const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
  const TRAINER_REPORT_ROLES = new Set(["INSTRUTOR", "ADMIN_GERAL"]);
  const BODY_METRICS_RECORD_TYPE = "BODY_METRICS";
  const BODY_METRICS_MIN_WEIGHT_KG = 20;
  const BODY_METRICS_MAX_WEIGHT_KG = 400;
  const BODY_METRICS_MIN_HEIGHT_CM = 80;
  const BODY_METRICS_MAX_HEIGHT_CM = 260;

  function parseDateKey(dateKey, fieldName = "dateKey") {
    const normalized = String(dateKey || "").trim();
    if (!DATE_KEY_REGEX.test(normalized)) {
      throw new AppError(`${fieldName} inválido. Use o formato YYYY-MM-DD.`, 400, "VALIDATION_ERROR");
    }

    const [yearRaw, monthRaw, dayRaw] = normalized.split("-");
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const day = Number(dayRaw);

    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      throw new AppError(`${fieldName} inválido. Use uma data real.`, 400, "VALIDATION_ERROR");
    }

    return parsed;
  }

  function toDateKeyUtc(date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function startOfWeekMondayUtc(date) {
    const normalized = new Date(date);
    normalized.setUTCHours(0, 0, 0, 0);
    const mondayOffset = (normalized.getUTCDay() + 6) % 7; // Mon=0 ... Sun=6
    normalized.setUTCDate(normalized.getUTCDate() - mondayOffset);
    return normalized;
  }

  function getWeekDateKeys(referenceDate) {
    const start = startOfWeekMondayUtc(referenceDate);
    return WEEKDAY_LABELS.map((_, index) => {
      const day = new Date(start);
      day.setUTCDate(start.getUTCDate() + index);
      return toDateKeyUtc(day);
    });
  }

  function normalizeReferenceDateKey(referenceDateKey) {
    if (referenceDateKey) {
      return toDateKeyUtc(parseDateKey(referenceDateKey, "referenceDateKey"));
    }

    const now = new Date();
    const local = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    return toDateKeyUtc(local);
  }

  function normalizeDone(done) {
    if (done === undefined || done === null) return true;
    if (done === true || done === false) return done;
    if (typeof done === "string") return done.trim().toLowerCase() === "true";
    return Boolean(done);
  }

  function normalizeRole(role) {
    return String(role || "").trim().toUpperCase();
  }

  function normalizeMetricType(metricType) {
    return String(metricType || "").trim().toUpperCase();
  }

  function normalizeString(value) {
    return String(value || "").trim();
  }

  function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function toOptionalNumber(value) {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function normalizeBodyMetricValue({ value, fieldName, min, max, decimals = 1 }) {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new AppError(`${fieldName} inválido.`, 400, "VALIDATION_ERROR");
    }

    if (parsed < min || parsed > max) {
      throw new AppError(`${fieldName} deve estar entre ${min} e ${max}.`, 400, "VALIDATION_ERROR");
    }

    if (decimals <= 0) return Math.round(parsed);
    return Number(parsed.toFixed(decimals));
  }

  function normalizeBodyMetricsDateKey(dateKey, date) {
    const normalizedDateKey = String(dateKey || "").trim();
    if (normalizedDateKey) return toDateKeyUtc(parseDateKey(normalizedDateKey, "dateKey"));

    const normalizedDate = String(date || "").trim();
    if (normalizedDate) {
      if (DATE_KEY_REGEX.test(normalizedDate)) {
        return toDateKeyUtc(parseDateKey(normalizedDate, "date"));
      }

      const parsedDate = new Date(normalizedDate);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new AppError("date inválido.", 400, "VALIDATION_ERROR");
      }

      return toDateKeyUtc(parsedDate);
    }

    return normalizeReferenceDateKey();
  }

  function normalizeHistoryLimit(limit, fallback = 180) {
    const parsed = Number(limit);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.max(1, Math.min(1000, Math.trunc(parsed)));
  }

  function normalizeGroupKey(value) {
    return normalizeString(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function estimateExerciseKcal(exercise) {
    const durationSeconds = Math.max(0, toNumber(exercise && exercise.durationSeconds, 0));
    const restSeconds = Math.max(0, toNumber(exercise && exercise.restSeconds, 0));
    const repetitions = Math.max(1, toNumber(exercise && exercise.repetitions, 10));
    const activeMinutes = (durationSeconds + restSeconds) / 60;
    const kcal = activeMinutes * 7 + repetitions * 0.18;
    return Math.max(1, Number(kcal.toFixed(1)));
  }

  async function getWorkoutExercises(workoutId) {
    if (!exercisesRepository || typeof exercisesRepository.listByWorkoutId !== "function") return [];
    const list = await exercisesRepository.listByWorkoutId(workoutId);
    return Array.isArray(list) ? list : [];
  }

  function getLibraryExerciseById(exerciseId) {
    if (!libraryRepository || typeof libraryRepository.findById !== "function") return null;
    return libraryRepository.findById(exerciseId, { includeInactive: true });
  }

  async function getStudentsByIds(studentIds) {
    if (!userRepository || typeof userRepository.listUsers !== "function") return new Map();
    const users = await userRepository.listUsers();
    const normalizedIds = new Set(
      (Array.isArray(studentIds) ? studentIds : [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
    );

    const map = new Map();
    users
      .filter((user) => normalizedIds.has(Number(user && user.id)))
      .forEach((user) => map.set(Number(user.id), user));

    return map;
  }

  function buildWeeklySummary({ referenceDateKey, doneKeys }) {
    const referenceDate = parseDateKey(referenceDateKey, "referenceDateKey");
    const weekDateKeys = getWeekDateKeys(referenceDate);
    const weekStartKey = weekDateKeys[0];
    const currentKey = toDateKeyUtc(referenceDate);
    const weekSet = new Set(weekDateKeys);
    const doneSet = new Set(
      Array.isArray(doneKeys)
        ? doneKeys.filter((dateKey) => typeof dateKey === "string" && weekSet.has(dateKey))
        : []
    );

    const days = WEEKDAY_LABELS.map((label, index) => {
      const dateKey = weekDateKeys[index];
      const done = doneSet.has(dateKey);
      return {
        label,
        dateKey,
        done,
        isCurrent: dateKey === currentKey && !done,
      };
    });

    return {
      weekStartKey,
      referenceDateKey: currentKey,
      doneCount: days.filter((day) => day.done).length,
      days,
    };
  }

  function getWorkoutTitle(workout) {
    return normalizeString(workout && (workout.title || workout.name || workout.code)) || "Treino";
  }

  function getCompletionDateKey({ completedDateKey, completedAt }) {
    if (completedDateKey) {
      return toDateKeyUtc(parseDateKey(completedDateKey, "completedDateKey"));
    }

    if (completedAt) {
      const parsedCompletedAt = new Date(String(completedAt));
      if (!Number.isNaN(parsedCompletedAt.getTime())) {
        return toDateKeyUtc(parsedCompletedAt);
      }
    }

    return normalizeReferenceDateKey();
  }

  function getCompletionTimestamp(completedAt, completedDateKey) {
    if (completedAt) {
      const parsed = new Date(String(completedAt));
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    }

    const safeDateKey = getCompletionDateKey({ completedDateKey });
    return new Date(`${safeDateKey}T12:00:00.000Z`).toISOString();
  }

  function estimateWorkoutDurationMinutes(exercises) {
    const totalSeconds = (Array.isArray(exercises) ? exercises : []).reduce((sum, exercise) => {
      const durationSeconds = Math.max(0, toNumber(exercise && exercise.durationSeconds, 0));
      const restSeconds = Math.max(0, toNumber(exercise && (exercise.restSeconds || exercise.restTime), 0));
      return sum + durationSeconds + restSeconds;
    }, 0);

    return Math.max(1, Math.round(totalSeconds / 60));
  }

  function estimateWorkoutCalories(exercises) {
    const totalKcal = (Array.isArray(exercises) ? exercises : []).reduce(
      (sum, exercise) => sum + estimateExerciseKcal(exercise),
      0
    );
    return Number(totalKcal.toFixed(1));
  }

  function getWorkoutPrimaryGroupKey(exercises) {
    const groupsCounter = new Map();

    (Array.isArray(exercises) ? exercises : []).forEach((exercise) => {
      const libraryExercise = getLibraryExerciseById(exercise && exercise.exerciseId);
      const rawGroup = libraryExercise
        ? libraryExercise.muscleGroup || libraryExercise.group
        : exercise && (exercise.group || exercise.muscleGroup || exercise.muscle_group);
      const groupKey = normalizeGroupKey(rawGroup);
      if (!groupKey) return;
      groupsCounter.set(groupKey, (groupsCounter.get(groupKey) || 0) + 1);
    });

    if (!groupsCounter.size) return "";

    return Array.from(groupsCounter.entries())
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return String(a[0]).localeCompare(String(b[0]), "pt-BR");
      })[0][0];
  }

  function getWorkoutThumbnailUrl({ workout, exercises }) {
    const coverImageUrl = normalizeString(
      workout && (workout.coverImageUrl || workout.cover_image_url || workout.coverUrl || workout.cover_url)
    );
    if (coverImageUrl) return coverImageUrl;

    const firstExerciseWithImage = (Array.isArray(exercises) ? exercises : []).find((exercise) =>
      normalizeString(exercise && exercise.imageUrl)
    );

    return normalizeString(firstExerciseWithImage && firstExerciseWithImage.imageUrl);
  }

  function buildWorkoutCompletionSnapshot({ workout, exercises }) {
    const safeExercises = Array.isArray(exercises) ? exercises : [];
    return {
      workout: {
        id: Number(workout && workout.id) || 0,
        title: getWorkoutTitle(workout),
        description: normalizeString(workout && (workout.description || workout.observations || workout.observacoes)),
        objective: normalizeString(workout && (workout.objective || workout.objetivo)),
        status: workout && workout.isActive === false ? "INATIVO" : "ATIVO",
        weekDays: Array.isArray(workout && workout.weekDays)
          ? workout.weekDays.map((day) => normalizeString(day)).filter(Boolean)
          : [],
        coverImageUrl: normalizeString(
          workout && (workout.coverImageUrl || workout.cover_image_url || workout.coverUrl || workout.cover_url)
        ),
        createdAt: workout && workout.createdAt ? workout.createdAt : null,
        updatedAt: workout && workout.updatedAt ? workout.updatedAt : null,
      },
      exercises: safeExercises.map((exercise) => {
        const libraryExercise = getLibraryExerciseById(exercise && exercise.exerciseId);
        const groupKey = normalizeGroupKey(
          (libraryExercise && (libraryExercise.muscleGroup || libraryExercise.group)) ||
            (exercise && (exercise.group || exercise.muscleGroup || exercise.muscle_group))
        );

        return {
          workoutExerciseId: Number(exercise && exercise.id) || 0,
          libraryExerciseId: Number(exercise && exercise.exerciseId) || 0,
          order: Math.max(1, toNumber(exercise && exercise.order, 1)),
          name: normalizeString(exercise && exercise.name) || "Exercício",
          description: normalizeString(exercise && exercise.description),
          tutorialText: normalizeString(exercise && exercise.tutorialText),
          observation: normalizeString(
            exercise && (exercise.observation || exercise.observacao || exercise.note || exercise.notes)
          ),
          groupKey,
          imageUrl: normalizeString(exercise && exercise.imageUrl),
          videoUrl: normalizeString(exercise && (exercise.videoUrl || exercise.animationUrl)),
          series: Math.max(1, toNumber(exercise && exercise.series, 1)),
          repetitions: Math.max(1, toNumber(exercise && (exercise.reps || exercise.repetitions), 1)),
          durationSeconds: Math.max(0, toNumber(exercise && exercise.durationSeconds, 0)),
          restSeconds: Math.max(0, toNumber(exercise && (exercise.restSeconds || exercise.restTime), 0)),
          loadKg: Math.max(0, toNumber(exercise && (exercise.load || exercise.loadKg), 0)),
          caloriesEstimate: estimateExerciseKcal(exercise),
        };
      }),
    };
  }

  function toWorkoutCompletionResponse(record) {
    if (!record) return null;

    return {
      id: Number(record.id) || 0,
      userId: Number(record.userId) || 0,
      workoutId: Number(record.workoutId) || 0,
      completedDateKey: normalizeString(record.completedDateKey),
      completedAt: record.completedAt ? new Date(record.completedAt).toISOString() : null,
      title: normalizeString(record.workoutTitle) || "Treino",
      durationMinutes: Math.max(1, toNumber(record.durationMinutes, 1)),
      kcal: Math.max(0, Number(toNumber(record.kcal, 0).toFixed(1))),
      group: normalizeGroupKey(record.groupKey),
      groupKey: normalizeGroupKey(record.groupKey),
      thumbnail: normalizeString(record.thumbnailUrl),
      thumbnailUrl: normalizeString(record.thumbnailUrl),
      coverImageUrl: normalizeString(record.coverImageUrl),
      exerciseCount: Math.max(0, toNumber(record.exerciseCount, 0)),
      snapshot: record.snapshot && typeof record.snapshot === "object" ? record.snapshot : null,
      sourceUpdatedAt: record.sourceUpdatedAt ? new Date(record.sourceUpdatedAt).toISOString() : null,
    };
  }

  async function registerProgress({
    userId,
    workoutId,
    exerciseId,
    load,
    repetitions,
    date,
    dateKey,
    metricType,
    recordType,
    weightKg,
    heightCm,
  }) {
    const normalizedMetricType = normalizeMetricType(metricType || recordType);
    if (normalizedMetricType === BODY_METRICS_RECORD_TYPE) {
      if (!userId) {
        throw new AppError("Usuário não autenticado.", 401, "UNAUTHORIZED");
      }

      const safeWeightKg = normalizeBodyMetricValue({
        value: weightKg,
        fieldName: "weightKg",
        min: BODY_METRICS_MIN_WEIGHT_KG,
        max: BODY_METRICS_MAX_WEIGHT_KG,
        decimals: 1,
      });
      const safeHeightCm = normalizeBodyMetricValue({
        value: heightCm,
        fieldName: "heightCm",
        min: BODY_METRICS_MIN_HEIGHT_CM,
        max: BODY_METRICS_MAX_HEIGHT_CM,
        decimals: 0,
      });

      if (safeWeightKg === null && safeHeightCm === null) {
        throw new AppError("Informe ao menos weightKg ou heightCm.", 400, "VALIDATION_ERROR");
      }

      const safeDateKey = normalizeBodyMetricsDateKey(dateKey, date);

      return progressRepository.upsertBodyMetrics({
        userId: Number(userId),
        dateKey: safeDateKey,
        weightKg: safeWeightKg,
        heightCm: safeHeightCm,
      });
    }

    if (!userId || !workoutId || !exerciseId || load === undefined || !repetitions || !date) {
      throw new AppError(
        "Campos obrigatórios: userId, workoutId, exerciseId, load, repetitions, date.",
        400,
        "VALIDATION_ERROR"
      );
    }

    await workoutsService.ensureWorkoutExists(workoutId);

    return progressRepository.createRecord({
      userId: Number(userId),
      workoutId: Number(workoutId),
      exerciseId: Number(exerciseId),
      load: Number(load),
      repetitions: Number(repetitions),
      date,
    });
  }

  async function listMyProgress(userId) {
    return progressRepository.listByUserId(userId);
  }

  async function getWeeklySummary({ userId, referenceDateKey }) {
    if (!userId) {
      throw new AppError("Usuário não autenticado.", 401, "UNAUTHORIZED");
    }

    const normalizedReferenceDateKey = normalizeReferenceDateKey(referenceDateKey);
    const referenceDate = parseDateKey(normalizedReferenceDateKey, "referenceDateKey");
    const weekStartKey = toDateKeyUtc(startOfWeekMondayUtc(referenceDate));

    const weekChecks = await progressRepository.listWeeklyChecksByWeekStart({
      userId: Number(userId),
      weekStartKey,
    });

    return buildWeeklySummary({
      referenceDateKey: normalizedReferenceDateKey,
      doneKeys: weekChecks.map((item) => item.dateKey),
    });
  }

  async function setWeeklyDayStatus({ userId, dateKey, done, referenceDateKey }) {
    if (!userId) {
      throw new AppError("Usuário não autenticado.", 401, "UNAUTHORIZED");
    }

    const normalizedDateKey = toDateKeyUtc(parseDateKey(dateKey, "dateKey"));
    const normalizedReferenceDateKey = normalizeReferenceDateKey(referenceDateKey || normalizedDateKey);
    const referenceDate = parseDateKey(normalizedReferenceDateKey, "referenceDateKey");
    const weekDateKeys = getWeekDateKeys(referenceDate);
    const weekSet = new Set(weekDateKeys);

    if (!weekSet.has(normalizedDateKey)) {
      throw new AppError(
        "A data informada não pertence à semana atual.",
        400,
        "WEEK_DATE_OUT_OF_RANGE"
      );
    }

    const weekStartKey = weekDateKeys[0];
    const shouldMarkDone = normalizeDone(done);

    if (shouldMarkDone) {
      await progressRepository.upsertWeeklyCheck({
        userId: Number(userId),
        dateKey: normalizedDateKey,
        weekStartKey,
      });
    } else {
      await progressRepository.removeWeeklyCheck({
        userId: Number(userId),
        dateKey: normalizedDateKey,
      });
    }

    return getWeeklySummary({
      userId: Number(userId),
      referenceDateKey: normalizedReferenceDateKey,
    });
  }

  async function listWorkoutHistory({
    userId,
    limit,
    completedDateFrom,
    completedDateTo,
  }) {
    if (!userId) {
      throw new AppError("Usuário não autenticado.", 401, "UNAUTHORIZED");
    }

    const safeCompletedDateFrom = completedDateFrom
      ? toDateKeyUtc(parseDateKey(completedDateFrom, "completedDateFrom"))
      : "";
    const safeCompletedDateTo = completedDateTo
      ? toDateKeyUtc(parseDateKey(completedDateTo, "completedDateTo"))
      : "";

    const records = await progressRepository.listWorkoutCompletionsByUser({
      userId: Number(userId),
      limit: normalizeHistoryLimit(limit, 180),
      completedDateFrom: safeCompletedDateFrom,
      completedDateTo: safeCompletedDateTo,
    });

    return (Array.isArray(records) ? records : []).map(toWorkoutCompletionResponse);
  }

  async function completeWorkout({
    authUser,
    workoutId,
    completedAt,
    completedDateKey,
  }) {
    const actorId = Number(authUser && authUser.id) || 0;
    const actorRole = normalizeRole(authUser && authUser.role);

    if (!actorId || !actorRole) {
      throw new AppError("Usuário não autenticado.", 401, "UNAUTHORIZED");
    }

    if (actorRole !== "ALUNO") {
      throw new AppError("Somente o aluno pode concluir o próprio treino.", 403, "FORBIDDEN");
    }

    const workout = await workoutsService.ensureWorkoutAccess(authUser, workoutId, {
      forManagement: false,
    });
    const exercises = await getWorkoutExercises(workout && workout.id);
    const normalizedCompletedDateKey = getCompletionDateKey({
      completedDateKey,
      completedAt,
    });
    const normalizedCompletedAt = getCompletionTimestamp(completedAt, normalizedCompletedDateKey);
    const durationMinutes = estimateWorkoutDurationMinutes(exercises);
    const kcal = estimateWorkoutCalories(exercises);
    const groupKey = getWorkoutPrimaryGroupKey(exercises);
    const thumbnailUrl = getWorkoutThumbnailUrl({ workout, exercises });
    const snapshot = buildWorkoutCompletionSnapshot({ workout, exercises });

    const completion = await progressRepository.upsertWorkoutCompletion({
      userId: actorId,
      workoutId: Number(workout.id),
      completedDateKey: normalizedCompletedDateKey,
      completedAt: normalizedCompletedAt,
      workoutTitle: getWorkoutTitle(workout),
      durationMinutes,
      kcal,
      groupKey,
      thumbnailUrl,
      coverImageUrl: normalizeString(
        workout && (workout.coverImageUrl || workout.cover_image_url || workout.coverUrl || workout.cover_url)
      ),
      exerciseCount: exercises.length,
      snapshot,
      sourceUpdatedAt: workout && workout.updatedAt ? workout.updatedAt : null,
    });

    const weekStartKey = toDateKeyUtc(
      startOfWeekMondayUtc(parseDateKey(normalizedCompletedDateKey, "completedDateKey"))
    );

    await progressRepository.upsertWeeklyCheck({
      userId: actorId,
      dateKey: normalizedCompletedDateKey,
      weekStartKey,
    });

    const history = await listWorkoutHistory({
      userId: actorId,
      limit: 180,
    });
    const summary = await getWeeklySummary({
      userId: actorId,
      referenceDateKey: normalizedCompletedDateKey,
    });

    return {
      completion: toWorkoutCompletionResponse(completion),
      history,
      summary,
    };
  }

  async function getInstructorStudentsReport({ authUser, referenceDateKey }) {
    const actorId = Number(authUser && authUser.id) || 0;
    const actorRole = normalizeRole(authUser && authUser.role);

    if (!actorId || !actorRole) {
      throw new AppError("Usuário não autenticado.", 401, "UNAUTHORIZED");
    }

    if (!TRAINER_REPORT_ROLES.has(actorRole)) {
      throw new AppError("Acesso negado para este perfil.", 403, "FORBIDDEN");
    }

    const normalizedReferenceDateKey = normalizeReferenceDateKey(referenceDateKey);
    const referenceDate = parseDateKey(normalizedReferenceDateKey, "referenceDateKey");
    const weekDateKeys = getWeekDateKeys(referenceDate);
    const weekStartKey = weekDateKeys[0];
    const weekEndKey = weekDateKeys[weekDateKeys.length - 1];

    const workouts = await workoutsService.listMyWorkouts({
      id: actorId,
      role: actorRole,
    });
    const normalizedWorkouts = Array.isArray(workouts) ? workouts : [];
    const workoutsByStudentId = new Map();

    normalizedWorkouts.forEach((workout) => {
      const studentId = Number(workout && workout.studentId) || 0;
      if (!studentId) return;
      if (!workoutsByStudentId.has(studentId)) workoutsByStudentId.set(studentId, []);
      workoutsByStudentId.get(studentId).push(workout);
    });

    const workoutStudentIds = Array.from(workoutsByStudentId.keys());
    const studentsById = new Map();

    if (userRepository && typeof userRepository.listUsers === "function") {
      const users = await userRepository.listUsers();
      (Array.isArray(users) ? users : [])
        .filter((user) => normalizeRole(user && user.role) === "ALUNO")
        .forEach((user) => {
          const studentId = Number(user && user.id) || 0;
          if (!studentId) return;
          studentsById.set(studentId, user);
        });
    }

    if (!studentsById.size && workoutStudentIds.length) {
      const fallbackStudentsById = await getStudentsByIds(workoutStudentIds);
      fallbackStudentsById.forEach((student, studentId) => {
        const normalizedStudentId = Number(studentId) || 0;
        if (!normalizedStudentId) return;
        studentsById.set(normalizedStudentId, student);
      });
    }

    const studentIds = studentsById.size ? Array.from(studentsById.keys()) : workoutStudentIds;
    const latestBodyMetrics = progressRepository.listLatestBodyMetricsByUserIds
      ? await progressRepository.listLatestBodyMetricsByUserIds(studentIds)
      : [];
    const weeklyChecks = await progressRepository.listWeeklyChecksByUsersAndWeekStart({
      userIds: studentIds,
      weekStartKey,
    });
    const bodyMetricsByStudentId = new Map();
    (Array.isArray(latestBodyMetrics) ? latestBodyMetrics : []).forEach((record) => {
      const studentId = Number(record && record.userId) || 0;
      if (!studentId) return;
      bodyMetricsByStudentId.set(studentId, record);
    });

    const checksByStudentId = new Map();
    (Array.isArray(weeklyChecks) ? weeklyChecks : []).forEach((item) => {
      const studentId = Number(item && item.userId) || 0;
      const dateKey = String(item && item.dateKey ? item.dateKey : "").trim();
      if (!studentId || !dateKey) return;
      if (!checksByStudentId.has(studentId)) checksByStudentId.set(studentId, new Set());
      checksByStudentId.get(studentId).add(dateKey);
    });

    const reports = [];
    for (const studentIdRaw of studentIds) {
      const studentId = Number(studentIdRaw) || 0;
      const student = studentsById.get(studentId) || null;
      const studentWorkouts = (workoutsByStudentId.get(studentId) || []).slice();
      const workoutHistory = [];

      for (const workout of studentWorkouts) {
        const exercises = await getWorkoutExercises(workout && workout.id);
        const estimatedSessionSeconds = exercises.reduce((sum, exercise) => {
          const duration = Math.max(0, toNumber(exercise && exercise.durationSeconds, 0));
          const rest = Math.max(0, toNumber(exercise && exercise.restSeconds, 0));
          return sum + duration + rest;
        }, 0);
        const estimatedSessionMinutes = Math.max(1, Math.round(estimatedSessionSeconds / 60));
        const estimatedSessionKcal = Number(
          exercises.reduce((sum, exercise) => sum + estimateExerciseKcal(exercise), 0).toFixed(1)
        );
        const weekDays = Array.isArray(workout && workout.weekDays)
          ? workout.weekDays.map((day) => String(day || "").trim()).filter(Boolean)
          : [];
        const weeklySessions = Math.max(1, weekDays.length);

        workoutHistory.push({
          workoutId: Number(workout && workout.id) || 0,
          title: String((workout && workout.title) || "Treino").trim(),
          description: String((workout && workout.description) || "").trim(),
          days: weekDays,
          daysLabel: weekDays.length ? weekDays.join(", ") : "Sem dias definidos",
          exercisesCount: exercises.length,
          estimatedSessionMinutes,
          estimatedSessionKcal,
          weeklySessions,
          createdAt: workout && workout.createdAt ? workout.createdAt : null,
        });
      }

      workoutHistory.sort((a, b) => {
        const titleCompare = String((a && a.title) || "").localeCompare(
          String((b && b.title) || ""),
          "pt-BR",
          { numeric: true, sensitivity: "base" }
        );
        if (titleCompare !== 0) return titleCompare;

        const aTime = a && a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b && b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });

      const plannedSessionsPerWeek = workoutHistory.reduce(
        (sum, workout) => sum + Math.max(1, Number(workout.weeklySessions) || 1),
        0
      );
      const estimatedMinutesPerWeek = workoutHistory.reduce(
        (sum, workout) =>
          sum +
          Math.max(1, Number(workout.estimatedSessionMinutes) || 1) *
            Math.max(1, Number(workout.weeklySessions) || 1),
        0
      );
      const estimatedKcalPerWeek = Number(
        workoutHistory
          .reduce(
            (sum, workout) =>
              sum +
              (Number(workout.estimatedSessionKcal) || 0) *
                Math.max(1, Number(workout.weeklySessions) || 1),
            0
          )
          .toFixed(1)
      );
      const doneDaysSet = checksByStudentId.get(studentId) || new Set();
      const completedSessions = plannedSessionsPerWeek ? doneDaysSet.size : 0;
      const adherencePercent = plannedSessionsPerWeek
        ? Math.max(0, Math.min(100, Math.round((completedSessions / plannedSessionsPerWeek) * 100)))
        : 0;
      const bodyMetrics = bodyMetricsByStudentId.get(studentId) || null;
      const currentWeightKg = toOptionalNumber(bodyMetrics && bodyMetrics.weightKg);
      const normalizedHeightCm = toOptionalNumber(bodyMetrics && bodyMetrics.heightCm);

      reports.push({
        studentId,
        studentName: String((student && student.name) || `Aluno ${studentId}`).trim(),
        studentEmail: String((student && student.email) || "").trim().toLowerCase(),
        studentPhone: String((student && student.phone) || "").trim(),
        studentStatus: student && student.isEnabled === false ? "Desabilitado" : "Habilitado",
        currentWeightKg: currentWeightKg === null ? null : Number(currentWeightKg.toFixed(1)),
        heightCm: normalizedHeightCm === null ? null : Math.round(normalizedHeightCm),
        totals: {
          assignedWorkouts: workoutHistory.length,
          plannedSessionsPerWeek,
          completedSessions,
          estimatedMinutesPerWeek,
          estimatedKcalPerWeek,
          adherencePercent,
        },
        history: workoutHistory.slice(0, 8),
      });
    }

    reports.sort((a, b) =>
      String(a.studentName || "").localeCompare(String(b.studentName || ""), "pt-BR")
    );

    return {
      weekStartKey,
      weekEndKey,
      referenceDateKey: normalizedReferenceDateKey,
      students: reports,
      stats: {
        totalStudents: reports.length,
        totalAssignedWorkouts: reports.reduce(
          (sum, item) => sum + (Number(item && item.totals && item.totals.assignedWorkouts) || 0),
          0
        ),
        totalCompletedSessions: reports.reduce(
          (sum, item) => sum + (Number(item && item.totals && item.totals.completedSessions) || 0),
          0
        ),
      },
    };
  }

  return {
    registerProgress,
    listMyProgress,
    getWeeklySummary,
    setWeeklyDayStatus,
    listWorkoutHistory,
    completeWorkout,
    getInstructorStudentsReport,
  };
}

module.exports = {
  createProgressService,
};

