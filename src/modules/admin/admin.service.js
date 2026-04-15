const { AppError } = require("../../utils/AppError");

function createAdminService({
  userService,
  userRepository,
  workoutsService,
  libraryRepository,
  supportService,
  store,
  persistStore,
  bcrypt,
  validRoles = [],
  onlineWindowMinutes = 5,
}) {
  const ADMIN_OVERVIEW_CACHE_TTL_MS = 15000;
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

  async function getOverview({ fresh = false } = {}) {
    const cachedOverview = fresh ? null : getCachedOverview();
    if (cachedOverview) return cachedOverview;

    const users = await userService.listUsers();
    const [workoutStats, workouts] = await Promise.all([
      workoutsService && typeof workoutsService.getWorkoutStats === "function"
        ? workoutsService.getWorkoutStats()
        : Promise.resolve({ totalCount: 0, activeCount: 0, inactiveCount: 0 }),
      workoutsService && typeof workoutsService.listOverviewWorkouts === "function"
        ? workoutsService.listOverviewWorkouts()
        : workoutsService.listMyWorkouts({ id: 0, role: "ADMIN_GERAL" }),
    ]);
    const libraryExercises =
      libraryRepository && typeof libraryRepository.listLibraryExercises === "function"
        ? libraryRepository.listLibraryExercises({ includeInactive: true })
        : [];
    let supportTickets = [];
    if (supportService && typeof supportService.listAdminTickets === "function") {
      try {
        supportTickets = await supportService.listAdminTickets({ limit: 500 });
      } catch (_) {
        supportTickets = [];
      }
    }
    const usersById = new Map(users.map((user) => [Number(user.id), user]));
    const roleCounts = buildRoleStats(users);
    const onlineSince = new Date(Date.now() - normalizedOnlineWindowMinutes * 60 * 1000);

    const activeStudents = users.filter((user) => user.role === "ALUNO" && user.isEnabled).length;
    const activeInstructors = users.filter(
      (user) => user.role === "INSTRUTOR" && user.isEnabled
    ).length;
    const activeAdmins = users.filter((user) => user.role === "ADMIN" && user.isEnabled).length;
    const activeAdminGerais = users.filter(
      (user) => user.role === "ADMIN_GERAL" && user.isEnabled
    ).length;
    const enabledUsers = users.filter((user) => user && user.isEnabled).length;
    const disabledStudents = users.filter((user) => user.role === "ALUNO" && !user.isEnabled).length;
    const onlineNow = users.filter((user) => isUserOnline(user, onlineSince)).length;
    const onlineStudentsNow = users.filter(
      (user) => user.role === "ALUNO" && isUserOnline(user, onlineSince)
    ).length;

    const normalizedWorkouts = workouts.map((workout) => {
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

    const activeWorkouts = Number(workoutStats && workoutStats.activeCount) || 0;
    const inactiveWorkouts = Number(workoutStats && workoutStats.inactiveCount) || 0;
    const totalWorkouts = Number(workoutStats && workoutStats.totalCount) || normalizedWorkouts.length;
    const totalExercises = Array.isArray(libraryExercises) ? libraryExercises.length : 0;
    const activeExercises = Array.isArray(libraryExercises)
      ? libraryExercises.filter((exercise) => exercise && exercise.isActive !== false).length
      : 0;
    const inactiveExercises = Array.isArray(libraryExercises)
      ? libraryExercises.filter((exercise) => exercise && exercise.isActive === false).length
      : 0;
    const openSupportTickets = Array.isArray(supportTickets)
      ? supportTickets.filter((ticket) => normalizeRole(ticket && ticket.status) === "OPEN").length
      : 0;
    const openPasswordResetSupportTickets = Array.isArray(supportTickets)
      ? supportTickets.filter(
          (ticket) =>
            normalizeRole(ticket && ticket.status) === "OPEN" &&
            normalizeRole(ticket && ticket.type) === "PASSWORD_RESET"
        ).length
      : 0;

    const overview = {
      stats: {
        totalUsers: users.length,
        totalUsersEnabled: enabledUsers,
        totalWorkouts,
        totalWorkoutsAtivos: activeWorkouts,
        totalWorkoutsInativos: inactiveWorkouts,
        totalExercises,
        totalExercisesAtivos: activeExercises,
        totalExercisesInativos: inactiveExercises,
        alunos: roleCounts.ALUNO,
        instrutores: roleCounts.INSTRUTOR,
        instrutoresAtivos: activeInstructors,
        administradores: roleCounts.ADMIN,
        administradoresAtivos: activeAdmins,
        administradoresGerais: roleCounts.ADMIN_GERAL,
        administradoresGeraisAtivos: activeAdminGerais,
        alunosAtivos: activeStudents,
        alunosDesabilitados: disabledStudents,
        onlineAgora: onlineNow,
        alunosOnlineAgora: onlineStudentsNow,
        janelaOnlineMinutos: normalizedOnlineWindowMinutes,
        supportTicketsPendentes: openSupportTickets,
        supportResetPendentes: openPasswordResetSupportTickets,
      },
      charts: {
        roleDistribution: [
          { label: "Alunos", value: roleCounts.ALUNO },
          { label: "Instrutores", value: roleCounts.INSTRUTOR },
          { label: "Administradores", value: roleCounts.ADMIN },
          { label: "Admin Geral", value: roleCounts.ADMIN_GERAL },
        ],
        studentsStatus: [
          { label: "Ativos", value: activeStudents },
          { label: "Desabilitados", value: disabledStudents },
          { label: "Online agora", value: onlineStudentsNow },
        ],
      },
      users,
      workouts: normalizedWorkouts,
      supportTickets: Array.isArray(supportTickets) ? supportTickets : [],
    };

    setCachedOverview(overview);
    return overview;
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

