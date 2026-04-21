const bcryptLib = require("bcryptjs");
const { AppError } = require("../../utils/AppError");

function createSupportService({
  supportRepository,
  userRepository,
  createHash: _createHash,
  bcrypt = bcryptLib,
  passwordResetTokenMinutes = 30,
}) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const validTypes = new Set([
    "PASSWORD_RESET",
    "GENERAL_SUPPORT",
    "LOGIN_ISSUE",
    "APP_ERROR",
    "WORKOUT_ISSUE",
    "PROFILE_UPDATE",
    "PAYMENT_PLAN_ISSUE",
    "IMPROVEMENT_SUGGESTION",
    "EXERCISE_REPORT",
    "OTHER",
  ]);
  const validStatuses = new Set(["OPEN", "APPROVED", "RESOLVED", "REJECTED"]);
  const allowedAdminStatusUpdates = new Set(["RESOLVED", "REJECTED", "OPEN"]);
  const normalizedResetTokenMinutes = Math.max(5, Number(passwordResetTokenMinutes) || 30);
  const passwordMinLength = 6;
  const AUTO_APPROVE_SECONDS = 30;
  const PUBLIC_PASSWORD_RESET_AUTO_APPROVE_SECONDS = 25;
  const PUBLIC_PASSWORD_RESET_COUNTDOWN_SECONDS = 30;

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizeType(value) {
    const normalized = String(value || "").trim().toUpperCase();
    return validTypes.has(normalized) ? normalized : "GENERAL_SUPPORT";
  }

  function parseOptionalType(value) {
    const normalized = String(value || "").trim().toUpperCase();
    return validTypes.has(normalized) ? normalized : "";
  }

  function normalizeStatus(value) {
    const normalized = String(value || "").trim().toUpperCase();
    return validStatuses.has(normalized) ? normalized : "";
  }

  function parseArchivedMode(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) return "all";
    if (["true", "1", "yes", "only", "archived", "arquivado", "arquivados"].includes(normalized)) {
      return "only";
    }
    if (["false", "0", "no", "active", "ativos", "nao"].includes(normalized)) {
      return "exclude";
    }
    return "all";
  }

  function normalizeRole(value) {
    return String(value || "").trim().toUpperCase();
  }

  function sanitizeMessage(value, maxLength = 2000) {
    return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
  }

  function sanitizeMultiline(value, maxLength = 3000) {
    return String(value || "").trim().slice(0, maxLength);
  }

  function parseDate(value) {
    if (!value) return null;
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  function formatDateIso(value) {
    const parsed = parseDate(value);
    return parsed ? parsed.toISOString() : null;
  }

  function isPublicPasswordResetContext({ requesterId = null, ticket = null } = {}) {
    const resolvedRequesterId =
      ticket && ticket.requesterId !== undefined ? ticket.requesterId : requesterId;
    return !(Number(resolvedRequesterId) > 0);
  }

  function getPasswordResetAutoApproveDelaySeconds(context = {}) {
    return isPublicPasswordResetContext(context)
      ? PUBLIC_PASSWORD_RESET_AUTO_APPROVE_SECONDS
      : AUTO_APPROVE_SECONDS;
  }

  function getPasswordResetAutoApproveAt(now = new Date(), context = {}) {
    return new Date(now.getTime() + getPasswordResetAutoApproveDelaySeconds(context) * 1000);
  }

  function getRemainingSeconds(targetDate, now = new Date()) {
    const parsed = parseDate(targetDate);
    if (!parsed) return 0;
    return Math.max(0, Math.ceil((parsed.getTime() - now.getTime()) / 1000));
  }

  function validatePasswordStrength(password, fieldLabel = "Senha") {
    const normalized = String(password || "").trim();
    if (normalized.length < passwordMinLength) {
      throw new AppError(
        `${fieldLabel} deve ter no minimo ${passwordMinLength} caracteres.`,
        400,
        "WEAK_PASSWORD"
      );
    }
  }

  function buildDefaultSubject(type) {
    const normalizedType = normalizeType(type);
    const subjectMap = {
      GENERAL_SUPPORT: "Solicitacao de ajuda e suporte",
      PASSWORD_RESET: "Solicitacao de redefinicao de senha",
      LOGIN_ISSUE: "Problema com login",
      APP_ERROR: "Erro no aplicativo",
      WORKOUT_ISSUE: "Problema com treino",
      PROFILE_UPDATE: "Atualizacao de dados cadastrais",
      PAYMENT_PLAN_ISSUE: "Problema com pagamento / plano",
      IMPROVEMENT_SUGGESTION: "Sugestao de melhoria",
      EXERCISE_REPORT: "Relatar exercicio incorreto",
      OTHER: "Outros",
    };
    return subjectMap[normalizedType] || subjectMap.GENERAL_SUPPORT;
  }

  function buildDefaultDescription(type) {
    const normalizedType = normalizeType(type);
    if (normalizedType === "PASSWORD_RESET") {
      return "Solicitacao para liberar a redefinicao de senha da conta.";
    }
    if (normalizedType === "WORKOUT_ISSUE") {
      return "Detalhe o problema com treino (exercicio, progresso ou exibicao).";
    }
    if (normalizedType === "EXERCISE_REPORT") {
      return "Descreva o exercicio incorreto e o que precisa de ajuste.";
    }
    return "Solicitacao enviada pelo usuario.";
  }

  function ensureTicketDescription(description, type) {
    const normalized = sanitizeMultiline(description);
    return normalized || buildDefaultDescription(type);
  }

  function sanitizeUserLite(user) {
    if (!user) return null;
    return {
      id: Number(user.id) || 0,
      name: String(user.name || "").trim(),
      email: normalizeEmail(user.email),
      role: normalizeRole(user.role),
      isEnabled: user.isEnabled !== false,
    };
  }

  function sanitizeTicket(ticket) {
    if (!ticket) return null;
    const archiveMeta = getTicketArchiveMeta(ticket);
    return {
      id: Number(ticket.id) || 0,
      requesterId:
        ticket.requesterId !== null && ticket.requesterId !== undefined
          ? Number(ticket.requesterId) || null
          : null,
      requesterEmail: normalizeEmail(ticket.requesterEmail),
      requesterName: String(ticket.requesterName || "").trim(),
      requesterRole: normalizeRole(ticket.requesterRole),
      type: normalizeType(ticket.type),
      subject: String(ticket.subject || "").trim(),
      description: String(ticket.description || "").trim(),
      status: normalizeStatus(ticket.status) || "OPEN",
      adminResponse: ticket.adminResponse ? String(ticket.adminResponse).trim() : "",
      metadata:
        archiveMeta.metadata && Object.keys(archiveMeta.metadata).length
          ? archiveMeta.metadata
          : null,
      autoApproveAt: formatDateIso(ticket.autoApproveAt),
      autoApproved: ticket.autoApproved === true,
      isArchived: archiveMeta.isArchived,
      archivedAt: archiveMeta.archivedAt,
      archivedById: archiveMeta.archivedById,
      resolvedById:
        ticket.resolvedById !== null && ticket.resolvedById !== undefined
          ? Number(ticket.resolvedById) || null
          : null,
      resolvedAt: ticket.resolvedAt || null,
      createdAt: ticket.createdAt || null,
      updatedAt: ticket.updatedAt || null,
      requester: sanitizeUserLite(ticket.requester),
      resolver: sanitizeUserLite(ticket.resolver),
    };
  }

  function buildCreateTicketPayload({
    requesterId = null,
    requesterEmail,
    requesterName = "",
    requesterRole = "",
    type = "GENERAL_SUPPORT",
    subject = "",
    description = "",
  }) {
    const normalizedType = normalizeType(type);
    const normalizedSubject = sanitizeMessage(subject || buildDefaultSubject(normalizedType), 160);
    const normalizedDescription = ensureTicketDescription(description, normalizedType);
    const normalizedEmail = normalizeEmail(requesterEmail);

    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
      throw new AppError("Informe um e-mail valido para abrir a solicitacao.", 400, "VALIDATION_ERROR");
    }

    return {
      requesterId:
        requesterId !== null && requesterId !== undefined && Number(requesterId) > 0
          ? Number(requesterId)
          : null,
      requesterEmail: normalizedEmail,
      requesterName: sanitizeMessage(requesterName, 120) || null,
      requesterRole: normalizeRole(requesterRole) || null,
      type: normalizedType,
      subject: normalizedSubject || buildDefaultSubject(normalizedType),
      description: normalizedDescription,
      status: "OPEN",
    };
  }

  function buildPasswordResetRequestMessage(context = {}) {
    if (isPublicPasswordResetContext(context)) {
      return (
        `Solicitacao registrada. A contagem de ${PUBLIC_PASSWORD_RESET_COUNTDOWN_SECONDS} segundos ` +
        "foi iniciada e a liberacao automatica acontece quando faltarem 5 segundos."
      );
    }

    return `Solicitacao registrada. Aguarde ${AUTO_APPROVE_SECONDS} segundos para a liberacao automatica do reset de senha.`;
  }

  function buildAuthenticatedPasswordResetRequestMessage() {
    return `Solicitacao registrada. Se nao houver acao manual, a aprovacao acontece automaticamente em ${AUTO_APPROVE_SECONDS} segundos.`;
  }

  function buildDuplicatePasswordResetRequestMessage(statusPayload) {
    const payload = statusPayload && typeof statusPayload === "object" ? statusPayload : {};
    if (payload.status === "APPROVED" && payload.canResetNow) {
      return "Seu reset de senha ja esta liberado. Defina a nova senha para concluir.";
    }

    return "Ja existe uma solicitacao de reset em andamento. Aguarde o tempo restante da verificacao para continuar.";
  }

  function normalizeMetadataObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return { ...value };
  }

  function getPasswordResetMetadata(ticket) {
    const metadata = normalizeMetadataObject(ticket && ticket.metadata);
    return metadata.passwordReset && typeof metadata.passwordReset === "object"
      ? metadata.passwordReset
      : null;
  }

  function buildPasswordResetApprovalData({
    ticket,
    now = new Date(),
    actorId = null,
    autoApproved = false,
    adminResponse = "",
  }) {
    const currentTicket = ticket && typeof ticket === "object" ? ticket : {};
    const previousMetadata = normalizeMetadataObject(currentTicket.metadata);
    const previousPasswordResetMeta = getPasswordResetMetadata(currentTicket) || {};
    const expiresAt = new Date(now.getTime() + normalizedResetTokenMinutes * 60 * 1000);

    return {
      expiresAt,
      data: {
        status: "APPROVED",
        adminResponse:
          sanitizeMultiline(
            adminResponse ||
              (autoApproved
                ? "Reset de senha liberado automaticamente apos o tempo de espera."
                : "Reset de senha liberado pelo administrador."),
            1200
          ) || null,
        metadata: {
          ...previousMetadata,
          passwordReset: {
            ...previousPasswordResetMeta,
            approvedAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            approvedByAdminId: actorId || null,
            requiresToken: false,
            autoApproved: Boolean(autoApproved),
          },
        },
        resolvedById: autoApproved ? null : actorId || null,
        resolvedAt: now,
        autoApproved: Boolean(autoApproved),
      },
    };
  }

  async function approvePasswordResetTicketRecord({
    ticket,
    actorId = null,
    autoApproved = false,
    adminResponse = "",
  }) {
    const currentTicket = ticket && typeof ticket === "object" ? ticket : null;
    if (!currentTicket || !Number(currentTicket.id)) return null;

    const now = new Date();
    const approval = buildPasswordResetApprovalData({
      ticket: currentTicket,
      now,
      actorId,
      autoApproved,
      adminResponse,
    });

    return supportRepository.updateTicketById({
      ticketId: currentTicket.id,
      data: approval.data,
    });
  }

  async function maybeAutoApprovePasswordResetTicket(ticket) {
    const currentTicket = ticket && typeof ticket === "object" ? ticket : null;
    if (!currentTicket) return null;
    if (normalizeType(currentTicket.type) !== "PASSWORD_RESET") return currentTicket;
    if ((normalizeStatus(currentTicket.status) || "OPEN") !== "OPEN") return currentTicket;

    const autoApproveAt = parseDate(currentTicket.autoApproveAt);
    if (!autoApproveAt || autoApproveAt.getTime() > Date.now()) {
      return currentTicket;
    }

    return approvePasswordResetTicketRecord({
      ticket: currentTicket,
      autoApproved: true,
    });
  }

  async function syncPasswordResetTicketCollection(tickets) {
    const list = Array.isArray(tickets) ? tickets : [];
    const syncedTickets = [];

    for (const ticket of list) {
      if (normalizeType(ticket && ticket.type) !== "PASSWORD_RESET") {
        syncedTickets.push(ticket);
        continue;
      }

      syncedTickets.push(await maybeAutoApprovePasswordResetTicket(ticket));
    }

    return syncedTickets;
  }

  function canPasswordResetTicketResetNow(ticket) {
    const currentTicket = ticket && typeof ticket === "object" ? ticket : null;
    if (!currentTicket) return false;

    const status = normalizeStatus(currentTicket.status) || "OPEN";
    if (status !== "APPROVED") return false;

    const passwordResetMeta = getPasswordResetMetadata(currentTicket);
    const expiresAt = parseDate(passwordResetMeta && passwordResetMeta.expiresAt);
    if (!expiresAt) return true;
    return expiresAt.getTime() > Date.now();
  }

  function buildAuthenticatedPasswordResetStatus(ticket) {
    const currentTicket = ticket && typeof ticket === "object" ? ticket : null;
    if (!currentTicket) {
      return {
        found: false,
        ticketId: 0,
        status: "NONE",
        canResetNow: false,
        remainingSeconds: 0,
        autoApproveAt: null,
        autoApproved: false,
        expiresAt: null,
        updatedAt: null,
      };
    }

    const now = new Date();
    const passwordResetMeta = getPasswordResetMetadata(currentTicket);
    const normalizedStatus = normalizeStatus(currentTicket.status) || "OPEN";
    const autoApproveAt = formatDateIso(currentTicket.autoApproveAt);
    const remainingSeconds =
      normalizedStatus === "OPEN" ? getRemainingSeconds(currentTicket.autoApproveAt, now) : 0;

    return {
      found: true,
      ticketId: Number(currentTicket.id) || 0,
      status: normalizedStatus,
      canResetNow: canPasswordResetTicketResetNow(currentTicket),
      remainingSeconds,
      autoApproveAt,
      autoApproved:
        currentTicket.autoApproved === true ||
        Boolean(passwordResetMeta && passwordResetMeta.autoApproved === true),
      expiresAt:
        passwordResetMeta && passwordResetMeta.expiresAt
          ? String(passwordResetMeta.expiresAt)
          : null,
      updatedAt: currentTicket.updatedAt || currentTicket.createdAt || null,
    };
  }

  function sortTicketsByNewest(tickets) {
    return (Array.isArray(tickets) ? tickets : []).slice().sort((first, second) => {
      const firstCreatedAt = new Date((first && first.createdAt) || 0).getTime();
      const secondCreatedAt = new Date((second && second.createdAt) || 0).getTime();
      return secondCreatedAt - firstCreatedAt;
    });
  }

  function isActivePasswordResetTicket(ticket) {
    const normalizedStatus = normalizeStatus(ticket && ticket.status) || "OPEN";
    if (normalizedStatus === "OPEN") return true;
    if (normalizedStatus !== "APPROVED") return false;
    return canPasswordResetTicketResetNow(ticket);
  }

  async function listRequesterPasswordResetTickets({ requesterId, requesterEmail, limit = 50 }) {
    const syncedTickets = await syncPasswordResetTicketCollection(
      await supportRepository.listTicketsByRequester({
        requesterId,
        requesterEmail,
        limit,
      })
    );

    return sortTicketsByNewest(
      syncedTickets.filter((ticket) => normalizeType(ticket && ticket.type) === "PASSWORD_RESET")
    );
  }

  async function createPasswordResetTicketRequest({
    requesterId = null,
    requesterEmail,
    requesterName = "",
    requesterRole = "",
    subject,
    description,
    successMessage = buildPasswordResetRequestMessage({ requesterId }),
  }) {
    const normalizedEmail = normalizeEmail(requesterEmail);
    const resetTickets = await listRequesterPasswordResetTickets({
      requesterId,
      requesterEmail: normalizedEmail,
      limit: 50,
    });
    const existingTicket = resetTickets.find((ticket) => isActivePasswordResetTicket(ticket)) || null;

    if (existingTicket) {
      const existingStatus = buildAuthenticatedPasswordResetStatus(existingTicket);
      return {
        success: false,
        alreadyPending: true,
        message: buildDuplicatePasswordResetRequestMessage(existingStatus),
        ...existingStatus,
        ticket: sanitizeTicket(existingTicket),
      };
    }

    const now = new Date();
    const autoApproveAt = getPasswordResetAutoApproveAt(now, { requesterId });
    const createdTicket = await supportRepository.createTicket({
      ...buildCreateTicketPayload({
        requesterId,
        requesterEmail: normalizedEmail,
        requesterName,
        requesterRole,
        type: "PASSWORD_RESET",
        subject,
        description,
      }),
      autoApproveAt,
      autoApproved: false,
    });

    return {
      success: true,
      alreadyPending: false,
      message: successMessage,
      ...buildAuthenticatedPasswordResetStatus(createdTicket),
      ticket: sanitizeTicket(createdTicket),
    };
  }

  function getTicketArchiveMeta(ticket) {
    const metadata = normalizeMetadataObject(ticket && ticket.metadata);
    const archive =
      metadata.archive && typeof metadata.archive === "object"
        ? metadata.archive
        : null;

    const isArchived = Boolean(
      archive && (archive.isArchived === true || archive.archived === true)
    );

    return {
      metadata,
      isArchived,
      archivedAt: archive && archive.archivedAt ? String(archive.archivedAt) : null,
      archivedById:
        archive && archive.archivedById !== null && archive.archivedById !== undefined
          ? Number(archive.archivedById) || null
          : null,
    };
  }

  function isSupportInfrastructureError(error) {
    const code = String((error && (error.code || error.errorCode || error.errno)) || "")
      .trim()
      .toUpperCase();
    if (
      [
        "P1001",
        "P1002",
        "P1008",
        "P1017",
        "P2010",
        "P2021",
        "P2022",
        "ETIMEDOUT",
        "ECONNREFUSED",
        "EHOSTUNREACH",
        "ENOTFOUND",
        "EACCES",
      ].includes(code)
    ) {
      return true;
    }

    const message = String((error && error.message) || "")
      .trim()
      .toLowerCase();
    return (
      message.includes("support_ticket") ||
      message.includes("database") ||
      message.includes("timed out") ||
      message.includes("timeout") ||
      message.includes("can't reach database") ||
      message.includes("can not reach database") ||
      message.includes("permission denied") ||
      message.includes("insufficient privilege") ||
      message.includes("does not exist")
    );
  }

  function toSupportServiceError(error) {
    if (error instanceof AppError) return error;
    if (isSupportInfrastructureError(error)) {
      return new AppError(
        "Servico de suporte temporariamente indisponivel. Tente novamente em instantes.",
        503,
        "SUPPORT_SERVICE_UNAVAILABLE"
      );
    }
    return new AppError(
      "Nao foi possivel concluir a solicitacao de suporte agora. Tente novamente.",
      503,
      "SUPPORT_REQUEST_FAILED"
    );
  }

  async function openPasswordResetSupportRequest({
    email,
    subject,
    description,
    requesterName,
    type,
  }) {
    try {
      const normalizedEmail = normalizeEmail(email);
      if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
        throw new AppError("Informe um e-mail valido para solicitar a recuperacao.", 400, "VALIDATION_ERROR");
      }

      const requestedType = normalizeType(type || "PASSWORD_RESET");
      const finalType = requestedType === "GENERAL_SUPPORT" ? "GENERAL_SUPPORT" : "PASSWORD_RESET";

      if (finalType === "PASSWORD_RESET") {
        return createPasswordResetTicketRequest({
          requesterId: null,
          requesterEmail: normalizedEmail,
          requesterName,
          requesterRole: "ALUNO",
          subject,
          description,
          successMessage: buildPasswordResetRequestMessage({ requesterId: null }),
        });
      }

      const createdTicket = await supportRepository.createTicket(
        buildCreateTicketPayload({
          requesterId: null,
          requesterEmail: normalizedEmail,
          requesterName,
          requesterRole: "ALUNO",
          type: finalType,
          subject,
          description,
        })
      );

      return {
        message: "Solicitacao de suporte enviada com sucesso.",
        resetMethod: "support_ticket",
        ticketId: Number(createdTicket.id) || 0,
        ticket: sanitizeTicket(createdTicket),
      };
    } catch (error) {
      throw toSupportServiceError(error);
    }
  }

  async function getPublicPasswordResetRequestStatus({ email, ticketId }) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
      throw new AppError("Informe um e-mail valido.", 400, "VALIDATION_ERROR");
    }

    const normalizedTicketId = Number(ticketId) || 0;
    const resetTickets = await listRequesterPasswordResetTickets({
      requesterEmail: normalizedEmail,
      limit: 50,
    });

    let targetTicket = null;
    if (normalizedTicketId > 0) {
      targetTicket =
        resetTickets.find((ticket) => Number(ticket && ticket.id) === normalizedTicketId) || null;
    }
    if (!targetTicket) {
      targetTicket = resetTickets.find((ticket) => isActivePasswordResetTicket(ticket)) || resetTickets[0] || null;
    }

    if (!targetTicket) {
      return {
        found: false,
        ticketId: 0,
        status: "NONE",
        canResetNow: false,
        remainingSeconds: 0,
        autoApproveAt: null,
        expiresAt: null,
        autoApproved: false,
        updatedAt: null,
      };
    }

    const statusPayload = buildAuthenticatedPasswordResetStatus(targetTicket);

    return {
      found: true,
      ticketId: statusPayload.ticketId,
      status: statusPayload.status,
      canResetNow: statusPayload.canResetNow,
      remainingSeconds: statusPayload.remainingSeconds,
      autoApproveAt: statusPayload.autoApproveAt,
      expiresAt: statusPayload.expiresAt,
      autoApproved: statusPayload.autoApproved,
      updatedAt: statusPayload.updatedAt,
    };
  }

  async function resetPasswordFromApprovedRequest({ email, newPassword, confirmPassword }) {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
      throw new AppError("Informe um e-mail valido para redefinir a senha.", 400, "VALIDATION_ERROR");
    }

    const normalizedNewPassword = String(newPassword || "").trim();
    const normalizedConfirmPassword = String(confirmPassword || "").trim();

    validatePasswordStrength(normalizedNewPassword, "Nova senha");

    if (normalizedNewPassword !== normalizedConfirmPassword) {
      throw new AppError(
        "Nova senha e confirmacao de senha nao conferem.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const user = await userRepository.findByEmail(normalizedEmail);
    if (!user) {
      throw new AppError("Usuario nao encontrado para este e-mail.", 404, "USER_NOT_FOUND");
    }

    const resetTickets = await listRequesterPasswordResetTickets({
      requesterEmail: normalizedEmail,
      limit: 50,
    });
    const approvedTickets = resetTickets.filter(
      (ticket) => (normalizeStatus(ticket && ticket.status) || "OPEN") === "APPROVED"
    );
    const approvedTicket = approvedTickets.find((ticket) => canPasswordResetTicketResetNow(ticket)) || null;

    if (!approvedTicket) {
      const hasExpiredApproval = approvedTickets.some(
        (ticket) => !canPasswordResetTicketResetNow(ticket)
      );
      if (hasExpiredApproval) {
        throw new AppError(
          "A liberacao para redefinir senha expirou. Solicite nova liberacao ao Administrador Geral.",
          400,
          "SUPPORT_RESET_APPROVAL_EXPIRED"
        );
      }

      throw new AppError(
        "Sua solicitacao ainda nao foi liberada pelo Administrador Geral.",
        400,
        "SUPPORT_RESET_NOT_APPROVED"
      );
    }

    const metadata = normalizeMetadataObject(approvedTicket.metadata);
    const passwordResetMeta = getPasswordResetMetadata(approvedTicket);

    const passwordHash = await bcrypt.hash(normalizedNewPassword, 12);
    await userRepository.updatePasswordById({
      userId: user.id,
      passwordHash,
    });

    if (typeof userRepository.revokeActivePasswordResetTokensByUserId === "function") {
      await userRepository.revokeActivePasswordResetTokensByUserId(user.id);
    }

    const now = new Date();
    const nextMetadata = {
      ...metadata,
      passwordReset: {
        ...(passwordResetMeta || {}),
        completedAt: now.toISOString(),
        completedWithoutCode: true,
        userId: Number(user.id) || 0,
      },
    };

    await supportRepository.updateTicketById({
      ticketId: approvedTicket.id,
      data: {
        status: "RESOLVED",
        adminResponse:
          sanitizeMultiline(
            "Senha redefinida pelo aluno apos liberacao do Administrador Geral.",
            1200
          ) || null,
        metadata: nextMetadata,
        resolvedAt: now,
      },
    });

    return {
      message: "Senha atualizada com sucesso. Faca login com a nova senha.",
      resetMethod: "support_ticket_no_code",
    };
  }

  async function requestAuthenticatedPasswordResetTicket({
    authUser,
    subject,
    description,
  }) {
    const authUserId = Number(authUser && authUser.id) || 0;
    if (!authUserId) {
      throw new AppError("Usuario nao autenticado.", 401, "UNAUTHORIZED");
    }

    const user = await userRepository.findById(authUserId);
    if (!user) {
      throw new AppError("Usuario nao encontrado.", 404, "USER_NOT_FOUND");
    }

    return createPasswordResetTicketRequest({
      requesterId: user.id,
      requesterEmail: user.email,
      requesterName: user.name,
      requesterRole: user.role,
      subject,
      description,
      successMessage: buildAuthenticatedPasswordResetRequestMessage(),
    });
  }

  async function checkAuthenticatedPasswordResetStatus({ authUser }) {
    const authUserId = Number(authUser && authUser.id) || 0;
    if (!authUserId) {
      throw new AppError("Usuario nao autenticado.", 401, "UNAUTHORIZED");
    }

    const user = await userRepository.findById(authUserId);
    if (!user) {
      throw new AppError("Usuario nao encontrado.", 404, "USER_NOT_FOUND");
    }

    const resetTickets = await listRequesterPasswordResetTickets({
      requesterId: user.id,
      requesterEmail: user.email,
      limit: 50,
    });

    const targetTicket =
      resetTickets.find((ticket) => isActivePasswordResetTicket(ticket)) || resetTickets[0] || null;

    return buildAuthenticatedPasswordResetStatus(targetTicket);
  }

  async function createAuthenticatedSupportTicket({
    authUser,
    type,
    subject,
    description,
  }) {
    if (normalizeType(type) === "PASSWORD_RESET") {
      return requestAuthenticatedPasswordResetTicket({
        authUser,
        subject,
        description,
      });
    }

    const authUserId = Number(authUser && authUser.id) || 0;
    if (!authUserId) {
      throw new AppError("Usuario nao autenticado.", 401, "UNAUTHORIZED");
    }

    const user = await userRepository.findById(authUserId);
    if (!user) {
      throw new AppError("Usuario nao encontrado.", 404, "USER_NOT_FOUND");
    }

    const createdTicket = await supportRepository.createTicket(
      buildCreateTicketPayload({
        requesterId: user.id,
        requesterEmail: user.email,
        requesterName: user.name,
        requesterRole: user.role,
        type,
        subject,
        description,
      })
    );

    return sanitizeTicket(createdTicket);
  }

  async function listMyTickets({ authUser, limit = 100 }) {
    const authUserId = Number(authUser && authUser.id) || 0;
    if (!authUserId) {
      throw new AppError("Usuario nao autenticado.", 401, "UNAUTHORIZED");
    }

    const user = await userRepository.findById(authUserId);
    if (!user) {
      throw new AppError("Usuario nao encontrado.", 404, "USER_NOT_FOUND");
    }

    const tickets = await syncPasswordResetTicketCollection(
      await supportRepository.listTicketsByRequester({
        requesterId: user.id,
        requesterEmail: user.email,
        limit,
      })
    );

    return tickets.map((ticket) => sanitizeTicket(ticket));
  }

  async function listAdminTickets({ status, type, limit = 300, archived } = {}) {
    const archivedMode = parseArchivedMode(archived);
    const normalizedLimit = Math.max(1, Number(limit) || 300);
    const repositoryLimit =
      archivedMode === "all"
        ? normalizedLimit
        : Math.max(normalizedLimit * 3, 300);

    const tickets = await syncPasswordResetTicketCollection(
      await supportRepository.listAllTickets({
        status: normalizeStatus(status),
        type: parseOptionalType(type),
        limit: repositoryLimit,
      })
    );

    const filteredTickets = tickets.filter((ticket) => {
      const archiveMeta = getTicketArchiveMeta(ticket);
      if (archivedMode === "only") return archiveMeta.isArchived;
      if (archivedMode === "exclude") return !archiveMeta.isArchived;
      return true;
    });

    return filteredTickets
      .slice(0, normalizedLimit)
      .map((ticket) => sanitizeTicket(ticket));
  }

  async function listAdminPasswordResetTickets({ status, limit = 300, archived } = {}) {
    return listAdminTickets({
      status,
      type: "PASSWORD_RESET",
      limit,
      archived,
    });
  }

  async function approvePasswordResetTicket({ ticketId, actorId, adminResponse }) {
    const normalizedTicketId = Number(ticketId) || 0;
    const normalizedActorId = Number(actorId) || 0;
    if (!normalizedTicketId) {
      throw new AppError("ticketId invalido.", 400, "VALIDATION_ERROR");
    }
    if (!normalizedActorId) {
      throw new AppError("Usuario nao autenticado.", 401, "UNAUTHORIZED");
    }

    const ticket = await supportRepository.findTicketById(normalizedTicketId);
    if (!ticket) {
      throw new AppError("Solicitacao nao encontrada.", 404, "SUPPORT_TICKET_NOT_FOUND");
    }

    if (normalizeType(ticket.type) !== "PASSWORD_RESET") {
      throw new AppError(
        "Apenas solicitacoes de redefinicao de senha podem ser liberadas por esta acao.",
        400,
        "SUPPORT_TICKET_TYPE_INVALID"
      );
    }

    const currentStatus = normalizeStatus(ticket.status) || "OPEN";
    if (currentStatus === "REJECTED" || currentStatus === "RESOLVED") {
      throw new AppError(
        "Esta solicitacao ja foi finalizada e nao pode receber nova liberacao.",
        400,
        "SUPPORT_TICKET_ALREADY_CLOSED"
      );
    }

    const updatedTicket = await approvePasswordResetTicketRecord({
      ticket,
      actorId: normalizedActorId,
      autoApproved: false,
      adminResponse,
    });
    const passwordResetMeta = getPasswordResetMetadata(updatedTicket);

    return {
      ticket: sanitizeTicket(updatedTicket),
      resetToken: null,
      resetTokenExpiresAt:
        passwordResetMeta && passwordResetMeta.expiresAt
          ? String(passwordResetMeta.expiresAt)
          : null,
      resetMode: "NO_CODE",
    };
  }

  async function updateTicketStatus({ ticketId, actorId, status, adminResponse }) {
    const normalizedTicketId = Number(ticketId) || 0;
    const normalizedActorId = Number(actorId) || 0;
    const normalizedStatus = normalizeStatus(status);
    if (!normalizedTicketId) {
      throw new AppError("ticketId invalido.", 400, "VALIDATION_ERROR");
    }
    if (!normalizedActorId) {
      throw new AppError("Usuario nao autenticado.", 401, "UNAUTHORIZED");
    }
    if (!allowedAdminStatusUpdates.has(normalizedStatus)) {
      throw new AppError(
        "Status invalido. Use OPEN, RESOLVED ou REJECTED.",
        400,
        "SUPPORT_TICKET_STATUS_INVALID"
      );
    }

    const ticket = await supportRepository.findTicketById(normalizedTicketId);
    if (!ticket) {
      throw new AppError("Solicitacao nao encontrada.", 404, "SUPPORT_TICKET_NOT_FOUND");
    }

    const now = new Date();
    const shouldRestartAutoApprovalTimer =
      normalizedStatus === "OPEN" && normalizeType(ticket.type) === "PASSWORD_RESET";
    const updated = await supportRepository.updateTicketById({
      ticketId: normalizedTicketId,
      data: {
        status: normalizedStatus,
        adminResponse: sanitizeMultiline(adminResponse, 1200) || null,
        autoApproveAt: shouldRestartAutoApprovalTimer
          ? getPasswordResetAutoApproveAt(now, { ticket })
          : undefined,
        autoApproved: normalizedStatus === "OPEN" ? false : undefined,
        resolvedById: normalizedStatus === "OPEN" ? null : normalizedActorId,
        resolvedAt: normalizedStatus === "OPEN" ? null : now,
      },
    });

    return sanitizeTicket(updated);
  }

  async function archiveTicket({ ticketId, actorId }) {
    const normalizedTicketId = Number(ticketId) || 0;
    const normalizedActorId = Number(actorId) || 0;
    if (!normalizedTicketId) {
      throw new AppError("ticketId invalido.", 400, "VALIDATION_ERROR");
    }
    if (!normalizedActorId) {
      throw new AppError("Usuario nao autenticado.", 401, "UNAUTHORIZED");
    }

    const ticket = await supportRepository.findTicketById(normalizedTicketId);
    if (!ticket) {
      throw new AppError("Solicitacao nao encontrada.", 404, "SUPPORT_TICKET_NOT_FOUND");
    }

    const currentStatus = normalizeStatus(ticket.status) || "OPEN";
    if (currentStatus !== "RESOLVED" && currentStatus !== "REJECTED") {
      throw new AppError(
        "Somente solicitacoes resolvidas ou rejeitadas podem ser arquivadas.",
        400,
        "SUPPORT_TICKET_ARCHIVE_STATUS_INVALID"
      );
    }

    const archiveMeta = getTicketArchiveMeta(ticket);
    if (archiveMeta.isArchived) {
      throw new AppError(
        "Esta solicitacao ja esta arquivada.",
        400,
        "SUPPORT_TICKET_ALREADY_ARCHIVED"
      );
    }

    const now = new Date();
    const nextMetadata = {
      ...archiveMeta.metadata,
      archive: {
        ...(archiveMeta.metadata &&
        archiveMeta.metadata.archive &&
        typeof archiveMeta.metadata.archive === "object"
          ? archiveMeta.metadata.archive
          : {}),
        isArchived: true,
        archivedAt: now.toISOString(),
        archivedById: normalizedActorId,
        previousStatus: currentStatus,
      },
    };

    const updated = await supportRepository.updateTicketById({
      ticketId: normalizedTicketId,
      data: {
        metadata: nextMetadata,
      },
    });

    return sanitizeTicket(updated);
  }
  return {
    openPasswordResetSupportRequest,
    getPublicPasswordResetRequestStatus,
    resetPasswordFromApprovedRequest,
    requestAuthenticatedPasswordResetTicket,
    checkAuthenticatedPasswordResetStatus,
    createAuthenticatedSupportTicket,
    listMyTickets,
    listAdminTickets,
    listAdminPasswordResetTickets,
    approvePasswordResetTicket,
    updateTicketStatus,
    archiveTicket,
  };
}

module.exports = {
  createSupportService,
};
