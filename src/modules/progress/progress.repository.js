function createProgressRepository({ prisma }) {
  let ensureTablesPromise = null;

  async function ensureProgressTables() {
    if (ensureTablesPromise) return ensureTablesPromise;

    ensureTablesPromise = (async () => {
      await prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS body_metric (
  id SERIAL PRIMARY KEY,
  user_id integer NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  date_key text NOT NULL,
  weight_kg double precision NULL,
  height_cm double precision NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date_key)
);
      `);

      await prisma.$executeRawUnsafe(`
CREATE INDEX IF NOT EXISTS idx_body_metric_user_date
  ON body_metric (user_id, date_key);
      `);

      await prisma.$executeRawUnsafe(`
CREATE INDEX IF NOT EXISTS idx_body_metric_created_at
  ON body_metric (created_at);
      `);

      await prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS progress_record (
  id SERIAL PRIMARY KEY,
  user_id integer NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  workout_id integer NULL,
  exercise_id integer NULL,
  load double precision NOT NULL DEFAULT 0,
  repetitions integer NOT NULL DEFAULT 0,
  date_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
      `);

      await prisma.$executeRawUnsafe(`
CREATE INDEX IF NOT EXISTS idx_progress_record_user_date
  ON progress_record (user_id, date_value);
      `);

      await prisma.$executeRawUnsafe(`
CREATE INDEX IF NOT EXISTS idx_progress_record_created_at
  ON progress_record (created_at);
      `);
    })()
      .catch((error) => {
        throw error;
      })
      .finally(() => {
        ensureTablesPromise = null;
      });

    return ensureTablesPromise;
  }

  function normalizeDateKey(value) {
    return String(value || "").trim();
  }

  function normalizeNumber(value) {
    if (value === undefined || value === null || value === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function normalizeRecord(row) {
    if (!row || typeof row !== "object") return null;
    return {
      id: Number(row.id) || 0,
      userId: Number(row.user_id || row.userId) || 0,
      workoutId: Number(row.workout_id || row.workoutId) || 0,
      exerciseId: Number(row.exercise_id || row.exerciseId) || 0,
      load: Number(row.load || 0),
      repetitions: Number(row.repetitions || 0),
      date: String(row.date_value || row.date || "").trim(),
      createdAt: row.created_at
        ? new Date(row.created_at).toISOString()
        : row.createdAt
          ? new Date(row.createdAt).toISOString()
          : null,
      updatedAt: row.updated_at
        ? new Date(row.updated_at).toISOString()
        : row.updatedAt
          ? new Date(row.updatedAt).toISOString()
          : null,
    };
  }

  function normalizeBodyMetricRecord(row) {
    if (!row || typeof row !== "object") return null;
    return {
      id: Number(row.id) || 0,
      userId: Number(row.user_id || row.userId) || 0,
      recordType: "BODY_METRICS",
      dateKey: normalizeDateKey(row.date_key || row.dateKey),
      weightKg: normalizeNumber(row.weight_kg !== undefined ? row.weight_kg : row.weightKg),
      heightCm: normalizeNumber(row.height_cm !== undefined ? row.height_cm : row.heightCm),
      createdAt: row.created_at
        ? new Date(row.created_at).toISOString()
        : row.createdAt
          ? new Date(row.createdAt).toISOString()
          : null,
      updatedAt: row.updated_at
        ? new Date(row.updated_at).toISOString()
        : row.updatedAt
          ? new Date(row.updatedAt).toISOString()
          : null,
    };
  }

  async function createRecord(data) {
    await ensureProgressTables();

    const rows = await prisma.$queryRawUnsafe(
      `
INSERT INTO progress_record (
  user_id, workout_id, exercise_id, load, repetitions, date_value, updated_at
)
VALUES ($1, $2, $3, $4, $5, $6, now())
RETURNING id, user_id, workout_id, exercise_id, load, repetitions, date_value, created_at, updated_at
      `,
      Number(data && data.userId) || 0,
      Number(data && data.workoutId) || 0,
      Number(data && data.exerciseId) || 0,
      Number(data && data.load) || 0,
      Number(data && data.repetitions) || 0,
      String((data && data.date) || "").trim()
    );

    return normalizeRecord(Array.isArray(rows) ? rows[0] : null);
  }

  async function listByUserId(userId) {
    await ensureProgressTables();

    const rows = await prisma.$queryRawUnsafe(
      `
SELECT id, user_id, workout_id, exercise_id, load, repetitions, date_value, created_at, updated_at
FROM progress_record
WHERE user_id = $1
ORDER BY created_at DESC, id DESC
      `,
      Number(userId) || 0
    );

    return (Array.isArray(rows) ? rows : [])
      .map((row) => normalizeRecord(row))
      .filter(Boolean);
  }

  async function upsertBodyMetrics({ userId, dateKey, weightKg, heightCm }) {
    const normalizedUserId = Number(userId) || 0;
    const normalizedDateKey = normalizeDateKey(dateKey);
    if (!normalizedUserId || !normalizedDateKey) return null;

    const normalizedWeightKg = normalizeNumber(weightKg);
    const normalizedHeightCm = normalizeNumber(heightCm);

    await ensureProgressTables();

    const rows = await prisma.$queryRawUnsafe(
      `
INSERT INTO body_metric (
  user_id, date_key, weight_kg, height_cm, updated_at
)
VALUES ($1, $2, $3, $4, now())
ON CONFLICT (user_id, date_key)
DO UPDATE
SET weight_kg = COALESCE(EXCLUDED.weight_kg, body_metric.weight_kg),
    height_cm = COALESCE(EXCLUDED.height_cm, body_metric.height_cm),
    updated_at = now()
RETURNING id, user_id, date_key, weight_kg, height_cm, created_at, updated_at
      `,
      normalizedUserId,
      normalizedDateKey,
      normalizedWeightKg,
      normalizedHeightCm
    );

    return normalizeBodyMetricRecord(Array.isArray(rows) ? rows[0] : null);
  }

  async function listLatestBodyMetricsByUserIds(userIds) {
    const normalizedIds = Array.isArray(userIds)
      ? [...new Set(userIds.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0))]
      : [];

    if (!normalizedIds.length) return [];

    await ensureProgressTables();

    const rows = await prisma.$queryRawUnsafe(
      `
SELECT user_id, date_key, weight_kg, height_cm, updated_at
FROM body_metric
WHERE user_id = ANY($1::int[])
ORDER BY user_id ASC, date_key ASC, updated_at ASC
      `,
      normalizedIds
    );

    const recordsByUserId = new Map();
    const compareRecency = (leftDateKey, leftUpdatedAt, rightDateKey, rightUpdatedAt) => {
      const safeLeftDateKey = String(leftDateKey || "").trim();
      const safeRightDateKey = String(rightDateKey || "").trim();
      if (safeLeftDateKey !== safeRightDateKey) {
        return safeLeftDateKey.localeCompare(safeRightDateKey);
      }

      const leftTime = leftUpdatedAt ? new Date(leftUpdatedAt).getTime() : 0;
      const rightTime = rightUpdatedAt ? new Date(rightUpdatedAt).getTime() : 0;
      return leftTime - rightTime;
    };

    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const userId = Number(row && row.user_id) || 0;
      if (!userId) return;

      const nextDateKey = String((row && row.date_key) || "").trim();
      const nextUpdatedAt = row && row.updated_at ? String(row.updated_at) : "";
      const nextWeight = normalizeNumber(row && row.weight_kg);
      const nextHeight = normalizeNumber(row && row.height_cm);
      const current = recordsByUserId.get(userId) || {
        userId,
        recordType: "BODY_METRICS",
        dateKey: "",
        updatedAt: "",
        weightKg: null,
        heightCm: null,
        _weightDateKey: "",
        _weightUpdatedAt: "",
        _heightDateKey: "",
        _heightUpdatedAt: "",
      };

      if (compareRecency(current.dateKey, current.updatedAt, nextDateKey, nextUpdatedAt) < 0) {
        current.dateKey = nextDateKey;
        current.updatedAt = nextUpdatedAt;
      }

      if (nextWeight !== null) {
        const weightRecency = compareRecency(
          current._weightDateKey,
          current._weightUpdatedAt,
          nextDateKey,
          nextUpdatedAt
        );
        if (weightRecency < 0) {
          current.weightKg = nextWeight;
          current._weightDateKey = nextDateKey;
          current._weightUpdatedAt = nextUpdatedAt;
        }
      }

      if (nextHeight !== null) {
        const heightRecency = compareRecency(
          current._heightDateKey,
          current._heightUpdatedAt,
          nextDateKey,
          nextUpdatedAt
        );
        if (heightRecency < 0) {
          current.heightCm = nextHeight;
          current._heightDateKey = nextDateKey;
          current._heightUpdatedAt = nextUpdatedAt;
        }
      }

      recordsByUserId.set(userId, current);
    });

    return normalizedIds
      .map((userId) => {
        const record = recordsByUserId.get(userId);
        if (!record) return null;
        const {
          _weightDateKey,
          _weightUpdatedAt,
          _heightDateKey,
          _heightUpdatedAt,
          ...cleanRecord
        } = record;
        return cleanRecord;
      })
      .filter(Boolean);
  }

  async function listWeeklyChecksByWeekStart({ userId, weekStartKey }) {
    return prisma.weeklyTrainingCheck.findMany({
      where: {
        userId: Number(userId),
        weekStartKey,
      },
      select: {
        dateKey: true,
      },
      orderBy: {
        dateKey: "asc",
      },
    });
  }

  async function listWeeklyChecksByUsersAndWeekStart({ userIds, weekStartKey }) {
    const normalizedIds = Array.isArray(userIds)
      ? [...new Set(userIds.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0))]
      : [];
    const normalizedWeekStartKey = String(weekStartKey || "").trim();

    if (!normalizedIds.length || !normalizedWeekStartKey) return [];

    // Workaround for Prisma+adapter-pg issue seen with `in` filter on WeeklyTrainingCheck.
    const batches = await Promise.all(
      normalizedIds.map((userId) =>
        prisma.weeklyTrainingCheck.findMany({
          where: {
            userId,
            weekStartKey: normalizedWeekStartKey,
          },
          select: {
            userId: true,
            dateKey: true,
          },
          orderBy: {
            dateKey: "asc",
          },
        })
      )
    );

    return batches
      .flat()
      .sort(
        (left, right) =>
          (Number(left && left.userId) || 0) - (Number(right && right.userId) || 0) ||
          String((left && left.dateKey) || "").localeCompare(String((right && right.dateKey) || ""))
      );
  }

  async function upsertWeeklyCheck({ userId, dateKey, weekStartKey }) {
    return prisma.weeklyTrainingCheck.upsert({
      where: {
        userId_dateKey: {
          userId: Number(userId),
          dateKey,
        },
      },
      create: {
        userId: Number(userId),
        dateKey,
        weekStartKey,
      },
      update: {
        weekStartKey,
      },
    });
  }

  async function removeWeeklyCheck({ userId, dateKey }) {
    return prisma.weeklyTrainingCheck.deleteMany({
      where: {
        userId: Number(userId),
        dateKey,
      },
    });
  }

  async function listWorkoutCompletionsByUser({
    userId,
    limit = 180,
    completedDateFrom = "",
    completedDateTo = "",
  }) {
    const normalizedUserId = Number(userId) || 0;
    if (!normalizedUserId) return [];

    const normalizedLimit = Math.max(1, Math.min(1000, Number(limit) || 180));
    const where = {
      userId: normalizedUserId,
    };

    if (completedDateFrom || completedDateTo) {
      where.completedDateKey = {};
      if (completedDateFrom) where.completedDateKey.gte = String(completedDateFrom).trim();
      if (completedDateTo) where.completedDateKey.lte = String(completedDateTo).trim();
    }

    return prisma.workoutCompletion.findMany({
      where,
      orderBy: [
        { completedAt: "desc" },
        { id: "desc" },
      ],
      take: normalizedLimit,
    });
  }

  async function upsertWorkoutCompletion({
    userId,
    workoutId,
    completedDateKey,
    completedAt,
    workoutTitle,
    durationMinutes,
    kcal,
    groupKey,
    thumbnailUrl,
    coverImageUrl,
    exerciseCount,
    snapshot,
    sourceUpdatedAt,
  }) {
    return prisma.workoutCompletion.upsert({
      where: {
        userId_workoutId_completedDateKey: {
          userId: Number(userId),
          workoutId: Number(workoutId),
          completedDateKey: String(completedDateKey).trim(),
        },
      },
      create: {
        userId: Number(userId),
        workoutId: Number(workoutId),
        completedDateKey: String(completedDateKey).trim(),
        completedAt: completedAt ? new Date(completedAt) : new Date(),
        workoutTitle: String(workoutTitle || "").trim(),
        durationMinutes: Math.max(1, Number(durationMinutes) || 1),
        kcal: Math.max(0, Number(kcal) || 0),
        groupKey: String(groupKey || "").trim(),
        thumbnailUrl: String(thumbnailUrl || "").trim(),
        coverImageUrl: String(coverImageUrl || "").trim(),
        exerciseCount: Math.max(0, Number(exerciseCount) || 0),
        snapshot: snapshot && typeof snapshot === "object" ? snapshot : null,
        sourceUpdatedAt: sourceUpdatedAt ? new Date(sourceUpdatedAt) : null,
      },
      update: {
        completedAt: completedAt ? new Date(completedAt) : new Date(),
        workoutTitle: String(workoutTitle || "").trim(),
        durationMinutes: Math.max(1, Number(durationMinutes) || 1),
        kcal: Math.max(0, Number(kcal) || 0),
        groupKey: String(groupKey || "").trim(),
        thumbnailUrl: String(thumbnailUrl || "").trim(),
        coverImageUrl: String(coverImageUrl || "").trim(),
        exerciseCount: Math.max(0, Number(exerciseCount) || 0),
        snapshot: snapshot && typeof snapshot === "object" ? snapshot : null,
        sourceUpdatedAt: sourceUpdatedAt ? new Date(sourceUpdatedAt) : null,
      },
    });
  }

  return {
    createRecord,
    listByUserId,
    upsertBodyMetrics,
    listLatestBodyMetricsByUserIds,
    listWeeklyChecksByWeekStart,
    listWeeklyChecksByUsersAndWeekStart,
    upsertWeeklyCheck,
    removeWeeklyCheck,
    listWorkoutCompletionsByUser,
    upsertWorkoutCompletion,
  };
}

module.exports = {
  createProgressRepository,
};
