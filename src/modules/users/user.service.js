const { AppError } = require("../../utils/AppError");

function createUserService({
  userRepository,
  bcrypt,
  signAccessToken,
  validRoles,
  createHash,
  jwtSessionExpiresIn = "12h",
  jwtRememberExpiresIn = "30d",
  nodeEnv = "development",
}) {
  const roleMap = {
    ADMIN_GERAL: "ADMIN_GERAL",
    ADMIN: "ADMIN",
    INSTRUTOR: "INSTRUTOR",
    ALUNO: "ALUNO",
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  const passwordMinLength = 6;
  const dbTimeoutMs = Math.max(1500, Number(process.env.USER_DB_TIMEOUT_MS) || 8000);
  const loginAttemptsPerBlock = 3;
  const loginTemporaryBlockMinutes = [2, 5, 10];
  const passwordResetEmailDisabledMessage = "Recuperação por e-mail desativada no momento.";

  function withDbTimeout(promise, code = "USER_DB_TIMEOUT") {
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        setTimeout(() => {
          const timeoutError = new Error("Database operation timeout");
          timeoutError.code = code;
          reject(timeoutError);
        }, dbTimeoutMs);
      }),
    ]);
  }

  function isDatabaseConnectivityError(error) {
    const knownCode = String(
      (error && (error.code || error.errorCode || error.errno)) || ""
    )
      .trim()
      .toUpperCase();
    if (
      [
        "AUTH_DB_TIMEOUT",
        "USER_LOGIN_DB_TIMEOUT",
        "USER_PROFILE_DB_TIMEOUT",
        "USER_HEARTBEAT_DB_TIMEOUT",
        "ETIMEDOUT",
        "ECONNREFUSED",
        "EHOSTUNREACH",
        "ENOTFOUND",
        "P1001",
        "P1002",
        "P1008",
      ].includes(knownCode)
    ) {
      return true;
    }

    const message = String((error && error.message) || "")
      .trim()
      .toLowerCase();
    return (
      message.includes("timed out") ||
      message.includes("timeout") ||
      message.includes("can't reach database") ||
      message.includes("can not reach database") ||
      message.includes("p1001") ||
      message.includes("p1002") ||
      message.includes("p1008")
    );
  }

  function normalizeRole(role) {
    if (!role) return null;
    const normalized = String(role).trim().toUpperCase();
    return roleMap[normalized] || null;
  }

  function normalizeEmail(email) {
    return String(email).trim().toLowerCase();
  }

  function normalizePhone(phone) {
    return String(phone).trim().replace(/\s+/g, "");
  }

  function normalizeBoolean(value) {
    if (value === true || value === false) return value;
    if (typeof value === "string") return value.trim().toLowerCase() === "true";
    return Boolean(value);
  }

  function hashToken(token) {
    return createHash("sha256").update(String(token)).digest("hex");
  }

  function validatePasswordStrength(password, fieldLabel = "Senha") {
    if (password.length < passwordMinLength) {
      throw new AppError(
        `${fieldLabel} deve ter no mínimo ${passwordMinLength} caracteres.`,
        400,
        "WEAK_PASSWORD"
      );
    }
  }

  function sanitizeUser(user) {
    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatarUrl: String(user.avatarUrl || "").trim(),
      role: user.role,
      isEnabled: Boolean(user.isEnabled),
      lastLoginAt: user.lastLoginAt || null,
      lastSeenAt: user.lastSeenAt || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  function normalizeAvatarUrl(value) {
    const normalized = String(value || "").trim();
    if (!normalized) return "";
    if (normalized.length > 2048) {
      throw new AppError("URL do avatar excede o limite de 2048 caracteres.", 400, "VALIDATION_ERROR");
    }
    return normalized;
  }

  function normalizeFailedLoginAttempts(value) {
    return Math.max(0, Number(value) || 0);
  }

  function getLockUntilDate(value) {
    if (!value) return null;
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  function getLockRemainingMs(user, now = new Date()) {
    const lockUntil = getLockUntilDate(user && user.loginLockUntil);
    if (!lockUntil) return 0;
    return Math.max(0, lockUntil.getTime() - now.getTime());
  }

  function formatLockWait(remainingMs) {
    const totalSeconds = Math.max(0, Math.ceil(Number(remainingMs) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const minutesPart =
      minutes > 0 ? `${minutes} minuto${minutes === 1 ? "" : "s"}` : "";
    const secondsPart =
      seconds > 0 ? `${seconds} segundo${seconds === 1 ? "" : "s"}` : "";
    const parts = [minutesPart, secondsPart].filter(Boolean);
    return parts.length ? parts.join(" e ") : "alguns segundos";
  }

  function buildFailedLoginState(user, now = new Date()) {
    const currentAttempts = normalizeFailedLoginAttempts(user && user.failedLoginAttempts);
    const nextAttempts = currentAttempts + 1;
    const reachedBlockBoundary = nextAttempts % loginAttemptsPerBlock === 0;
    const blockStage = Math.floor(nextAttempts / loginAttemptsPerBlock);
    const attemptsUntilTemporaryLock =
      loginAttemptsPerBlock - (nextAttempts % loginAttemptsPerBlock || loginAttemptsPerBlock);

    if (reachedBlockBoundary && blockStage >= loginTemporaryBlockMinutes.length + 1) {
      return {
        nextAttempts,
        loginLockUntil: null,
        shouldDisableAccount: true,
        code: "ACCOUNT_LOCKED_ADMIN_REQUIRED",
        message:
          "Conta bloqueada por excesso de tentativas. Procure o administrador geral para liberar o acesso.",
      };
    }

    if (reachedBlockBoundary) {
      const lockMinutes = loginTemporaryBlockMinutes[blockStage - 1];
      const lockUntil = new Date(now.getTime() + lockMinutes * 60 * 1000);
      return {
        nextAttempts,
        loginLockUntil: lockUntil,
        shouldDisableAccount: false,
        code: "ACCOUNT_LOCKED_TEMPORARY",
        message: `Senha incorreta. Tente novamente em ${lockMinutes} minuto${lockMinutes === 1 ? "" : "s"}.`,
      };
    }

    return {
      nextAttempts,
      loginLockUntil: null,
      shouldDisableAccount: false,
      code: "INVALID_PASSWORD",
      message: `Senha incorreta. Restam ${attemptsUntilTemporaryLock} tentativa${
        attemptsUntilTemporaryLock === 1 ? "" : "s"
      } antes do bloqueio temporário.`,
    };
  }

  async function register({ name, email, phone, password, confirmPassword, role }) {
    if (!name || !email || !phone || !password || !confirmPassword) {
      throw new AppError(
        "Campos obrigatórios: name, email, phone, password, confirmPassword.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = normalizePhone(phone);

    if (!emailRegex.test(normalizedEmail)) {
      throw new AppError("Email inválido.", 400, "VALIDATION_ERROR");
    }

    if (!phoneRegex.test(normalizedPhone)) {
      throw new AppError(
        "Telefone inválido. Use apenas números, com 10 a 15 dígitos.",
        400,
        "VALIDATION_ERROR"
      );
    }

    validatePasswordStrength(password, "Senha");

    if (password !== confirmPassword) {
      throw new AppError("Senha e confirmação de senha não conferem.", 400, "VALIDATION_ERROR");
    }

    const normalizedRole = normalizeRole(role || "ALUNO");
    if (!normalizedRole || !validRoles.includes(normalizedRole)) {
      throw new AppError(
        "Role inválida. Use ADMIN_GERAL, ADMIN, INSTRUTOR ou ALUNO.",
        400,
        "VALIDATION_ERROR"
      );
    }

    if (normalizedRole !== "ALUNO") {
      throw new AppError(
        "Cadastro público permitido apenas para ALUNO. Funções administrativas são definidas pelo ADMIN_GERAL.",
        403,
        "ROLE_NOT_ALLOWED_ON_PUBLIC_REGISTER"
      );
    }

    const existingUser = await userRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new AppError("Email já cadastrado.", 409, "EMAIL_ALREADY_EXISTS");
    }

    const existingPhone = await userRepository.findByPhone(normalizedPhone);
    if (existingPhone) {
      throw new AppError("Telefone já cadastrado.", 409, "PHONE_ALREADY_EXISTS");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const createdUser = await userRepository.createAccount({
      name,
      email: normalizedEmail,
      phone: normalizedPhone,
      passwordHash,
      role: normalizedRole,
    });

    return sanitizeUser(createdUser);
  }

  async function login({ email, password, rememberMe, deviceName }) {
    if (!email || !password) {
      throw new AppError("Campos obrigatórios: email e password.", 400, "VALIDATION_ERROR");
    }

    const normalizedEmail = normalizeEmail(email);
    let user = null;
    try {
      user = await withDbTimeout(
        userRepository.findByEmail(normalizedEmail),
        "USER_LOGIN_DB_TIMEOUT"
      );
    } catch (error) {
      if (isDatabaseConnectivityError(error)) {
        throw new AppError(
          "Serviço de autenticação temporariamente indisponível.",
          503,
          "AUTH_SERVICE_UNAVAILABLE"
        );
      }

      throw error;
    }

    if (!user) {
      throw new AppError("Usuário não cadastrado", 400, "USER_NOT_FOUND");
    }

    const now = new Date();
    const activeLockRemainingMs = getLockRemainingMs(user, now);
    if (activeLockRemainingMs > 0) {
      throw new AppError(
        `Muitas tentativas inválidas. Tente novamente em ${formatLockWait(activeLockRemainingMs)}.`,
        429,
        "ACCOUNT_LOCKED_TEMPORARY"
      );
    }

    if (!user.isEnabled) {
      throw new AppError(
        "Conta desabilitada. Procure a administração para reativar o acesso.",
        403,
        "ACCOUNT_DISABLED"
      );
    }

    const registerFailedLoginAttempt = async () => {
      const failedState = buildFailedLoginState(user, now);
      try {
        await withDbTimeout(
          userRepository.updateLoginSecurityState({
            userId: user.id,
            failedLoginAttempts: failedState.nextAttempts,
            loginLockUntil: failedState.loginLockUntil,
            isEnabled: failedState.shouldDisableAccount ? false : undefined,
          }),
          "USER_LOGIN_DB_TIMEOUT"
        );
      } catch (error) {
        if (isDatabaseConnectivityError(error)) {
          throw new AppError(
            "Serviço de autenticação temporariamente indisponível.",
            503,
            "AUTH_SERVICE_UNAVAILABLE"
          );
        }
        throw error;
      }

      if (failedState.shouldDisableAccount) {
        throw new AppError(failedState.message, 403, failedState.code);
      }

      const statusCode = failedState.code === "ACCOUNT_LOCKED_TEMPORARY" ? 429 : 400;
      throw new AppError(failedState.message, statusCode, failedState.code);
    };

    if (!user.password) {
      await registerFailedLoginAttempt();
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      await registerFailedLoginAttempt();
    }

    const rememberedSession = normalizeBoolean(rememberMe);
    const safeDeviceName = String(deviceName || "").trim().slice(0, 80);
    const token = signAccessToken(
      {
        id: user.id,
        role: user.role,
        sessionType: rememberedSession ? "persistent" : "session",
        device: safeDeviceName || undefined,
      },
      {
        expiresIn: rememberedSession ? jwtRememberExpiresIn : jwtSessionExpiresIn,
      }
    );

    try {
      await withDbTimeout(userRepository.markSuccessfulLogin(user.id), "USER_LOGIN_DB_TIMEOUT");
    } catch (error) {
      if (isDatabaseConnectivityError(error)) {
        if (nodeEnv !== "production") {
          return {
            token,
          };
        }
        throw new AppError(
          "Serviço de autenticação temporariamente indisponível.",
          503,
          "AUTH_SERVICE_UNAVAILABLE"
        );
      }

      throw error;
    }

    return {
      token,
    };
  }

  async function requestPasswordReset({ email }) {
    if (!email) {
      throw new AppError("Campo obrigatório: email.", 400, "VALIDATION_ERROR");
    }
    const normalizedEmail = normalizeEmail(email);
    if (!emailRegex.test(normalizedEmail)) {
      throw new AppError("Email inválido.", 400, "VALIDATION_ERROR");
    }

    return {
      message: passwordResetEmailDisabledMessage,
      resetMethod: "disabled",
    };
  }

  async function resetPassword({ token, newPassword, confirmPassword }) {
    if (!token || !newPassword || !confirmPassword) {
      throw new AppError(
        "Campos obrigatórios: token, newPassword, confirmPassword.",
        400,
        "VALIDATION_ERROR"
      );
    }

    validatePasswordStrength(newPassword, "Nova senha");

    if (newPassword !== confirmPassword) {
      throw new AppError(
        "Nova senha e confirmação de senha não conferem.",
        400,
        "VALIDATION_ERROR"
      );
    }

    const tokenHash = hashToken(String(token).trim());
    const storedToken = await userRepository.findValidPasswordResetToken(tokenHash);

    if (!storedToken) {
      throw new AppError(
        "Token de recuperação inválido ou expirado.",
        400,
        "INVALID_RESET_TOKEN"
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await userRepository.applyPasswordReset({
      resetTokenId: storedToken.id,
      userId: storedToken.userId,
      passwordHash,
    });

    return {
      message: "Senha atualizada com sucesso.",
    };
  }

  async function getProfile(userId, authUser = null) {
    let user = null;
    try {
      user = await withDbTimeout(
        userRepository.findById(userId),
        "USER_PROFILE_DB_TIMEOUT"
      );
    } catch (error) {
      if (isDatabaseConnectivityError(error)) {
        throw new AppError(
          "Serviço de autenticação temporariamente indisponível.",
          503,
          "AUTH_SERVICE_UNAVAILABLE"
        );
      }

      throw error;
    }

    if (!user) {
      throw new AppError("Usuário não encontrado.", 404, "USER_NOT_FOUND");
    }

    return sanitizeUser(user);
  }

  async function listUsers() {
    return userRepository.listUsers();
  }

  async function updateProfileAvatar(userId, { avatarUrl }) {
    const normalizedUserId = Number(userId);
    if (!normalizedUserId || Number.isNaN(normalizedUserId)) {
      throw new AppError("Usuário não autenticado.", 401, "UNAUTHORIZED");
    }

    const normalizedAvatarUrl = normalizeAvatarUrl(avatarUrl);
    let updatedUser = null;
    try {
      updatedUser = await withDbTimeout(
        userRepository.updateProfileAvatar({
          userId: normalizedUserId,
          avatarUrl: normalizedAvatarUrl,
        }),
        "USER_PROFILE_DB_TIMEOUT"
      );
    } catch (error) {
      if (isDatabaseConnectivityError(error)) {
        throw new AppError(
          "Serviço de autenticação temporariamente indisponível.",
          503,
          "AUTH_SERVICE_UNAVAILABLE"
        );
      }
      const errorCode = String((error && error.code) || "").trim().toUpperCase();
      if (errorCode === "P2025") {
        throw new AppError("Usuário não encontrado.", 404, "USER_NOT_FOUND");
      }
      throw error;
    }

    if (!updatedUser) {
      throw new AppError("Usuário não encontrado.", 404, "USER_NOT_FOUND");
    }

    return sanitizeUser(updatedUser);
  }

  async function heartbeat(userId) {
    if (!userId) {
      throw new AppError("Usuário não autenticado.", 401, "UNAUTHORIZED");
    }

    let user = null;
    try {
      user = await withDbTimeout(
        userRepository.findById(userId),
        "USER_HEARTBEAT_DB_TIMEOUT"
      );
    } catch (error) {
      if (nodeEnv !== "production" && isDatabaseConnectivityError(error)) {
        return;
      }
      throw error;
    }

    if (!user) {
      throw new AppError("Usuário não encontrado.", 404, "USER_NOT_FOUND");
    }

    try {
      await userRepository.touchUserPresence({
        userId: Number(userId),
        onLogin: false,
      });
    } catch (error) {
      if (!(nodeEnv !== "production" && isDatabaseConnectivityError(error))) {
        throw error;
      }
    }
  }

  return {
    register,
    login,
    requestPasswordReset,
    resetPassword,
    forgotPassword: requestPasswordReset,
    getProfile,
    listUsers,
    updateProfileAvatar,
    heartbeat,
  };
}

module.exports = {
  createUserService,
};

