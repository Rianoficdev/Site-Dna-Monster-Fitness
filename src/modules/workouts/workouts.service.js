const { AppError } = require("../../utils/AppError");

function createWorkoutsService({
  workoutsRepository,
  exercisesRepository,
  libraryRepository,
  userRepository,
  validRoles = [],
}) {
  const managementRoles = new Set(["INSTRUTOR", "ADMIN_GERAL"]);
  const studentRole = "ALUNO";
  const instructorRoles = new Set(["INSTRUTOR", "ADMIN_GERAL"]);
  const weekdayMap = new Map([
    ["SEG", "Seg"],
    ["SEGUNDA", "Seg"],
    ["MONDAY", "Seg"],
    ["TER", "Ter"],
    ["TERCA", "Ter"],
    ["TERÇA", "Ter"],
    ["TUESDAY", "Ter"],
    ["QUA", "Qua"],
    ["QUARTA", "Qua"],
    ["WEDNESDAY", "Qua"],
    ["QUI", "Qui"],
    ["QUINTA", "Qui"],
    ["THURSDAY", "Qui"],
    ["SEX", "Sex"],
    ["SEXTA", "Sex"],
    ["FRIDAY", "Sex"],
    ["SAB", "Sab"],
    ["SÁB", "Sab"],
    ["SABADO", "Sab"],
    ["SÁBADO", "Sab"],
    ["SATURDAY", "Sab"],
    ["DOM", "Dom"],
    ["DOMINGO", "Dom"],
    ["SUNDAY", "Dom"],
  ]);
  const defaultWeekDays = ["Seg", "Ter", "Qua", "Qui", "Sex"];
  const normalizedValidRoles = new Set(
    Array.isArray(validRoles)
      ? validRoles.map((role) => String(role || "").trim().toUpperCase())
      : []
  );

  function normalizeRole(role) {
    return String(role || "").trim().toUpperCase();
  }

  function normalizeId(value) {
    const id = Number(value);
    return Number.isFinite(id) && id > 0 ? id : 0;
  }

  function normalizeString(value) {
    return String(value || "").trim();
  }

  function normalizeBoolean(value, defaultValue = true) {
    if (value === undefined || value === null || value === "") return defaultValue;
    if (value === true || value === false) return value;
    if (typeof value === "string") return value.trim().toLowerCase() === "true";
    return Boolean(value);
  }

  function normalizeStatusToActive(status, fallback = true) {
    if (status === undefined || status === null || status === "") return fallback;
    const normalized = normalizeString(status).toUpperCase();
    if (!normalized) return fallback;
    if (normalized === "ATIVO" || normalized === "HABILITADO") return true;
    if (normalized === "INATIVO" || normalized === "DESABILITADO") return false;
    return fallback;
  }

  function normalizeDate(value, fieldName) {
    if (value === undefined || value === null || value === "") return null;
    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) {
      throw new AppError(`${fieldName} inválido.`, 400, "VALIDATION_ERROR");
    }
    return parsed.toISOString();
  }

  function normalizeWeekDays(weekDays) {
    const incoming = Array.isArray(weekDays)
      ? weekDays
      : typeof weekDays === "string"
        ? weekDays.split(",")
        : [];

    const unique = new Set();
    incoming.forEach((item) => {
      const key = String(item || "")
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const mapped = weekdayMap.get(key);
      if (mapped) unique.add(mapped);
    });

    if (!unique.size) return defaultWeekDays.slice();

    const order = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];
    return order.filter((day) => unique.has(day));
  }

  async function ensureUserByRole({ userId, allowedRoles, label }) {
    const id = normalizeId(userId);
    if (!id) {
      throw new AppError(`${label} inválido.`, 400, "VALIDATION_ERROR");
    }

    const user = await userRepository.findById(id);
    if (!user) {
      throw new AppError(`${label} não encontrado.`, 404, "USER_NOT_FOUND");
    }

    const role = normalizeRole(user.role);
    if (allowedRoles && allowedRoles.size && !allowedRoles.has(role)) {
      throw new AppError(`${label} com função inválida.`, 400, "VALIDATION_ERROR");
    }

    return user;
  }

  function getWorkoutInstructorId(workout) {
    return Number(workout && (workout.createdBy || workout.instructorId)) || 0;
  }

  async function listInstructorLinkedStudentIds(instructorId) {
    if (
      !workoutsRepository ||
      typeof workoutsRepository.listStudentIdsByInstructorId !== "function"
    ) {
      return [];
    }

    return workoutsRepository.listStudentIdsByInstructorId(instructorId, {
      includeInactive: true,
    });
  }

  async function listActiveStudents() {
    const users = await userRepository.listUsers();
    return (Array.isArray(users) ? users : []).filter(
      (user) => normalizeRole(user && user.role) === "ALUNO" && user.isEnabled !== false
    );
  }

  async function getInstructorManagedStudentIdSet(instructorId) {
    const normalizedInstructorId = normalizeId(instructorId);
    if (!normalizedInstructorId) return null;

    const linkedStudentIds = await listInstructorLinkedStudentIds(normalizedInstructorId);
    if (!linkedStudentIds.length) return null;

    const students = await listActiveStudents();
    const activeStudentIds = new Set(
      students
        .map((student) => Number(student && student.id) || 0)
        .filter((studentId) => Number.isFinite(studentId) && studentId > 0)
    );

    const managedStudentIds = linkedStudentIds
      .map((studentId) => Number(studentId) || 0)
      .filter((studentId) => Number.isFinite(studentId) && studentId > 0)
      .filter((studentId) => activeStudentIds.has(studentId));

    if (!managedStudentIds.length) return null;
    return new Set(managedStudentIds);
  }

  async function ensureInstructorCanManageStudent({ instructorId, studentId }) {
    const normalizedInstructorId = normalizeId(instructorId);
    const normalizedStudentId = normalizeId(studentId);
    if (!normalizedInstructorId || !normalizedStudentId) {
      throw new AppError("Instrutor ou aluno inválido.", 400, "VALIDATION_ERROR");
    }

    const managedStudentIds = await getInstructorManagedStudentIdSet(normalizedInstructorId);
    if (!managedStudentIds || !managedStudentIds.size) return;

    if (!managedStudentIds.has(normalizedStudentId)) {
      throw new AppError(
        "Instrutor pode vincular treino apenas para alunos associados a ele.",
        403,
        "FORBIDDEN"
      );
    }
  }
  async function getWorkoutProgress(workoutId) {
    if (!exercisesRepository || typeof exercisesRepository.listByWorkoutId !== "function") {
      return {
        totalExercises: 0,
        completedExercises: 0,
        progressPercent: 0,
      };
    }

    const exercises = await exercisesRepository.listByWorkoutId(workoutId);
    const totalExercises = Array.isArray(exercises) ? exercises.length : 0;
    const completedExercises = Array.isArray(exercises)
      ? exercises.filter((item) => Boolean(item && item.completed)).length
      : 0;
    const progressPercent = totalExercises
      ? Math.round((completedExercises / totalExercises) * 100)
      : 0;

    return {
      totalExercises,
      completedExercises,
      progressPercent,
    };
  }

  async function withWorkoutProgress(workout) {
    const progress = await getWorkoutProgress(workout && workout.id);
    return {
      ...workout,
      progress,
      ...progress,
    };
  }

  async function sortWorkoutsByCreatedAt(workouts) {
    const withProgress = await Promise.all(
      (Array.isArray(workouts) ? workouts : []).map((workout) => withWorkoutProgress(workout))
    );

    return withProgress.sort((a, b) => {
        const aTime = a && a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b && b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
  }

  async function createWorkoutExercisesFromLibrary({ workoutId, exercises }) {
    const normalizedWorkoutId = normalizeId(workoutId);
    const list = Array.isArray(exercises) ? exercises : [];
    if (!normalizedWorkoutId || !list.length) return [];

    return Promise.all(list.map((item, index) => {
      const libraryExerciseId = normalizeId(item && (item.exerciseId || item.libraryExerciseId));
      if (!libraryExerciseId) {
        throw new AppError(
          `Exercício inválido na posição ${index + 1}: informe exerciseId da biblioteca.`,
          400,
          "VALIDATION_ERROR"
        );
      }

      const libraryExercise = libraryRepository.findById(libraryExerciseId, {
        includeInactive: false,
      });
      if (!libraryExercise) {
        throw new AppError(
          `Exercício da biblioteca não encontrado (ID ${libraryExerciseId}).`,
          404,
          "LIBRARY_EXERCISE_NOT_FOUND"
        );
      }

      const series = Math.max(1, normalizeId(item && item.series) || 3);
      const reps = Math.max(
        1,
        normalizeId(item && (item.repeticoes || item.repetitions || item.reps)) || 10
      );
      const load = Math.max(
        0,
        Number(item && (item.carga || item.load || item.loadKg || item.cargaKg)) || 0
      );
      const restTime = Math.max(
        0,
        normalizeId(item && (item.descanso || item.restTime || item.restSeconds)) || 30
      );
      const order = Math.max(1, normalizeId(item && item.order) || index + 1);
      const observation = normalizeString(
        item && (item.observacao || item.observation || item.note || item.notes)
      );

      return exercisesRepository.createExercise({
        workoutId: normalizedWorkoutId,
        exerciseId: Number(libraryExercise.id),
        order,
        series,
        reps,
        repetitions: reps,
        load,
        loadKg: load,
        restTime,
        restSeconds: restTime,
        completed: false,
        replacedFromExerciseId: null,
        name: normalizeString(libraryExercise.name),
        description: normalizeString(libraryExercise.description),
        animationUrl: normalizeString(libraryExercise.animationUrl || libraryExercise.videoUrl),
        tutorialText: normalizeString(libraryExercise.tutorialText),
        level: normalizeString(libraryExercise.level || "intermediario"),
        type: normalizeString(libraryExercise.type || "forca"),
        isActive: libraryExercise.isActive !== false,
        imageUrl: normalizeString(libraryExercise.imageUrl),
        videoUrl: normalizeString(libraryExercise.videoUrl || libraryExercise.animationUrl),
        durationSeconds: Math.max(10, Number(libraryExercise.durationSeconds) || 60),
        observation,
      });
    }));
  }

  async function ensureWorkoutExists(workoutId) {
    const normalizedWorkoutId = normalizeId(workoutId);
    const workout = await workoutsRepository.findById(normalizedWorkoutId);
    if (!workout) {
      throw new AppError("Treino não encontrado.", 404, "WORKOUT_NOT_FOUND");
    }

    return workout;
  }

  async function ensureWorkoutAccess(authUser, workoutId, { forManagement = false } = {}) {
    const workout = await ensureWorkoutExists(workoutId);
    const role = normalizeRole(authUser && authUser.role);
    const userId = normalizeId(authUser && authUser.id);

    if (!userId || !role) {
      throw new AppError("Usuário não autenticado.", 401, "UNAUTHORIZED");
    }

    if (role === "ADMIN_GERAL") return workout;

    if (role === "INSTRUTOR") {
      if (getWorkoutInstructorId(workout) !== userId) {
        throw new AppError("Acesso negado ao treino informado.", 403, "FORBIDDEN");
      }
      return workout;
    }

    if (role === "ALUNO") {
      if (forManagement) {
        throw new AppError("Acesso negado para gerenciamento de treino.", 403, "FORBIDDEN");
      }
      if (Number(workout.studentId) !== userId) {
        throw new AppError("Acesso negado ao treino informado.", 403, "FORBIDDEN");
      }
      return workout;
    }

    throw new AppError("Acesso negado para este perfil.", 403, "FORBIDDEN");
  }

  async function createWorkout({
    title,
    name,
    objective,
    objetivo,
    description,
    coverImageUrl,
    cover_image_url,
    coverUrl,
    cover_url,
    observations,
    observacoes,
    weekDays,
    studentId,
    instructorId,
    createdBy,
    isActive,
    status,
    startDate,
    endDate,
    originTemplateId,
    exercises,
    createdByRole,
    createdById,
  }) {
    const normalizedRole = normalizeRole(createdByRole);
    const actorId = normalizeId(createdById);
    const normalizedStudentId = normalizeId(studentId);
    const requestedInstructorId = normalizeId(instructorId || createdBy);
    const normalizedName = normalizeString(name || title);
    const normalizedObjective = normalizeString(objective || objetivo);
    const normalizedDescription = normalizeString(description || observations || observacoes);
    const normalizedCoverImageUrl = normalizeString(
      coverImageUrl || cover_image_url || coverUrl || cover_url
    );
    const normalizedWeekDays = normalizeWeekDays(weekDays);
    const normalizedStartDate = normalizeDate(startDate, "startDate");
    const normalizedEndDate = normalizeDate(endDate, "endDate");

    if (!normalizedName || !normalizedStudentId) {
      throw new AppError(
        "Campos obrigatórios: name (ou title) e studentId.",
        400,
        "VALIDATION_ERROR"
      );
    }

    if (normalizedStartDate && normalizedEndDate && normalizedEndDate < normalizedStartDate) {
      throw new AppError("endDate não pode ser anterior ao startDate.", 400, "VALIDATION_ERROR");
    }

    if (!normalizedValidRoles.has(normalizedRole)) {
      throw new AppError("Role inválida.", 400, "VALIDATION_ERROR");
    }

    if (normalizedRole !== studentRole && !managementRoles.has(normalizedRole)) {
      throw new AppError(
        "Somente Aluno, Administrador Geral e Instrutor podem criar treinos.",
        403,
        "FORBIDDEN"
      );
    }

    if (!actorId) {
      throw new AppError("Usuario autenticado inválido.", 401, "UNAUTHORIZED");
    }

    const student = await ensureUserByRole({
      userId: normalizedStudentId,
      allowedRoles: new Set([studentRole]),
      label: "Aluno",
    });

    if (!student.isEnabled) {
      throw new AppError("Não é possível atribuir treino para aluno desabilitado.", 400, "STUDENT_DISABLED");
    }

    let resolvedCreatorId = actorId;

    if (normalizedRole === studentRole) {
      if (actorId !== Number(student.id)) {
        throw new AppError(
          "Aluno so pode criar treino para si mesmo.",
          403,
          "FORBIDDEN"
        );
      }
    } else {
    const resolvedInstructorId = normalizedRole === "INSTRUTOR"
      ? actorId
      : requestedInstructorId || actorId;

    const instructor = await ensureUserByRole({
      userId: resolvedInstructorId,
      allowedRoles: instructorRoles,
      label: "Instrutor",
    });

    if (normalizedRole === "INSTRUTOR" && actorId !== Number(instructor.id)) {
      throw new AppError(
        "Instrutor so pode criar treinos para si mesmo como responsável.",
        403,
        "FORBIDDEN"
      );
    }

    if (normalizedRole === "INSTRUTOR") {
      await ensureInstructorCanManageStudent({
        instructorId: Number(instructor.id),
        studentId: Number(student.id),
      });
    }
      resolvedCreatorId = Number(instructor.id);
    }

    const resolvedIsActive =
      isActive !== undefined
        ? normalizeBoolean(isActive, true)
        : normalizeStatusToActive(status, true);

    const workout = await workoutsRepository.createWorkout({
      name: normalizedName,
      objective: normalizedObjective,
      description: normalizedDescription,
      coverImageUrl: normalizedCoverImageUrl,
      weekDays: normalizedWeekDays,
      studentId: Number(student.id),
      createdBy: resolvedCreatorId,
      originTemplateId: normalizeId(originTemplateId) || null,
      isActive: resolvedIsActive,
      startDate: normalizedStartDate,
      endDate: normalizedEndDate,
    });

    await createWorkoutExercisesFromLibrary({
      workoutId: workout.id,
      exercises,
    });

    return withWorkoutProgress(workout);
  }

  async function updateWorkout({
    authUser,
    workoutId,
    name,
    title,
    objective,
    objetivo,
    description,
    coverImageUrl,
    cover_image_url,
    coverUrl,
    cover_url,
    observations,
    observacoes,
    studentId,
    weekDays,
    isActive,
    status,
    startDate,
    endDate,
  }) {
    const currentWorkout = await ensureWorkoutAccess(authUser, workoutId, { forManagement: true });

    const normalizedName = normalizeString(name || title);
    const normalizedObjective = normalizeString(objective || objetivo);
    const normalizedDescription = normalizeString(description || observations || observacoes);
    const normalizedCoverImageUrl = normalizeString(
      coverImageUrl || cover_image_url || coverUrl || cover_url
    );
    const normalizedStartDate = normalizeDate(startDate, "startDate");
    const normalizedEndDate = normalizeDate(endDate, "endDate");
    const normalizedStudentId = normalizeId(studentId);
    const actorRole = normalizeRole(authUser && authUser.role);
    const actorId = normalizeId(authUser && authUser.id);
    if (normalizedStartDate && normalizedEndDate && normalizedEndDate < normalizedStartDate) {
      throw new AppError("endDate não pode ser anterior ao startDate.", 400, "VALIDATION_ERROR");
    }

    const payload = {};
    if (normalizedName) payload.name = normalizedName;
    if (objective !== undefined || objetivo !== undefined) payload.objective = normalizedObjective;
    if (description !== undefined || observations !== undefined || observacoes !== undefined) {
      payload.description = normalizedDescription;
    }
    if (
      coverImageUrl !== undefined ||
      cover_image_url !== undefined ||
      coverUrl !== undefined ||
      cover_url !== undefined
    ) {
      payload.coverImageUrl = normalizedCoverImageUrl;
    }
    if (normalizedStudentId) {
      const student = await ensureUserByRole({
        userId: normalizedStudentId,
        allowedRoles: new Set([studentRole]),
        label: "Aluno",
      });
      if (!student.isEnabled) {
        throw new AppError("Não é possível atribuir treino para aluno desabilitado.", 400, "STUDENT_DISABLED");
      }
      if (actorRole === "INSTRUTOR") {
        await ensureInstructorCanManageStudent({
          instructorId: actorId,
          studentId: Number(student.id),
        });
      }
      payload.studentId = Number(student.id);
    }
    if (weekDays !== undefined) payload.weekDays = normalizeWeekDays(weekDays);
    if (isActive !== undefined) {
      payload.isActive = normalizeBoolean(isActive, true);
    } else if (status !== undefined) {
      payload.isActive = normalizeStatusToActive(status, currentWorkout.isActive !== false);
    }
    if (startDate !== undefined) payload.startDate = normalizedStartDate;
    if (endDate !== undefined) payload.endDate = normalizedEndDate;

    const updated = await workoutsRepository.updateWorkout(workoutId, payload);
    if (!updated) {
      throw new AppError("Treino não encontrado.", 404, "WORKOUT_NOT_FOUND");
    }

    return withWorkoutProgress(updated);
  }

  async function createWorkoutTemplate({ authUser, name, description, isActive }) {
    const actorRole = normalizeRole(authUser && authUser.role);
    const actorId = normalizeId(authUser && authUser.id);
    if (!managementRoles.has(actorRole)) {
      throw new AppError("Apenas instrutor ou administrador geral podem criar modelos.", 403, "FORBIDDEN");
    }

    const normalizedName = normalizeString(name);
    if (!normalizedName) {
      throw new AppError("Campo obrigatório: name.", 400, "VALIDATION_ERROR");
    }

    return workoutsRepository.createWorkoutTemplate({
      name: normalizedName,
      description: normalizeString(description),
      createdBy: actorId,
      isActive: normalizeBoolean(isActive, true),
    });
  }

  async function updateWorkoutTemplate({
    authUser,
    templateId,
    name,
    description,
    isActive,
  }) {
    const actorRole = normalizeRole(authUser && authUser.role);
    const actorId = normalizeId(authUser && authUser.id);
    if (!managementRoles.has(actorRole)) {
      throw new AppError("Apenas instrutor ou administrador geral podem editar modelos.", 403, "FORBIDDEN");
    }

    const normalizedTemplateId = normalizeId(templateId);
    if (!normalizedTemplateId) {
      throw new AppError("Campo obrigatorio: templateId.", 400, "VALIDATION_ERROR");
    }

    const template = await workoutsRepository.findWorkoutTemplateById(normalizedTemplateId, {
      includeInactive: true,
    });
    if (!template) {
      throw new AppError("Modelo de treino nao encontrado.", 404, "TEMPLATE_NOT_FOUND");
    }

    if (actorRole === "INSTRUTOR" && Number(template.createdBy) !== actorId) {
      throw new AppError("Instrutor so pode editar modelos que criou.", 403, "FORBIDDEN");
    }

    const payload = {};
    if (name !== undefined) {
      const normalizedName = normalizeString(name);
      if (!normalizedName) {
        throw new AppError("Campo obrigatorio: name.", 400, "VALIDATION_ERROR");
      }
      payload.name = normalizedName;
    }
    if (description !== undefined) payload.description = normalizeString(description);
    if (isActive !== undefined) payload.isActive = normalizeBoolean(isActive, true);

    const updated = await workoutsRepository.updateWorkoutTemplate(normalizedTemplateId, payload);
    if (!updated) {
      throw new AppError("Modelo de treino nao encontrado.", 404, "TEMPLATE_NOT_FOUND");
    }

    return {
      ...updated,
      exercisesCount: (await workoutsRepository.listTemplateExercises(updated.id)).length,
    };
  }

  async function listWorkoutTemplates({ authUser, includeInactive = false } = {}) {
    const actorRole = normalizeRole(authUser && authUser.role);
    const canManageTemplates = managementRoles.has(actorRole);
    const shouldIncludeInactive = canManageTemplates && normalizeBoolean(includeInactive, false);
    const templates = await workoutsRepository.listWorkoutTemplates({
      includeInactive: shouldIncludeInactive,
    });

    return Promise.all(
      templates.map(async (template) => ({
        ...template,
        exercisesCount: (await workoutsRepository.listTemplateExercises(template.id)).length,
      }))
    );
  }

  async function deleteWorkoutTemplate({ authUser, templateId }) {
    const actorRole = normalizeRole(authUser && authUser.role);
    const actorId = normalizeId(authUser && authUser.id);
    if (!managementRoles.has(actorRole)) {
      throw new AppError("Apenas instrutor ou administrador geral podem excluir modelos.", 403, "FORBIDDEN");
    }

    const normalizedTemplateId = normalizeId(templateId);
    if (!normalizedTemplateId) {
      throw new AppError("Campo obrigatorio: templateId.", 400, "VALIDATION_ERROR");
    }

    const template = await workoutsRepository.findWorkoutTemplateById(normalizedTemplateId, {
      includeInactive: true,
    });
    if (!template) {
      throw new AppError("Modelo de treino nao encontrado.", 404, "TEMPLATE_NOT_FOUND");
    }

    if (actorRole === "INSTRUTOR" && Number(template.createdBy) !== actorId) {
      throw new AppError("Instrutor so pode excluir modelos que criou.", 403, "FORBIDDEN");
    }

    if (template.isActive !== false) {
      throw new AppError(
        "Apenas treinos em si inativos podem ser excluidos.",
        400,
        "TEMPLATE_MUST_BE_INACTIVE"
      );
    }

    const removed = await workoutsRepository.deleteWorkoutTemplate(normalizedTemplateId);
    if (!removed) {
      throw new AppError("Modelo de treino nao encontrado.", 404, "TEMPLATE_NOT_FOUND");
    }

    return removed;
  }

  async function addTemplateExercise({
    authUser,
    templateId,
    exerciseId,
    order,
    series,
    reps,
    defaultLoad,
    restTime,
  }) {
    const actorRole = normalizeRole(authUser && authUser.role);
    const actorId = normalizeId(authUser && authUser.id);
    if (!managementRoles.has(actorRole)) {
      throw new AppError("Apenas instrutor ou administrador geral podem editar modelos.", 403, "FORBIDDEN");
    }

    const normalizedTemplateId = normalizeId(templateId);
    const normalizedExerciseId = normalizeId(exerciseId);
    if (!normalizedTemplateId || !normalizedExerciseId) {
      throw new AppError("Campos obrigatórios: templateId e exerciseId.", 400, "VALIDATION_ERROR");
    }

    const template = await workoutsRepository.findWorkoutTemplateById(normalizedTemplateId, {
      includeInactive: true,
    });
    if (!template) {
      throw new AppError("Modelo de treino não encontrado.", 404, "TEMPLATE_NOT_FOUND");
    }

    if (actorRole === "INSTRUTOR" && Number(template.createdBy) !== actorId) {
      throw new AppError("Instrutor só pode editar modelos que criou.", 403, "FORBIDDEN");
    }

    const libraryExercise = libraryRepository.findById(normalizedExerciseId, { includeInactive: false });
    if (!libraryExercise) {
      throw new AppError("Exercício da biblioteca não encontrado.", 404, "LIBRARY_EXERCISE_NOT_FOUND");
    }

    const existingTemplateExercises = await workoutsRepository.listTemplateExercises(normalizedTemplateId);
    const normalizedOrder = Math.max(
      1,
      normalizeId(order) || existingTemplateExercises.length + 1
    );

    return workoutsRepository.createWorkoutTemplateExercise({
      templateId: normalizedTemplateId,
      exerciseId: Number(libraryExercise.id),
      order: normalizedOrder,
      series: Math.max(1, normalizeId(series) || 3),
      reps: Math.max(1, normalizeId(reps) || 10),
      defaultLoad: Math.max(0, Number(defaultLoad) || 0),
      restTime: Math.max(0, normalizeId(restTime) || 30),
    });
  }

  async function listTemplateExercises({ authUser, templateId }) {
    const template = await workoutsRepository.findWorkoutTemplateById(templateId, {
      includeInactive: true,
    });
    if (!template) {
      throw new AppError("Modelo de treino não encontrado.", 404, "TEMPLATE_NOT_FOUND");
    }

    const actorRole = normalizeRole(authUser && authUser.role);
    const actorId = normalizeId(authUser && authUser.id);
    if (template.isActive === false && actorRole !== "ADMIN_GERAL") {
      if (actorRole !== "INSTRUTOR" || Number(template.createdBy) !== actorId) {
        throw new AppError("Acesso negado ao modelo informado.", 403, "FORBIDDEN");
      }
    }

    const templateExercises = await workoutsRepository.listTemplateExercises(template.id);
    const libraryExercises = libraryRepository.findByIds(
      templateExercises.map((item) => item.exerciseId),
      { includeInactive: true }
    );
    const libraryById = new Map(libraryExercises.map((item) => [Number(item.id), item]));

    return templateExercises.map((item) => ({
      ...item,
      exercise: libraryById.get(Number(item.exerciseId)) || null,
    }));
  }

  async function createWorkoutFromTemplate({
    authUser,
    templateId,
    studentId,
    instructorId,
    name,
    objective,
    description,
    coverImageUrl,
    status,
    isActive,
    startDate,
    endDate,
    weekDays,
  }) {
    const actorRole = normalizeRole(authUser && authUser.role);
    const actorId = normalizeId(authUser && authUser.id);

    if (!managementRoles.has(actorRole)) {
      throw new AppError(
        "Somente Administrador Geral e Instrutor podem criar treino a partir de modelo.",
        403,
        "FORBIDDEN"
      );
    }

    const normalizedTemplateId = normalizeId(templateId);
    const normalizedStudentId = normalizeId(studentId);
    if (!normalizedTemplateId || !normalizedStudentId) {
      throw new AppError("Campos obrigatórios: templateId e studentId.", 400, "VALIDATION_ERROR");
    }

    const template = await workoutsRepository.findWorkoutTemplateById(normalizedTemplateId, {
      includeInactive: false,
    });
    if (!template) {
      throw new AppError("Modelo de treino não encontrado ou inativo.", 404, "TEMPLATE_NOT_FOUND");
    }

    const student = await ensureUserByRole({
      userId: normalizedStudentId,
      allowedRoles: new Set([studentRole]),
      label: "Aluno",
    });

    if (!student.isEnabled) {
      throw new AppError("Não é possível atribuir treino para aluno desabilitado.", 400, "STUDENT_DISABLED");
    }

    const requestedInstructorId = normalizeId(instructorId);
    const resolvedInstructorId = actorRole === "INSTRUTOR"
      ? actorId
      : requestedInstructorId || actorId;

    if (actorRole === "INSTRUTOR" && requestedInstructorId && requestedInstructorId !== actorId) {
      throw new AppError(
        "Instrutor não pode atribuir treino com outro responsável.",
        403,
        "FORBIDDEN"
      );
    }

    const instructor = await ensureUserByRole({
      userId: resolvedInstructorId,
      allowedRoles: instructorRoles,
      label: "Instrutor",
    });

    if (actorRole === "INSTRUTOR") {
      await ensureInstructorCanManageStudent({
        instructorId: Number(instructor.id),
        studentId: Number(student.id),
      });
    }

    const templateExercises = await workoutsRepository.listTemplateExercises(template.id);
    if (!templateExercises.length) {
      throw new AppError(
        "A nomeclatura de treino selecionada não possui exercícios cadastrados.",
        400,
        "TEMPLATE_WITHOUT_EXERCISES"
      );
    }

    let createdWorkout = null;
    createdWorkout = await workoutsRepository.createWorkout({
      name: normalizeString(name) || template.name,
      objective: normalizeString(objective),
      description: normalizeString(description) || normalizeString(template.description),
      coverImageUrl: normalizeString(coverImageUrl),
      studentId: Number(student.id),
      createdBy: Number(instructor.id),
      originTemplateId: Number(template.id),
      isActive:
        isActive !== undefined
          ? normalizeBoolean(isActive, true)
          : normalizeStatusToActive(status, true),
      startDate: normalizeDate(startDate, "startDate"),
      endDate: normalizeDate(endDate, "endDate"),
      weekDays: normalizeWeekDays(weekDays),
    });

    const copiedExercises = [];
    try {
    for (const item of templateExercises) {
      const libraryExercise = libraryRepository.findById(item.exerciseId, { includeInactive: true });
      const copiedExercise = await exercisesRepository.createExercise({
        workoutId: createdWorkout.id,
        exerciseId: item.exerciseId,
        order: item.order,
        series: item.series,
        reps: item.reps,
        load: Number(item.defaultLoad) || 0,
        restTime: item.restTime,
        completed: false,
        replacedFromExerciseId: null,
        name: libraryExercise ? libraryExercise.name : `Exercício ${item.exerciseId}`,
        description: libraryExercise ? libraryExercise.description : "",
        animationUrl: libraryExercise ? libraryExercise.animationUrl : "",
        tutorialText: libraryExercise ? libraryExercise.tutorialText : "",
        level: libraryExercise ? libraryExercise.level : "intermediario",
        type: libraryExercise ? libraryExercise.type : "forca",
        isActive: libraryExercise ? libraryExercise.isActive !== false : true,
        imageUrl: libraryExercise ? libraryExercise.imageUrl : "",
        videoUrl: libraryExercise ? libraryExercise.videoUrl : "",
        repetitions: item.reps,
        loadKg: Number(item.defaultLoad) || 0,
        restSeconds: item.restTime,
        durationSeconds: libraryExercise ? Number(libraryExercise.durationSeconds) || 60 : 60,
      });
      copiedExercises.push(copiedExercise);
    }
    } catch (error) {
      if (createdWorkout && createdWorkout.id) {
        try {
          await workoutsRepository.deleteWorkout(createdWorkout.id);
        } catch (_cleanupError) {}
      }
      throw error;
    }

    return {
      workout: await withWorkoutProgress(createdWorkout),
      exercises: copiedExercises,
      template: {
        id: template.id,
        name: template.name,
      },
    };
  }

  async function listMyWorkouts(authUser) {
    const role = normalizeRole(authUser && authUser.role);
    const userId = normalizeId(authUser && authUser.id);

    let workouts = [];
    if (role === "ALUNO") {
      workouts = (await workoutsRepository
        .findByStudentId(userId))
        .filter((workout) => workout && workout.isActive !== false);
    } else if (role === "INSTRUTOR") {
      workouts = await workoutsRepository.findByInstructorId(userId);
    } else if (role === "ADMIN_GERAL") {
      workouts = await workoutsRepository.listAll();
    } else {
      workouts = [];
    }

    return sortWorkoutsByCreatedAt(workouts);
  }

  async function createInstructorWorkout({ authUser, ...payload }) {
    return createWorkout({
      ...payload,
      createdByRole: authUser && authUser.role,
      createdById: authUser && authUser.id,
    });
  }

  async function listInstructorWorkouts({ authUser, includeInactive = true } = {}) {
    const role = normalizeRole(authUser && authUser.role);
    const userId = normalizeId(authUser && authUser.id);
    if (!managementRoles.has(role)) {
      throw new AppError("Acesso negado para listar treinos do instrutor.", 403, "FORBIDDEN");
    }

    const workouts = role === "ADMIN_GERAL"
      ? await workoutsRepository.listAll()
      : await workoutsRepository.findByInstructorId(userId);

    const filtered = normalizeBoolean(includeInactive, true)
      ? workouts
      : workouts.filter((workout) => workout && workout.isActive !== false);

    return sortWorkoutsByCreatedAt(filtered);
  }

  async function listStudentWorkouts({ authUser } = {}) {
    const role = normalizeRole(authUser && authUser.role);
    const userId = normalizeId(authUser && authUser.id);
    if (role !== "ALUNO") {
      throw new AppError("Acesso negado para listar treinos do aluno.", 403, "FORBIDDEN");
    }

    const workouts = (await workoutsRepository
      .findByStudentId(userId))
      .filter((workout) => workout && workout.isActive !== false);

    return sortWorkoutsByCreatedAt(workouts);
  }

  async function updateInstructorWorkout({ authUser, workoutId, ...payload }) {
    return updateWorkout({
      ...payload,
      authUser,
      workoutId,
    });
  }

  async function deactivateWorkout({ authUser, workoutId }) {
    return updateWorkout({
      authUser,
      workoutId,
      isActive: false,
    });
  }

  async function deleteWorkout({ authUser, workoutId }) {
    const workout = await ensureWorkoutAccess(authUser, workoutId, { forManagement: true });

    if (workout && workout.isActive !== false) {
      throw new AppError(
        "Apenas treinos inativos podem ser excluidos.",
        400,
        "WORKOUT_MUST_BE_INACTIVE"
      );
    }

    if (
      exercisesRepository &&
      typeof exercisesRepository.listByWorkoutId === "function" &&
      typeof exercisesRepository.deleteExercise === "function"
    ) {
      const workoutExercises = await exercisesRepository.listByWorkoutId(Number(workout.id));
      for (const item of (Array.isArray(workoutExercises) ? workoutExercises : [])) {
        const workoutExerciseId = Number(item && item.id) || 0;
        if (!workoutExerciseId) continue;
        await exercisesRepository.deleteExercise({
          workoutId: Number(workout.id),
          workoutExerciseId,
        });
      }
    }

    if (!workoutsRepository || typeof workoutsRepository.deleteWorkout !== "function") {
      throw new AppError("Exclusao de treino nao disponivel.", 500, "WORKOUT_DELETE_NOT_AVAILABLE");
    }

    const removed = await workoutsRepository.deleteWorkout(Number(workout.id));
    if (!removed) {
      throw new AppError("Treino nao encontrado.", 404, "WORKOUT_NOT_FOUND");
    }

    return withWorkoutProgress(removed);
  }

  async function listAssignableStudents({ authUser }) {
    const role = normalizeRole(authUser && authUser.role);
    const actorId = normalizeId(authUser && authUser.id);
    const students = await listActiveStudents();

    if (role === "ADMIN_GERAL") return students;
    if (role !== "INSTRUTOR") {
      throw new AppError("Acesso negado para listar alunos vinculados.", 403, "FORBIDDEN");
    }

    const linkedStudentIds = await getInstructorManagedStudentIdSet(actorId);
    // Sem vínculos válidos, permite mostrar os alunos ativos cadastrados
    // para o instrutor iniciar ou recuperar a gestão dos treinos.
    if (!linkedStudentIds || !linkedStudentIds.size) return students;

    const linkedStudents = students.filter((student) =>
      linkedStudentIds.has(Number(student && student.id) || 0)
    );

    return linkedStudents.length ? linkedStudents : students;
  }
  return {
    createWorkout,
    createInstructorWorkout,
    updateWorkout,
    updateInstructorWorkout,
    deactivateWorkout,
    deleteWorkout,
    listMyWorkouts,
    listInstructorWorkouts,
    listStudentWorkouts,
    listAssignableStudents,
    createWorkoutTemplate,
    updateWorkoutTemplate,
    deleteWorkoutTemplate,
    listWorkoutTemplates,
    addTemplateExercise,
    listTemplateExercises,
    createWorkoutFromTemplate,
    ensureWorkoutExists,
    ensureWorkoutAccess,
    getWorkoutProgress,
  };
}

module.exports = {
  createWorkoutsService,
};




