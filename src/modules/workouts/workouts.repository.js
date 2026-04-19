function createWorkoutsRepository({ prisma }) {
  let workoutMetadataInitPromise = null;
  let workoutTemplateMetadataInitPromise = null;

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

  function normalizeDateInput(value) {
    if (value === undefined || value === null || value === "") return null;
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  function normalizeWeekDays(weekDays) {
    if (!Array.isArray(weekDays)) return [];
    return weekDays.map((day) => normalizeString(day)).filter(Boolean);
  }

  function normalizeWeekDaysFromMetadata(value) {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => normalizeString(item))
      .filter(Boolean);
  }

  function toIsoDate(value) {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString();
  }

  function withWorkoutCompatibility(workout, metadata = null, template = null) {
    if (!workout) return null;

    const normalized = {
      id: Number(workout.id),
      name: normalizeString(workout.name || workout.title),
      objective: normalizeString(metadata && metadata.objective),
      description: normalizeString(metadata && metadata.description),
      coverImageUrl: normalizeString(
        workout.coverImageUrl ||
        workout.cover_image_url ||
        workout.coverUrl ||
        workout.cover_url ||
        (template && (
          template.coverImageUrl ||
          template.cover_image_url ||
          template.coverUrl ||
          template.cover_url
        ))
      ),
      studentId: normalizeInteger(workout.studentId || workout.student_id, 0),
      createdBy: normalizeInteger(workout.createdBy || workout.created_by || workout.instructorId, 0),
      originTemplateId:
        workout.originTemplateId === null || workout.originTemplateId === undefined
          ? null
          : normalizeInteger(workout.originTemplateId || workout.origin_template_id, 0),
      isActive: workout.isActive !== false && workout.is_active !== false,
      startDate: toIsoDate(workout.startDate || workout.start_date),
      endDate: toIsoDate(workout.endDate || workout.end_date),
      weekDays: normalizeWeekDaysFromMetadata(metadata && metadata.weekDays),
      createdAt: toIsoDate(workout.createdAt || workout.created_at) || nowIso(),
      updatedAt: toIsoDate(workout.updatedAt || workout.updated_at) || nowIso(),
    };

    return {
      ...normalized,
      title: normalized.name,
      instructorId: normalized.createdBy,
      objective: normalized.objective,
      objetivo: normalized.objective,
      observations: normalized.description,
      observacoes: normalized.description,
      coverImageUrl: normalized.coverImageUrl,
      cover_image_url: normalized.coverImageUrl,
      coverUrl: normalized.coverImageUrl,
      cover_url: normalized.coverImageUrl,
      status: normalized.isActive ? "ATIVO" : "INATIVO",
      created_by: normalized.createdBy,
      student_id: normalized.studentId,
      origin_template_id: normalized.originTemplateId,
      is_active: normalized.isActive,
      start_date: normalized.startDate,
      end_date: normalized.endDate,
    };
  }

  function withTemplateCompatibility(template, metadata = null) {
    if (!template) return null;

    const normalized = {
      id: Number(template.id),
      name: normalizeString(template.name),
      description: normalizeString(template.description),
      coverImageUrl: normalizeString(
        (metadata && metadata.coverImageUrl) ||
        template.coverImageUrl ||
        template.cover_image_url ||
        template.coverUrl ||
        template.cover_url
      ),
      createdBy: normalizeInteger(template.createdBy || template.created_by, 0),
      isActive: template.isActive !== false && template.is_active !== false,
      createdAt: toIsoDate(template.createdAt || template.created_at) || nowIso(),
      updatedAt: toIsoDate(template.updatedAt || template.updated_at) || nowIso(),
    };

    return {
      ...normalized,
      cover_image_url: normalized.coverImageUrl,
      coverUrl: normalized.coverImageUrl,
      cover_url: normalized.coverImageUrl,
      created_by: normalized.createdBy,
      is_active: normalized.isActive,
    };
  }

  function withTemplateExerciseCompatibility(item) {
    if (!item) return null;

    const normalized = {
      id: Number(item.id),
      templateId: normalizeInteger(item.templateId || item.template_id, 0),
      exerciseId: normalizeInteger(item.exerciseId || item.exercise_id, 0),
      order: Math.max(1, normalizeInteger(item.order, 1)),
      series: Math.max(1, normalizeInteger(item.series, 3)),
      reps: Math.max(1, normalizeInteger(item.reps, 10)),
      defaultLoad: Math.max(0, Number(item.defaultLoad || item.default_load || 0) || 0),
      restTime: Math.max(0, normalizeInteger(item.restTime || item.rest_time, 30)),
      createdAt: toIsoDate(item.createdAt || item.created_at) || nowIso(),
      updatedAt: toIsoDate(item.updatedAt || item.updated_at) || nowIso(),
    };

    return {
      ...normalized,
      template_id: normalized.templateId,
      exercise_id: normalized.exerciseId,
      default_load: normalized.defaultLoad,
      rest_time: normalized.restTime,
    };
  }

  function ensureWorkoutMetadataTable() {
    if (!workoutMetadataInitPromise) {
      workoutMetadataInitPromise = prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS workout_metadata (
  workout_id integer PRIMARY KEY REFERENCES workout(id) ON DELETE CASCADE,
  objective text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  week_days jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
      `).catch((error) => {
        workoutMetadataInitPromise = null;
        throw error;
      });
    }

    return workoutMetadataInitPromise;
  }

  function ensureWorkoutTemplateMetadataTable() {
    if (!workoutTemplateMetadataInitPromise) {
      workoutTemplateMetadataInitPromise = prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS workout_template_metadata (
  template_id integer PRIMARY KEY REFERENCES workout_template(id) ON DELETE CASCADE,
  cover_image_url text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
      `).catch((error) => {
        workoutTemplateMetadataInitPromise = null;
        throw error;
      });
    }

    return workoutTemplateMetadataInitPromise;
  }

  async function initializeCompatibilityTables() {
    await Promise.all([
      ensureWorkoutMetadataTable(),
      ensureWorkoutTemplateMetadataTable(),
    ]);
  }

  async function listWorkoutTemplateMetadataByIds(templateIds) {
    const ids = Array.isArray(templateIds)
      ? [...new Set(templateIds.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0))]
      : [];
    if (!ids.length) return new Map();

    await ensureWorkoutTemplateMetadataTable();

    const rows = await prisma.$queryRawUnsafe(
      `
SELECT template_id, cover_image_url
FROM workout_template_metadata
WHERE template_id = ANY($1::int[])
      `,
      ids
    );

    const map = new Map();
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const templateId = Number(row && row.template_id) || 0;
      if (!templateId) return;

      map.set(templateId, {
        coverImageUrl: normalizeString(row && row.cover_image_url),
      });
    });

    return map;
  }

  async function upsertWorkoutTemplateMetadata({ templateId, coverImageUrl }) {
    const normalizedTemplateId = Number(templateId) || 0;
    if (!normalizedTemplateId) return;

    await ensureWorkoutTemplateMetadataTable();

    await prisma.$executeRawUnsafe(
      `
INSERT INTO workout_template_metadata (template_id, cover_image_url, updated_at)
VALUES ($1, $2, now())
ON CONFLICT (template_id)
DO UPDATE
SET cover_image_url = EXCLUDED.cover_image_url,
    updated_at = now()
      `,
      normalizedTemplateId,
      normalizeString(coverImageUrl)
    );
  }

  async function listWorkoutMetadataByIds(workoutIds) {
    const ids = Array.isArray(workoutIds)
      ? [...new Set(workoutIds.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0))]
      : [];
    if (!ids.length) return new Map();

    await ensureWorkoutMetadataTable();

    const rows = await prisma.$queryRawUnsafe(
      `
SELECT workout_id, objective, description, week_days, updated_at
FROM workout_metadata
WHERE workout_id = ANY($1::int[])
      `,
      ids
    );

    const map = new Map();
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const workoutId = Number(row && row.workout_id) || 0;
      if (!workoutId) return;

      let parsedWeekDays = [];
      const rawWeekDays = row && row.week_days;
      if (Array.isArray(rawWeekDays)) {
        parsedWeekDays = rawWeekDays;
      } else if (typeof rawWeekDays === "string" && rawWeekDays.trim()) {
        try {
          const parsed = JSON.parse(rawWeekDays);
          if (Array.isArray(parsed)) parsedWeekDays = parsed;
        } catch (_error) {
          parsedWeekDays = [];
        }
      }

      map.set(workoutId, {
        objective: normalizeString(row && row.objective),
        description: normalizeString(row && row.description),
        weekDays: normalizeWeekDaysFromMetadata(parsedWeekDays),
        updatedAt: toIsoDate(row && row.updated_at),
      });
    });

    return map;
  }

  async function listWorkoutTemplateCompatibilityByIds(templateIds) {
    const ids = Array.isArray(templateIds)
      ? [...new Set(templateIds.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0))]
      : [];
    if (!ids.length) return new Map();

    const [templates, metadataById] = await Promise.all([
      prisma.workoutTemplate.findMany({
        where: {
          id: { in: ids },
        },
      }),
      listWorkoutTemplateMetadataByIds(ids),
    ]);
    const map = new Map();
    (Array.isArray(templates) ? templates : []).forEach((template) => {
      const templateId = Number(template && template.id) || 0;
      if (!templateId) return;
      map.set(
        templateId,
        withTemplateCompatibility(template, metadataById.get(templateId) || null)
      );
    });
    return map;
  }

  async function withWorkoutCompatibilityList(workouts) {
    const items = Array.isArray(workouts) ? workouts : [];
    if (!items.length) return [];

    const workoutIds = items.map((item) => item && item.id);
    const templateIds = [
      ...new Set(
        items
          .map((item) => Number(item && (item.originTemplateId || item.origin_template_id)) || 0)
          .filter((id) => id > 0)
      ),
    ];

    const [metadataById, templateById] = await Promise.all([
      listWorkoutMetadataByIds(workoutIds),
      templateIds.length > 0
        ? listWorkoutTemplateCompatibilityByIds(templateIds)
        : Promise.resolve(new Map()),
    ]);

    return items.map((workout) => {
      const workoutId = Number(workout && workout.id) || 0;
      const originTemplateId = Number(
        workout && (workout.originTemplateId || workout.origin_template_id)
      ) || 0;
      return withWorkoutCompatibility(
        workout,
        metadataById.get(workoutId) || null,
        templateById.get(originTemplateId) || null
      );
    });
  }

  async function upsertWorkoutMetadata({ workoutId, objective, description, weekDays }) {
    const normalizedWorkoutId = Number(workoutId) || 0;
    if (!normalizedWorkoutId) return;

    await ensureWorkoutMetadataTable();

    await prisma.$executeRawUnsafe(
      `
INSERT INTO workout_metadata (workout_id, objective, description, week_days, updated_at)
VALUES ($1, $2, $3, $4::jsonb, now())
ON CONFLICT (workout_id)
DO UPDATE
SET objective = EXCLUDED.objective,
    description = EXCLUDED.description,
    week_days = EXCLUDED.week_days,
    updated_at = now()
      `,
      normalizedWorkoutId,
      normalizeString(objective),
      normalizeString(description),
      JSON.stringify(normalizeWeekDays(weekDays))
    );
  }

  async function createWorkout(data) {
    const created = await prisma.workout.create({
      data: {
        name: normalizeString(data && data.name),
        studentId: Number(data && data.studentId) || 0,
        createdBy: Number(data && data.createdBy) || 0,
        originTemplateId:
          data && data.originTemplateId !== undefined && data.originTemplateId !== null
            ? Number(data.originTemplateId) || null
            : null,
        isActive: data && data.isActive !== false,
        startDate: normalizeDateInput(data && data.startDate),
        endDate: normalizeDateInput(data && data.endDate),
        coverImageUrl: normalizeString(data && data.coverImageUrl),
      },
    });

    await upsertWorkoutMetadata({
      workoutId: created.id,
      objective: data && data.objective,
      description: data && data.description,
      weekDays: data && data.weekDays,
    });

    const [hydrated] = await withWorkoutCompatibilityList([created]);
    return hydrated || null;
  }

  async function updateWorkout(workoutId, data) {
    const normalizedWorkoutId = Number(workoutId) || 0;
    if (!normalizedWorkoutId) return null;

    const current = await prisma.workout.findUnique({
      where: { id: normalizedWorkoutId },
    });
    if (!current) return null;

    const basePayload = {};
    if (data && data.name !== undefined) basePayload.name = normalizeString(data.name);
    if (data && data.studentId !== undefined) basePayload.studentId = Number(data.studentId) || current.studentId;
    if (data && data.createdBy !== undefined) basePayload.createdBy = Number(data.createdBy) || current.createdBy;
    if (data && data.originTemplateId !== undefined) {
      basePayload.originTemplateId =
        data.originTemplateId === null || data.originTemplateId === ""
          ? null
          : Number(data.originTemplateId) || null;
    }
    if (data && data.isActive !== undefined) basePayload.isActive = data.isActive !== false;
    if (data && data.startDate !== undefined) basePayload.startDate = normalizeDateInput(data.startDate);
    if (data && data.endDate !== undefined) basePayload.endDate = normalizeDateInput(data.endDate);
    if (data && data.coverImageUrl !== undefined) {
      basePayload.coverImageUrl = normalizeString(data.coverImageUrl);
    }

    const metadataFieldsProvided =
      data &&
      (Object.prototype.hasOwnProperty.call(data, "objective") ||
        Object.prototype.hasOwnProperty.call(data, "description") ||
        Object.prototype.hasOwnProperty.call(data, "weekDays"));

    const shouldUpdateBase = Object.keys(basePayload).length > 0;
    const [updatedBase, metadataById] = await Promise.all([
      shouldUpdateBase
        ? prisma.workout.update({
            where: { id: normalizedWorkoutId },
            data: basePayload,
          })
        : Promise.resolve(current),
      metadataFieldsProvided
        ? listWorkoutMetadataByIds([normalizedWorkoutId])
        : Promise.resolve(null),
    ]);

    if (metadataFieldsProvided && metadataById) {
      const currentMetadata = metadataById.get(normalizedWorkoutId) || {
        objective: "",
        description: "",
        weekDays: [],
      };

      await upsertWorkoutMetadata({
        workoutId: normalizedWorkoutId,
        objective:
          data.objective !== undefined ? data.objective : currentMetadata.objective,
        description:
          data.description !== undefined ? data.description : currentMetadata.description,
        weekDays:
          data.weekDays !== undefined ? data.weekDays : currentMetadata.weekDays,
      });
    }

    const [hydrated] = await withWorkoutCompatibilityList([updatedBase]);
    return hydrated || null;
  }

  async function deleteWorkout(workoutId) {
    const normalizedWorkoutId = Number(workoutId) || 0;
    if (!normalizedWorkoutId) return null;

    try {
      const deleted = await prisma.workout.delete({
        where: { id: normalizedWorkoutId },
      });
      const [hydrated] = await withWorkoutCompatibilityList([deleted]);
      return hydrated || null;
    } catch (error) {
      const code = String((error && error.code) || "").toUpperCase();
      if (code === "P2025") return null;
      throw error;
    }
  }

  async function findByStudentId(studentId) {
    const normalizedStudentId = Number(studentId) || 0;
    if (!normalizedStudentId) return [];

    const workouts = await prisma.workout.findMany({
      where: {
        studentId: normalizedStudentId,
      },
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
    });

    return withWorkoutCompatibilityList(workouts);
  }

  async function getStudentWorkoutsRevision(studentId) {
    const normalizedStudentId = Number(studentId) || 0;
    if (!normalizedStudentId) {
      return {
        totalCount: 0,
        activeCount: 0,
        latestUpdatedAt: null,
        revision: "0:0:none",
      };
    }

    const workouts = await prisma.workout.findMany({
      where: {
        studentId: normalizedStudentId,
      },
      select: {
        id: true,
        isActive: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: [
        { updatedAt: "desc" },
        { id: "desc" },
      ],
    });

    const totalCount = Array.isArray(workouts) ? workouts.length : 0;
    const activeCount = (Array.isArray(workouts) ? workouts : []).filter(
      (workout) => workout && workout.isActive !== false
    ).length;
    const metadataById = await listWorkoutMetadataByIds(
      (Array.isArray(workouts) ? workouts : []).map((workout) => workout && workout.id)
    );
    const latestTimestamp = (Array.isArray(workouts) ? workouts : []).reduce((maxTimestamp, workout) => {
      const workoutTimestamp = new Date(
        (workout && (workout.updatedAt || workout.createdAt)) || 0
      ).getTime();
      const metadata = metadataById.get(Number(workout && workout.id) || 0) || null;
      const metadataTimestamp = new Date((metadata && metadata.updatedAt) || 0).getTime();
      const candidateTimestamps = [workoutTimestamp, metadataTimestamp].filter(Number.isFinite);
      if (!candidateTimestamps.length) return maxTimestamp;
      return Math.max(maxTimestamp, ...candidateTimestamps);
    }, 0);
    const latestUpdatedAt = latestTimestamp ? new Date(latestTimestamp).toISOString() : null;

    return {
      totalCount,
      activeCount,
      latestUpdatedAt,
      revision: `${totalCount}:${activeCount}:${latestUpdatedAt || "none"}`,
    };
  }

  async function findByInstructorId(instructorId) {
    const normalizedInstructorId = Number(instructorId) || 0;
    if (!normalizedInstructorId) return [];

    const workouts = await prisma.workout.findMany({
      where: {
        createdBy: normalizedInstructorId,
      },
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
    });

    return withWorkoutCompatibilityList(workouts);
  }

  async function listWorkoutSummaries({ createdBy = null } = {}) {
    const where = {};
    if (createdBy !== null && createdBy !== undefined) {
      const normalizedCreatedBy = Number(createdBy) || 0;
      if (!normalizedCreatedBy) return [];
      where.createdBy = normalizedCreatedBy;
    }

    const workouts = await prisma.workout.findMany({
      where,
      select: {
        id: true,
        name: true,
        studentId: true,
        createdBy: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
    });

    const metadataById = await listWorkoutMetadataByIds(
      (Array.isArray(workouts) ? workouts : []).map((workout) => workout && workout.id)
    );

    return (Array.isArray(workouts) ? workouts : []).map((workout) => {
      const workoutId = Number(workout && workout.id) || 0;
      const metadata = metadataById.get(workoutId) || null;

      return {
        id: workoutId,
        title: normalizeString(workout && workout.name),
        studentId: normalizeInteger(workout && workout.studentId, 0),
        instructorId: normalizeInteger(workout && workout.createdBy, 0),
        description: normalizeString(metadata && metadata.description),
        weekDays: normalizeWeekDaysFromMetadata(metadata && metadata.weekDays),
        isActive: workout && workout.isActive !== false,
        createdAt: toIsoDate(workout && workout.createdAt) || nowIso(),
        updatedAt: toIsoDate(workout && workout.updatedAt) || nowIso(),
      };
    });
  }

  async function listStudentIdsByInstructorId(instructorId, { includeInactive = true } = {}) {
    const normalizedInstructorId = Number(instructorId) || 0;
    if (!normalizedInstructorId) return [];

    const workouts = await prisma.workout.findMany({
      where: {
        createdBy: normalizedInstructorId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      select: {
        studentId: true,
      },
    });

    return Array.from(
      new Set(
        (Array.isArray(workouts) ? workouts : [])
          .map((item) => Number(item && item.studentId))
          .filter((value) => Number.isFinite(value) && value > 0)
      )
    );
  }

  async function listAll() {
    const workouts = await prisma.workout.findMany({
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
    });

    return withWorkoutCompatibilityList(workouts);
  }

  async function findById(id) {
    const normalizedId = Number(id) || 0;
    if (!normalizedId) return null;

    const workout = await prisma.workout.findUnique({
      where: { id: normalizedId },
    });
    if (!workout) return null;

    const [hydrated] = await withWorkoutCompatibilityList([workout]);
    return hydrated || null;
  }

  async function createWorkoutTemplate(data) {
    const template = await prisma.workoutTemplate.create({
      data: {
        name: normalizeString(data && data.name),
        description: normalizeString(data && data.description) || null,
        createdBy: Number(data && data.createdBy) || 0,
        isActive: data && data.isActive !== false,
      },
    });

    if (data && data.coverImageUrl !== undefined) {
      await upsertWorkoutTemplateMetadata({
        templateId: template.id,
        coverImageUrl: data.coverImageUrl,
      });
    }

    const metadataById = await listWorkoutTemplateMetadataByIds([template.id]);
    return withTemplateCompatibility(template, metadataById.get(Number(template.id)) || null);
  }

  async function listWorkoutTemplates({ includeInactive = true, createdBy = null } = {}) {
    const where = {};
    if (!includeInactive) where.isActive = true;
    if (createdBy !== null && createdBy !== undefined) where.createdBy = Number(createdBy) || 0;

    const templates = await prisma.workoutTemplate.findMany({
      where,
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
    });

    const metadataById = await listWorkoutTemplateMetadataByIds(templates.map((item) => item.id));
    return templates.map((template) =>
      withTemplateCompatibility(template, metadataById.get(Number(template.id)) || null)
    );
  }

  async function countTemplateExercisesByTemplateIds(templateIds) {
    const ids = Array.isArray(templateIds)
      ? [...new Set(templateIds.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0))]
      : [];
    if (!ids.length) return new Map();

    const rows = await prisma.$queryRawUnsafe(
      `
SELECT template_id, COUNT(*)::int AS exercises_count
FROM workout_template_exercise
WHERE template_id = ANY($1::int[])
GROUP BY template_id
      `,
      ids
    );

    const counts = new Map(ids.map((id) => [id, 0]));
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const templateId = Number(row && row.template_id) || 0;
      if (!templateId) return;
      counts.set(templateId, Number(row && row.exercises_count) || 0);
    });

    return counts;
  }

  async function getWorkoutStats() {
    const [row] = await prisma.$queryRawUnsafe(`
SELECT
  COUNT(*)::int AS total_count,
  COUNT(*) FILTER (WHERE is_active = true)::int AS active_count,
  COUNT(*) FILTER (WHERE is_active = false)::int AS inactive_count
FROM workout
    `);

    return {
      totalCount: Number(row && row.total_count) || 0,
      activeCount: Number(row && row.active_count) || 0,
      inactiveCount: Number(row && row.inactive_count) || 0,
    };
  }

  async function listOverviewWorkouts() {
    const workouts = await prisma.workout.findMany({
      select: {
        id: true,
        name: true,
        studentId: true,
        createdBy: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
    });

    return (Array.isArray(workouts) ? workouts : []).map((workout) => ({
      id: Number(workout && workout.id) || 0,
      title: normalizeString(workout && workout.name),
      studentId: normalizeInteger(workout && workout.studentId, 0),
      instructorId: normalizeInteger(workout && workout.createdBy, 0),
      isActive: workout && workout.isActive !== false,
      createdAt: toIsoDate(workout && workout.createdAt) || nowIso(),
      updatedAt: toIsoDate(workout && workout.updatedAt) || nowIso(),
    }));
  }

  async function findWorkoutTemplateById(id, { includeInactive = true } = {}) {
    const normalizedId = Number(id) || 0;
    if (!normalizedId) return null;

    const template = await prisma.workoutTemplate.findUnique({
      where: { id: normalizedId },
    });
    if (!template) return null;
    if (!includeInactive && template.isActive === false) return null;

    const metadataById = await listWorkoutTemplateMetadataByIds([normalizedId]);
    return withTemplateCompatibility(template, metadataById.get(normalizedId) || null);
  }

  async function updateWorkoutTemplate(templateId, data) {
    const normalizedTemplateId = Number(templateId) || 0;
    if (!normalizedTemplateId) return null;

    const payload = {};
    if (data && data.name !== undefined) payload.name = normalizeString(data.name);
    if (data && data.description !== undefined) {
      payload.description = normalizeString(data.description) || null;
    }
    if (data && data.isActive !== undefined) payload.isActive = data.isActive !== false;

    try {
      const updated = await prisma.workoutTemplate.update({
        where: { id: normalizedTemplateId },
        data: payload,
      });
      if (data && data.coverImageUrl !== undefined) {
        await upsertWorkoutTemplateMetadata({
          templateId: normalizedTemplateId,
          coverImageUrl: data.coverImageUrl,
        });
      }
      const metadataById = await listWorkoutTemplateMetadataByIds([normalizedTemplateId]);
      return withTemplateCompatibility(updated, metadataById.get(normalizedTemplateId) || null);
    } catch (error) {
      const code = String((error && error.code) || "").toUpperCase();
      if (code === "P2025") return null;
      throw error;
    }
  }

  async function deleteWorkoutTemplate(templateId) {
    const normalizedTemplateId = Number(templateId) || 0;
    if (!normalizedTemplateId) return null;

    try {
      const deleted = await prisma.workoutTemplate.delete({
        where: { id: normalizedTemplateId },
      });
      return withTemplateCompatibility(deleted);
    } catch (error) {
      const code = String((error && error.code) || "").toUpperCase();
      if (code === "P2025") return null;
      throw error;
    }
  }

  async function createWorkoutTemplateExercise(data) {
    const created = await prisma.workoutTemplateExercise.create({
      data: {
        templateId: Number(data && data.templateId) || 0,
        exerciseId: Number(data && data.exerciseId) || 0,
        order: Math.max(1, normalizeInteger(data && data.order, 1)),
        series: Math.max(1, normalizeInteger(data && data.series, 3)),
        reps: Math.max(1, normalizeInteger(data && data.reps, 10)),
        defaultLoad: Math.max(0, Number(data && data.defaultLoad) || 0),
        restTime: Math.max(0, normalizeInteger(data && data.restTime, 30)),
      },
    });

    return withTemplateExerciseCompatibility(created);
  }

  async function listTemplateExercises(templateId) {
    const normalizedTemplateId = Number(templateId) || 0;
    if (!normalizedTemplateId) return [];

    const items = await prisma.workoutTemplateExercise.findMany({
      where: {
        templateId: normalizedTemplateId,
      },
      orderBy: [
        { order: "asc" },
        { id: "asc" },
      ],
    });

    return items.map((item) => withTemplateExerciseCompatibility(item));
  }

  async function findTemplateExerciseById(id) {
    const normalizedId = Number(id) || 0;
    if (!normalizedId) return null;

    const item = await prisma.workoutTemplateExercise.findUnique({
      where: {
        id: normalizedId,
      },
    });

    return item ? withTemplateExerciseCompatibility(item) : null;
  }

  async function updateWorkoutTemplateExercise({ templateId, templateExerciseId, data = {} }) {
    const normalizedTemplateId = Number(templateId) || 0;
    const normalizedTemplateExerciseId = Number(templateExerciseId) || 0;
    if (!normalizedTemplateId || !normalizedTemplateExerciseId) return null;

    const current = await findTemplateExerciseById(normalizedTemplateExerciseId);
    if (!current || Number(current.templateId) !== normalizedTemplateId) return null;

    const payload = {};
    if (data.exerciseId !== undefined) {
      payload.exerciseId = Math.max(1, normalizeInteger(data.exerciseId, current.exerciseId));
    }
    if (data.order !== undefined) {
      payload.order = Math.max(1, normalizeInteger(data.order, current.order));
    }
    if (data.series !== undefined) {
      payload.series = Math.max(1, normalizeInteger(data.series, current.series));
    }
    if (data.reps !== undefined) {
      payload.reps = Math.max(1, normalizeInteger(data.reps, current.reps));
    }
    if (data.defaultLoad !== undefined) {
      payload.defaultLoad = Math.max(0, Number(data.defaultLoad) || 0);
    }
    if (data.restTime !== undefined) {
      payload.restTime = Math.max(0, normalizeInteger(data.restTime, current.restTime));
    }

    const updated = await prisma.workoutTemplateExercise.update({
      where: {
        id: normalizedTemplateExerciseId,
      },
      data: payload,
    });

    return withTemplateExerciseCompatibility(updated);
  }

  async function deleteWorkoutTemplateExercise({ templateId, templateExerciseId }) {
    const normalizedTemplateId = Number(templateId) || 0;
    const normalizedTemplateExerciseId = Number(templateExerciseId) || 0;
    if (!normalizedTemplateId || !normalizedTemplateExerciseId) return null;

    const current = await findTemplateExerciseById(normalizedTemplateExerciseId);
    if (!current || Number(current.templateId) !== normalizedTemplateId) return null;

    const removed = await prisma.workoutTemplateExercise.delete({
      where: {
        id: normalizedTemplateExerciseId,
      },
    });

    return withTemplateExerciseCompatibility(removed);
  }

  return {
    initializeCompatibilityTables,
    createWorkout,
    updateWorkout,
    deleteWorkout,
    findByStudentId,
    getStudentWorkoutsRevision,
    findByInstructorId,
    listWorkoutSummaries,
    listStudentIdsByInstructorId,
    listAll,
    listOverviewWorkouts,
    getWorkoutStats,
    findById,
    createWorkoutTemplate,
    listWorkoutTemplates,
    countTemplateExercisesByTemplateIds,
    findWorkoutTemplateById,
    updateWorkoutTemplate,
    deleteWorkoutTemplate,
    createWorkoutTemplateExercise,
    listTemplateExercises,
    findTemplateExerciseById,
    updateWorkoutTemplateExercise,
    deleteWorkoutTemplateExercise,
  };
}

module.exports = {
  createWorkoutsRepository,
};
