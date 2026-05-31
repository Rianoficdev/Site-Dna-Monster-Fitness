const { AppError } = require("../../utils/AppError");

function createAdminService({
  userService,
  userRepository,
  workoutsService,
  workoutsRepository,
  exercisesRepository,
  libraryRepository,
  progressRepository,
  supportService,
  clearCachedAuthUser,
  store,
  persistStore,
  bcrypt,
  validRoles = [],
  onlineWindowMinutes = 5,
}) {
  const ADMIN_OVERVIEW_CACHE_TTL_MS = 60000;
  const normalizedOnlineWindowMinutes = Math.max(1, Number(onlineWindowMinutes) || 5);
  const editableRoles = new Set(validRoles.map((role) => String(role || "").toUpperCase()));
  const defaultTeamPhotoPositionY = 50;
  const defaultTeamPhotoZoom = 1;
  let overviewCache = null;

  function normalizeRole(role) {
    return String(role || "").trim().toUpperCase();
  }

  function normalizeTeamPhotoPositionY(value, fallback = defaultTeamPhotoPositionY) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return fallback;
    return Math.min(100, Math.max(0, Math.round(numericValue)));
  }

  function normalizeTeamPhotoZoom(value, fallback = defaultTeamPhotoZoom) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return fallback;
    const clampedValue = Math.min(2.5, Math.max(1, numericValue));
    return Math.round(clampedValue * 100) / 100;
  }

  function normalizeBoolean(value) {
    if (value === true || value === false) return value;
    if (typeof value === "string") return value.trim().toLowerCase() === "true";
    return Boolean(value);
  }

  function sortExerciseItems(items) {
    return (Array.isArray(items) ? items : []).slice().sort((first, second) => {
      const firstOrder = Number(first && first.order) || 0;
      const secondOrder = Number(second && second.order) || 0;
      if (firstOrder !== secondOrder) return firstOrder - secondOrder;
      return (Number(first && first.id) || 0) - (Number(second && second.id) || 0);
    });
  }

  function groupItemsByNumericKey(items, keyName) {
    const grouped = new Map();

    (Array.isArray(items) ? items : []).forEach((item) => {
      const key = Number(item && item[keyName]) || 0;
      if (!key) return;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(item);
    });

    grouped.forEach((list, key) => {
      grouped.set(key, sortExerciseItems(list));
    });

    return grouped;
  }

  function ensureSiteContentState() {
    if (!store || typeof store !== "object") {
      return {
        teamMembers: [],
      };
    }

    if (!store.siteContent || typeof store.siteContent !== "object") {
      store.siteContent = {
        teamMembers: [],
      };
    }

    if (!Array.isArray(store.siteContent.teamMembers)) {
      store.siteContent.teamMembers = [];
    }

    return store.siteContent;
  }

  function sanitizeTeamMember(member, index = 0) {
    const safeMember = member && typeof member === "object" ? member : {};
    return {
      id: Number(safeMember.id) || index + 1,
      name: String(safeMember.name || `Membro ${index + 1}`).trim(),
      role: String(safeMember.role || "Personal Trainer").trim(),
      description: String(
        safeMember.description || "Profissional qualificado para acompanhar sua evolucao."
      ).trim(),
      photoUrl: String(safeMember.photoUrl || "").trim(),
      photoPositionY: normalizeTeamPhotoPositionY(
        safeMember.photoPositionY ?? safeMember.photo_position_y
      ),
      photoZoom: normalizeTeamPhotoZoom(
        safeMember.photoZoom ?? safeMember.photo_zoom
      ),
    };
  }

  function saveStore() {
    if (typeof persistStore === "function") {
      persistStore(store);
    }
  }

  function clearOverviewCache() {
    overviewCache = null;
  }

  function getCachedOverview() {
    if (!overviewCache) return null;
    if (overviewCache.expiresAt <= Date.now()) {
      overviewCache = null;
      return null;
    }
    return overviewCache.value;
  }

  function setCachedOverview(value) {
    overviewCache = {
      value,
      expiresAt: Date.now() + ADMIN_OVERVIEW_CACHE_TTL_MS,
    };
  }

  async function assertAdminPassword({ actorId, adminPassword }) {
    const actorIdNumber = Number(actorId);
    const safePassword = String(adminPassword || "").trim();

    if (!actorIdNumber || Number.isNaN(actorIdNumber)) {
      throw new AppError("Usuário autenticado inválido.", 401, "UNAUTHORIZED");
    }

    if (!safePassword) {
      throw new AppError(
        "Informe a senha do administrador geral para confirmar a exclusão.",
        400,
        "ADMIN_PASSWORD_REQUIRED"
      );
    }

    const actorUser = await userRepository.findById(actorIdNumber);
    if (!actorUser) {
      throw new AppError("Usuário autenticado não encontrado.", 401, "UNAUTHORIZED");
    }

    if (normalizeRole(actorUser.role) !== "ADMIN_GERAL") {
      throw new AppError(
        "Apenas o administrador geral pode excluir usuários.",
        403,
        "FORBIDDEN"
      );
    }

    if (!actorUser.password) {
      throw new AppError(
        "Conta do administrador geral sem senha configurada.",
        400,
        "ADMIN_PASSWORD_NOT_CONFIGURED"
      );
    }

    const passwordValidator = bcrypt && typeof bcrypt.compare === "function" ? bcrypt.compare : null;
    if (!passwordValidator) {
      throw new AppError("Validador de senha indisponível.", 500, "PASSWORD_VALIDATOR_UNAVAILABLE");
    }

    const validPassword = await passwordValidator(safePassword, actorUser.password);
    if (!validPassword) {
      throw new AppError("Senha do administrador geral inválida.", 403, "INVALID_ADMIN_PASSWORD");
    }
  }

  function buildRoleStats(users) {
    const counts = {
      ALUNO: 0,
      INSTRUTOR: 0,
      ADMIN: 0,
      ADMIN_GERAL: 0,
    };

    users.forEach((user) => {
      const role = String(user.role || "").toUpperCase();
      if (Object.prototype.hasOwnProperty.call(counts, role)) {
        counts[role] += 1;
      }
    });

    return counts;
  }

  function isUserOnline(user, onlineSince) {
    if (!user || !user.isEnabled || !user.lastSeenAt) return false;
    const lastSeen = new Date(user.lastSeenAt);
    if (Number.isNaN(lastSeen.getTime())) return false;
    return lastSeen >= onlineSince;
  }

  function toDateKey(date) {
    const parsed = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(parsed.getTime())) return "";
    const year = parsed.getUTCFullYear();
    const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
    const day = String(parsed.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function toMonthKey(date) {
    const parsed = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(parsed.getTime())) return "";
    return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}`;
  }

  function getMonthBounds(referenceDate = new Date()) {
    const parsed = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
    const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    const start = new Date(Date.UTC(safeDate.getUTCFullYear(), safeDate.getUTCMonth(), 1));
    const end = new Date(Date.UTC(safeDate.getUTCFullYear(), safeDate.getUTCMonth() + 1, 0));
    return {
      start,
      end,
      startKey: toDateKey(start),
      endKey: toDateKey(end),
      monthKey: toMonthKey(start),
    };
  }

  function getMonthWeeks({ start, end }) {
    const weeks = [];
    let current = new Date(start);
    let index = 1;

    while (current <= end) {
      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + (6 - weekEnd.getUTCDay()));
      if (weekEnd > end) weekEnd.setTime(end.getTime());

      const days = [];
      const dayCursor = new Date(weekStart);
      while (dayCursor <= weekEnd) {
        days.push(toDateKey(dayCursor));
        dayCursor.setUTCDate(dayCursor.getUTCDate() + 1);
      }

      weeks.push({
        label: `Semana ${index}`,
        startKey: toDateKey(weekStart),
        endKey: toDateKey(weekEnd),
        days,
      });

      current = new Date(weekEnd);
      current.setUTCDate(current.getUTCDate() + 1);
      index += 1;
    }

    return weeks;
  }

  function getUserDisplayName(user, fallback = "Não identificado") {
    return String((user && (user.name || user.email)) || fallback).trim();
  }

  async function getMetricsReport({ referenceDate } = {}) {
    const monthBounds = getMonthBounds(referenceDate);
    const [users, workouts, completions] = await Promise.all([
      userService.listUsers(),
      workoutsService && typeof workoutsService.listOverviewWorkouts === "function"
        ? workoutsService.listOverviewWorkouts()
        : Promise.resolve([]),
      progressRepository && typeof progressRepository.listWorkoutCompletions === "function"
        ? progressRepository.listWorkoutCompletions({
            completedDateFrom: monthBounds.startKey,
            completedDateTo: monthBounds.endKey,
            limit: 10000,
          }).catch(() => [])
        : Promise.resolve([]),
    ]);

    const safeUsers = Array.isArray(users) ? users : [];
    const safeWorkouts = Array.isArray(workouts) ? workouts : [];
    const safeCompletions = Array.isArray(completions) ? completions : [];
    const usersById = new Map();
    safeUsers.forEach((user) => {
      const userId = Number(user && user.id) || 0;
      if (userId) usersById.set(userId, user);
    });

    const students = safeUsers.filter((user) => normalizeRole(user && user.role) === "ALUNO");
    const instructors = safeUsers.filter((user) => {
      const role = normalizeRole(user && user.role);
      return role === "INSTRUTOR" || role === "ADMIN_GERAL";
    });

    const monthlyStudentsMap = new Map();
    students.forEach((student) => {
      const monthKey = toMonthKey(student && student.createdAt);
      if (!monthKey) return;
      monthlyStudentsMap.set(monthKey, (monthlyStudentsMap.get(monthKey) || 0) + 1);
    });

    const monthlyStudentGrowth = Array.from(monthlyStudentsMap.entries())
      .sort(([firstMonth], [secondMonth]) => firstMonth.localeCompare(secondMonth))
      .map(([month, studentsCount]) => ({ month, students: studentsCount }));

    const currentMonthStudentGrowth =
      monthlyStudentGrowth.find((item) => item.month === monthBounds.monthKey) || {
        month: monthBounds.monthKey,
        students: 0,
      };

    const studentMetrics = new Map();
    students.forEach((student) => {
      const studentId = Number(student && student.id) || 0;
      if (!studentId) return;
      const lastSeenKey = toDateKey(student && student.lastSeenAt);
      studentMetrics.set(studentId, {
        studentId,
        name: getUserDisplayName(student, `Aluno ${studentId}`),
        email: String((student && student.email) || "").trim().toLowerCase(),
        completedWorkouts: 0,
        workoutDays: new Set(),
        accessDays: lastSeenKey >= monthBounds.startKey && lastSeenKey <= monthBounds.endKey
          ? new Set([lastSeenKey])
          : new Set(),
        score: 0,
      });
    });

    safeCompletions.forEach((completion) => {
      const studentId = Number(completion && completion.userId) || 0;
      if (!studentId) return;
      const metric = studentMetrics.get(studentId);
      if (!metric) return;
      const dateKey = String((completion && completion.completedDateKey) || "").trim();
      metric.completedWorkouts += 1;
      if (dateKey) metric.workoutDays.add(dateKey);
    });

    studentMetrics.forEach((metric) => {
      metric.score = metric.completedWorkouts * 3 + metric.workoutDays.size * 2 + metric.accessDays.size;
    });

    const topStudent = Array.from(studentMetrics.values())
      .sort((first, second) => {
        if (second.score !== first.score) return second.score - first.score;
        if (second.completedWorkouts !== first.completedWorkouts) {
          return second.completedWorkouts - first.completedWorkouts;
        }
        return first.name.localeCompare(second.name, "pt-BR", { sensitivity: "base" });
      })[0] || null;

    const instructorMetrics = new Map();
    instructors.forEach((instructor) => {
      const instructorId = Number(instructor && instructor.id) || 0;
      if (!instructorId) return;
      instructorMetrics.set(instructorId, {
        instructorId,
        name: getUserDisplayName(instructor, `Instrutor ${instructorId}`),
        assignedWorkouts: 0,
        currentMonthAssignedWorkouts: 0,
      });
    });

    safeWorkouts.forEach((workout) => {
      const instructorId = Number(workout && (workout.instructorId || workout.createdBy)) || 0;
      if (!instructorId) return;
      if (!instructorMetrics.has(instructorId)) {
        const instructor = usersById.get(instructorId);
        instructorMetrics.set(instructorId, {
          instructorId,
          name: getUserDisplayName(instructor, `Instrutor ${instructorId}`),
          assignedWorkouts: 0,
          currentMonthAssignedWorkouts: 0,
        });
      }
      const metric = instructorMetrics.get(instructorId);
      const createdKey = toDateKey(workout && workout.createdAt);
      metric.assignedWorkouts += 1;
      if (createdKey >= monthBounds.startKey && createdKey <= monthBounds.endKey) {
        metric.currentMonthAssignedWorkouts += 1;
      }
    });

    const topInstructor = Array.from(instructorMetrics.values())
      .sort((first, second) => {
        if (second.currentMonthAssignedWorkouts !== first.currentMonthAssignedWorkouts) {
          return second.currentMonthAssignedWorkouts - first.currentMonthAssignedWorkouts;
        }
        if (second.assignedWorkouts !== first.assignedWorkouts) {
          return second.assignedWorkouts - first.assignedWorkouts;
        }
        return first.name.localeCompare(second.name, "pt-BR", { sensitivity: "base" });
      })[0] || null;

    const currentMonthWeeks = getMonthWeeks(monthBounds).map((week) => {
      const dayRows = week.days.map((dateKey) => {
        const accessCount = students.filter((student) => toDateKey(student && student.lastSeenAt) === dateKey).length;
        const completedWorkouts = safeCompletions.filter(
          (completion) => String((completion && completion.completedDateKey) || "").trim() === dateKey
        ).length;
        return {
          dateKey,
          accessCount,
          completedWorkouts,
        };
      });

      return {
        ...week,
        accessCount: dayRows.reduce((sum, day) => sum + day.accessCount, 0),
        completedWorkouts: dayRows.reduce((sum, day) => sum + day.completedWorkouts, 0),
        days: dayRows,
      };
    });

    return {
      referenceDateKey: toDateKey(new Date()),
      month: {
        key: monthBounds.monthKey,
        startKey: monthBounds.startKey,
        endKey: monthBounds.endKey,
      },
      summary: {
        totalStudents: students.length,
        currentMonthNewStudents: currentMonthStudentGrowth.students,
        currentMonthCompletedWorkouts: safeCompletions.length,
        currentMonthKnownAccesses: students.filter((student) => {
          const dateKey = toDateKey(student && student.lastSeenAt);
          return dateKey >= monthBounds.startKey && dateKey <= monthBounds.endKey;
        }).length,
      },
      monthlyStudentGrowth,
      topStudent: topStudent
        ? {
            studentId: topStudent.studentId,
            name: topStudent.name,
            email: topStudent.email,
            completedWorkouts: topStudent.completedWorkouts,
            workoutDays: topStudent.workoutDays.size,
            accessDays: topStudent.accessDays.size,
            score: topStudent.score,
          }
        : null,
      topInstructor,
      currentMonthWeeks,
      notes: [
        "Acessos por dia usam o ultimo acesso registrado do usuario; o sistema ainda nao armazena historico completo de logins.",
        "Treinos realizados usam o historico de conclusao de treinos do mes vigente.",
      ],
    };
  }

  async function getOverview({ fresh = false } = {}) {
    const cachedOverview = fresh ? null : getCachedOverview();
    if (cachedOverview) return cachedOverview;

    const onlineSince = new Date(Date.now() - normalizedOnlineWindowMinutes * 60 * 1000);

    const [users, workoutStats, workouts, libraryExercises, supportTickets] = await Promise.all([
      userService.listUsers(),
      workoutsService && typeof workoutsService.getWorkoutStats === "function"
        ? workoutsService.getWorkoutStats()
        : Promise.resolve({ totalCount: 0, activeCount: 0, inactiveCount: 0 }),
      workoutsService && typeof workoutsService.listOverviewWorkouts === "function"
        ? workoutsService.listOverviewWorkouts()
        : Promise.resolve([]),
      libraryRepository && typeof libraryRepository.listLibraryExercises === "function"
        ? Promise.resolve(libraryRepository.listLibraryExercises({ includeInactive: true }))
        : Promise.resolve([]),
      supportService && typeof supportService.listAdminTickets === "function"
        ? supportService.listAdminTickets({ limit: 500 }).catch(() => [])
        : Promise.resolve([]),
    ]);

    const stats = {
      totalUsers: 0,
      enabledUsers: 0,
      alunos: 0,
      alunosAtivos: 0,
      alunosDesabilitados: 0,
      instrutores: 0,
      instrutoresAtivos: 0,
      administradores: 0,
      administradoresAtivos: 0,
      administradoresGerais: 0,
      administradoresGeraisAtivos: 0,
      onlineAgora: 0,
      alunosOnlineAgora: 0,
    };

    const usersById = new Map();

    for (const user of users) {
      stats.totalUsers += 1;
      const role = String(user.role || "").toUpperCase();
      const enabled = user.isEnabled !== false;
      const online = isUserOnline(user, onlineSince);

      if (enabled) stats.enabledUsers += 1;
      if (online) stats.onlineAgora += 1;

      usersById.set(Number(user.id), user);

      if (role === "ALUNO") {
        stats.alunos += 1;
        if (enabled) stats.alunosAtivos += 1;
        else stats.alunosDesabilitados += 1;
        if (online) stats.alunosOnlineAgora += 1;
      } else if (role === "INSTRUTOR") {
        stats.instrutores += 1;
        if (enabled) stats.instrutoresAtivos += 1;
      } else if (role === "ADMIN") {
        stats.administradores += 1;
        if (enabled) stats.administradoresAtivos += 1;
      } else if (role === "ADMIN_GERAL") {
        stats.administradoresGerais += 1;
        if (enabled) stats.administradoresGeraisAtivos += 1;
      }
    }

    const normalizedWorkouts = (Array.isArray(workouts) ? workouts : []).map((workout) => {
      const student = usersById.get(Number(workout.studentId));
      const instructor = usersById.get(Number(workout.instructorId));

      return {
        id: workout.id,
        title: workout.title,
        description: workout.description || "",
        studentId: workout.studentId,
        studentName: student ? student.name : "Não encontrado",
        instructorId: workout.instructorId,
        instructorName: instructor ? instructor.name : "Não encontrado",
        isActive: workout.isActive !== false,
        createdAt: workout.createdAt,
        updatedAt: workout.updatedAt,
      };
    });

    const safeExercises = Array.isArray(libraryExercises) ? libraryExercises : [];
    const totalExercises = safeExercises.length;
    const activeExercises = safeExercises.filter(
      (exercise) => exercise && exercise.isActive !== false
    ).length;

    const safeTickets = Array.isArray(supportTickets) ? supportTickets : [];
    const openSupportTickets = safeTickets.filter(
      (ticket) => normalizeRole(ticket && ticket.status) === "OPEN"
    ).length;
    const openPasswordResetSupportTickets = safeTickets.filter(
      (ticket) =>
        normalizeRole(ticket && ticket.status) === "OPEN" &&
        normalizeRole(ticket && ticket.type) === "PASSWORD_RESET"
    ).length;

    const totalWorkouts = Number(workoutStats && workoutStats.totalCount) || normalizedWorkouts.length;
    const activeWorkouts = Number(workoutStats && workoutStats.activeCount) || 0;
    const inactiveWorkouts = Number(workoutStats && workoutStats.inactiveCount) || 0;

    const overview = {
      stats: {
        totalUsers: stats.totalUsers,
        totalUsersEnabled: stats.enabledUsers,
        totalWorkouts,
        totalWorkoutsAtivos: activeWorkouts,
        totalWorkoutsInativos: inactiveWorkouts,
        totalExercises,
        totalExercisesAtivos: activeExercises,
        totalExercisesInativos: totalExercises - activeExercises,
        alunos: stats.alunos,
        instrutores: stats.instrutores,
        instrutoresAtivos: stats.instrutoresAtivos,
        administradores: stats.administradores,
        administradoresAtivos: stats.administradoresAtivos,
        administradoresGerais: stats.administradoresGerais,
        administradoresGeraisAtivos: stats.administradoresGeraisAtivos,
        alunosAtivos: stats.alunosAtivos,
        alunosDesabilitados: stats.alunosDesabilitados,
        onlineAgora: stats.onlineAgora,
        alunosOnlineAgora: stats.alunosOnlineAgora,
        janelaOnlineMinutos: normalizedOnlineWindowMinutes,
        supportTicketsPendentes: openSupportTickets,
        supportResetPendentes: openPasswordResetSupportTickets,
      },
      charts: {
        roleDistribution: [
          { label: "Alunos", value: stats.alunos },
          { label: "Instrutores", value: stats.instrutores },
          { label: "Administradores", value: stats.administradores },
          { label: "Admin Geral", value: stats.administradoresGerais },
        ],
        studentsStatus: [
          { label: "Ativos", value: stats.alunosAtivos },
          { label: "Desabilitados", value: stats.alunosDesabilitados },
          { label: "Online agora", value: stats.alunosOnlineAgora },
        ],
      },
      users,
      workouts: normalizedWorkouts,
      supportTickets: safeTickets,
    };

    setCachedOverview(overview);
    return overview;
  }

  async function getWorkoutsOverview({ authUser } = {}) {
    const actorRole = normalizeRole(authUser && authUser.role);
    const actorId = Number(authUser && authUser.id) || 0;

    if (actorRole !== "ADMIN_GERAL" && actorRole !== "INSTRUTOR") {
      throw new AppError(
        "Acesso negado para carregar o painel de treinos.",
        403,
        "FORBIDDEN"
      );
    }

    const workoutsPromise = actorRole === "ADMIN_GERAL"
      ? (
          workoutsRepository && typeof workoutsRepository.listAllRaw === "function"
            ? workoutsRepository.listAllRaw()
            : workoutsService && typeof workoutsService.listInstructorWorkouts === "function"
              ? workoutsService.listInstructorWorkouts({
                  authUser,
                  includeInactive: true,
                })
              : Promise.resolve([])
        )
      : (
          workoutsService && typeof workoutsService.listInstructorWorkouts === "function"
            ? workoutsService.listInstructorWorkouts({
                authUser,
                includeInactive: true,
              })
            : Promise.resolve([])
        );

    const [users, templates, workouts, libraryExercises] = await Promise.all([
      userService.listUsers(),
      workoutsService && typeof workoutsService.listWorkoutTemplates === "function"
        ? workoutsService.listWorkoutTemplates({
            authUser,
            includeInactive: true,
          })
        : Promise.resolve([]),
      workoutsPromise,
      libraryRepository && typeof libraryRepository.listLibraryExercises === "function"
        ? Promise.resolve(libraryRepository.listLibraryExercises({ includeInactive: false }))
        : Promise.resolve([]),
    ]);

    const safeUsers = Array.isArray(users) ? users : [];
    const safeTemplates = Array.isArray(templates) ? templates : [];
    const safeWorkouts = Array.isArray(workouts) ? workouts : [];
    const safeLibraryExercises = Array.isArray(libraryExercises) ? libraryExercises : [];

    const [templateExercises, workoutExercises] = await Promise.all([
      workoutsRepository && typeof workoutsRepository.listTemplateExercisesByTemplateIds === "function"
        ? workoutsRepository.listTemplateExercisesByTemplateIds(
            safeTemplates.map((template) => template && template.id)
          )
        : Promise.resolve([]),
      exercisesRepository && typeof exercisesRepository.listByWorkoutIds === "function"
        ? exercisesRepository.listByWorkoutIds(
            safeWorkouts.map((workout) => workout && workout.id)
          )
        : Promise.resolve([]),
    ]);

    const templateExercisesByTemplateId = groupItemsByNumericKey(templateExercises, "templateId");
    const workoutExercisesByWorkoutId = groupItemsByNumericKey(workoutExercises, "workoutId");

    const students = safeUsers.filter((user) => {
      const role = normalizeRole(user && user.role);
      if (role !== "ALUNO") return false;
      return actorRole === "ADMIN_GERAL" ? true : user && user.isEnabled !== false;
    });

    let instructors = [];
    if (actorRole === "ADMIN_GERAL") {
      instructors = safeUsers.filter((user) => {
        const role = normalizeRole(user && user.role);
        return (role === "INSTRUTOR" || role === "ADMIN_GERAL") && user && user.isEnabled !== false;
      });
    } else {
      instructors = safeUsers.filter((user) => Number(user && user.id) === actorId);
      if (!instructors.length && actorId > 0) {
        instructors = [
          {
            id: actorId,
            name: String((authUser && authUser.name) || "").trim() || `Usuário ${actorId}`,
            email: String((authUser && authUser.email) || "").trim().toLowerCase(),
            phone: "",
            avatarUrl: "",
            role: actorRole,
            isEnabled: true,
            lastLoginAt: null,
            lastSeenAt: null,
            createdAt: null,
            updatedAt: null,
          },
        ];
      }
    }

    return {
      students,
      instructors,
      templates: safeTemplates.map((template) => {
        const templateId = Number(template && template.id) || 0;
        const exercises = templateExercisesByTemplateId.get(templateId) || [];
        return {
          ...template,
          exercises,
          exercisesCount: Math.max(
            Number(template && template.exercisesCount) || 0,
            exercises.length
          ),
        };
      }),
      workouts: safeWorkouts.map((workout) => {
        const workoutId = Number(workout && workout.id) || 0;
        return {
          ...workout,
          exercises: workoutExercisesByWorkoutId.get(workoutId) || [],
        };
      }),
      libraryExercises: safeLibraryExercises,
    };
  }

  async function updateUserRole({ actorId, userId, role }) {
    const actorIdNumber = Number(actorId);
    const targetId = Number(userId);
    const normalizedRole = normalizeRole(role);

    if (!targetId || Number.isNaN(targetId)) {
      throw new AppError("userId inválido.", 400, "VALIDATION_ERROR");
    }

    if (!editableRoles.has(normalizedRole)) {
      throw new AppError("Role inválida.", 400, "VALIDATION_ERROR");
    }

    if (actorIdNumber === targetId) {
      throw new AppError(
        "Não é permitido alterar a própria função do administrador geral.",
        400,
        "SELF_ROLE_CHANGE_NOT_ALLOWED"
      );
    }

    const targetUser = await userRepository.findById(targetId);
    if (!targetUser) {
      throw new AppError("Usuário não encontrado.", 404, "USER_NOT_FOUND");
    }

    const updated = await userRepository.updateUserRole({
      userId: targetId,
      role: normalizedRole,
    });
    if (typeof clearCachedAuthUser === "function") {
      clearCachedAuthUser(targetId);
    }
    clearOverviewCache();
    return updated;
  }

  async function updateStudentStatus({ actorId, userId, isEnabled }) {
    const actorIdNumber = Number(actorId);
    const targetId = Number(userId);
    const normalizedStatus = normalizeBoolean(isEnabled);

    if (!targetId || Number.isNaN(targetId)) {
      throw new AppError("userId inválido.", 400, "VALIDATION_ERROR");
    }

    if (actorIdNumber === targetId) {
      throw new AppError(
        "Não é permitido alterar o próprio status do administrador geral.",
        400,
        "SELF_STATUS_CHANGE_NOT_ALLOWED"
      );
    }

    const targetUser = await userRepository.findById(targetId);
    if (!targetUser) {
      throw new AppError("Usuário não encontrado.", 404, "USER_NOT_FOUND");
    }

    if (String(targetUser.role || "").toUpperCase() !== "ALUNO") {
      throw new AppError(
        "Apenas contas de alunos podem ser habilitadas ou desabilitadas.",
        400,
        "ONLY_STUDENT_STATUS_EDIT"
      );
    }

    const updated = await userRepository.updateUserEnabledStatus({
      userId: targetId,
      isEnabled: normalizedStatus,
    });
    if (typeof clearCachedAuthUser === "function") {
      clearCachedAuthUser(targetId);
    }
    clearOverviewCache();
    return updated;
  }

  async function deleteDisabledUser({ actorId, userId, adminPassword }) {
    const actorIdNumber = Number(actorId);
    const targetId = Number(userId);

    if (!targetId || Number.isNaN(targetId)) {
      throw new AppError("userId inválido.", 400, "VALIDATION_ERROR");
    }

    if (actorIdNumber === targetId) {
      throw new AppError(
        "Não é permitido excluir a própria conta do administrador geral.",
        400,
        "SELF_DELETE_NOT_ALLOWED"
      );
    }

    const targetUser = await userRepository.findById(targetId);
    if (!targetUser) {
      throw new AppError("Usuário não encontrado.", 404, "USER_NOT_FOUND");
    }

    if (normalizeRole(targetUser.role) !== "ALUNO") {
      throw new AppError(
        "A exclusão por este painel é permitida apenas para alunos desabilitados.",
        400,
        "ONLY_DISABLED_STUDENT_DELETE"
      );
    }

    if (targetUser.isEnabled) {
      throw new AppError(
        "Somente usuários desabilitados podem ser excluídos.",
        400,
        "ONLY_DISABLED_USERS_CAN_BE_DELETED"
      );
    }

    await assertAdminPassword({
      actorId: actorIdNumber,
      adminPassword,
    });

    try {
      const deleted = await userRepository.deleteUserById(targetId);
      if (typeof clearCachedAuthUser === "function") {
        clearCachedAuthUser(targetId);
      }
      clearOverviewCache();
      return deleted;
    } catch (error) {
      const code = String(error && error.code ? error.code : "").toUpperCase();
      if (code === "P2003" || code === "P2014") {
        throw new AppError(
          "Não foi possível excluir o usuário porque existem vínculos obrigatórios ativos.",
          409,
          "USER_DELETE_BLOCKED_BY_RELATION"
        );
      }
      throw error;
    }
  }

  function getSiteTeamMembers() {
    const siteContent = ensureSiteContentState();
    const members = Array.isArray(siteContent.teamMembers) ? siteContent.teamMembers : [];
    return members.map((member, index) => sanitizeTeamMember(member, index));
  }

  function updateSiteTeamMembers({ members }) {
    if (!Array.isArray(members) || !members.length) {
      throw new AppError("Informe ao menos um membro para atualizar o time.", 400, "VALIDATION_ERROR");
    }

    const normalizedMembers = members
      .slice(0, 8)
      .map((member, index) => sanitizeTeamMember(member, index));

    for (const member of normalizedMembers) {
      if (!member.name) {
        throw new AppError("Todos os membros precisam ter nome.", 400, "VALIDATION_ERROR");
      }
      if (!member.role) {
        throw new AppError("Todos os membros precisam ter funcao.", 400, "VALIDATION_ERROR");
      }
      if (!member.description) {
        throw new AppError("Todos os membros precisam ter descricao.", 400, "VALIDATION_ERROR");
      }
    }

    const siteContent = ensureSiteContentState();
    siteContent.teamMembers = normalizedMembers;
    saveStore();
    clearOverviewCache();
    return normalizedMembers;
  }

  return {
    getOverview,
    getMetricsReport,
    getWorkoutsOverview,
    updateUserRole,
    updateStudentStatus,
    deleteDisabledUser,
    getSiteTeamMembers,
    updateSiteTeamMembers,
  };
}

module.exports = {
  createAdminService,
};


