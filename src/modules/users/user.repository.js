function createUserRepository({ prisma }) {
  function normalizeUserId(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return Math.trunc(parsed);
  }

  const publicSelect = {
    id: true,
    name: true,
    email: true,
    phone: true,
    avatarUrl: true,
    role: true,
    isEnabled: true,
    lastLoginAt: true,
    lastSeenAt: true,
    createdAt: true,
    updatedAt: true,
  };

  const authSelect = {
    ...publicSelect,
    password: true,
    failedLoginAttempts: true,
    loginLockUntil: true,
  };

  async function findByEmail(email) {
    if (!email) return null;

    return prisma.user.findUnique({
      where: {
        email: email.toLowerCase().trim(),
      },
      select: authSelect,
    });
  }

  async function findById(id) {
    const normalizedId = normalizeUserId(id);
    if (!normalizedId) return null;
    return prisma.user.findUnique({
      where: {
        id: normalizedId,
      },
      select: authSelect,
    });
  }

  async function createUser({ name, email, passwordHash, role }) {
    return prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: null,
        password: passwordHash,
        role,
        isEnabled: true,
      },
      select: authSelect,
    });
  }

  async function createAccount({ name, email, phone, passwordHash, role }) {
    return prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        password: passwordHash,
        role,
        isEnabled: true,
      },
      select: authSelect,
    });
  }

  async function findByPhone(phone) {
    if (!phone) return null;

    return prisma.user.findUnique({
      where: {
        phone: phone.trim(),
      },
      select: authSelect,
    });
  }

  async function updatePasswordById({ userId, passwordHash }) {
    const normalizedUserId = normalizeUserId(userId);
    if (!normalizedUserId) return null;
    return prisma.user.update({
      where: {
        id: normalizedUserId,
      },
      data: {
        password: passwordHash,
      },
      select: authSelect,
    });
  }

  async function createPasswordResetToken({ userId, tokenHash, expiresAt }) {
    const normalizedUserId = normalizeUserId(userId);
    if (!normalizedUserId) return null;
    return prisma.passwordResetToken.create({
      data: {
        userId: normalizedUserId,
        tokenHash,
        expiresAt,
      },
    });
  }

  async function findValidPasswordResetToken(tokenHash) {
    return prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
  }

  async function findActivePasswordResetTokenByUserId(userId) {
    const normalizedUserId = normalizeUserId(userId);
    if (!normalizedUserId) return null;
    return prisma.passwordResetToken.findFirst({
      where: {
        userId: normalizedUserId,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async function revokeActivePasswordResetTokensByUserId(userId) {
    const normalizedUserId = normalizeUserId(userId);
    if (!normalizedUserId) return { count: 0 };
    return prisma.passwordResetToken.updateMany({
      where: {
        userId: normalizedUserId,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });
  }

  async function applyPasswordReset({ resetTokenId, userId, passwordHash }) {
    const normalizedResetTokenId = normalizeUserId(resetTokenId);
    const normalizedUserId = normalizeUserId(userId);
    if (!normalizedResetTokenId || !normalizedUserId) return null;
    const now = new Date();

    return prisma.$transaction([
      prisma.user.update({
        where: {
          id: normalizedUserId,
        },
        data: {
          password: passwordHash,
        },
        select: authSelect,
      }),
      prisma.passwordResetToken.update({
        where: {
          id: normalizedResetTokenId,
        },
        data: {
          usedAt: now,
        },
      }),
      prisma.passwordResetToken.updateMany({
        where: {
          userId: normalizedUserId,
          usedAt: null,
        },
        data: {
          usedAt: now,
        },
      }),
    ]);
  }

  async function listUsers() {
    return prisma.user.findMany({
      select: publicSelect,
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async function touchUserPresence({ userId, onLogin = false }) {
    const normalizedUserId = normalizeUserId(userId);
    if (!normalizedUserId) return null;
    const now = new Date();
    return prisma.user.update({
      where: {
        id: normalizedUserId,
      },
      data: onLogin
        ? {
            lastSeenAt: now,
            lastLoginAt: now,
          }
        : {
            lastSeenAt: now,
          },
      select: publicSelect,
    });
  }

  async function updateUserRole({ userId, role }) {
    const normalizedUserId = normalizeUserId(userId);
    if (!normalizedUserId) return null;
    return prisma.user.update({
      where: {
        id: normalizedUserId,
      },
      data: {
        role,
      },
      select: publicSelect,
    });
  }

  async function updateUserEnabledStatus({ userId, isEnabled }) {
    const normalizedUserId = normalizeUserId(userId);
    if (!normalizedUserId) return null;
    const normalizedStatus = Boolean(isEnabled);
    return prisma.user.update({
      where: {
        id: normalizedUserId,
      },
      data: {
        isEnabled: normalizedStatus,
        ...(normalizedStatus
          ? {
              failedLoginAttempts: 0,
              loginLockUntil: null,
            }
          : {}),
      },
      select: publicSelect,
    });
  }

  async function updateProfileAvatar({ userId, avatarUrl }) {
    const normalizedUserId = normalizeUserId(userId);
    if (!normalizedUserId) return null;
    return prisma.user.update({
      where: {
        id: normalizedUserId,
      },
      data: {
        avatarUrl: String(avatarUrl || "").trim(),
      },
      select: publicSelect,
    });
  }

  async function updateLoginSecurityState({
    userId,
    failedLoginAttempts,
    loginLockUntil,
    isEnabled,
  }) {
    const normalizedUserId = normalizeUserId(userId);
    if (!normalizedUserId) return null;
    const data = {};

    if (failedLoginAttempts !== undefined) {
      data.failedLoginAttempts = Math.max(0, Number(failedLoginAttempts) || 0);
    }

    if (loginLockUntil !== undefined) {
      data.loginLockUntil = loginLockUntil ? new Date(loginLockUntil) : null;
    }

    if (isEnabled !== undefined) {
      data.isEnabled = Boolean(isEnabled);
    }

    return prisma.user.update({
      where: {
        id: normalizedUserId,
      },
      data,
      select: authSelect,
    });
  }

  async function markSuccessfulLogin(userId) {
    const normalizedUserId = normalizeUserId(userId);
    if (!normalizedUserId) return null;
    const now = new Date();
    return prisma.user.update({
      where: {
        id: normalizedUserId,
      },
      data: {
        failedLoginAttempts: 0,
        loginLockUntil: null,
        lastSeenAt: now,
        lastLoginAt: now,
      },
      select: publicSelect,
    });
  }

  async function deleteUserById(userId) {
    const normalizedUserId = normalizeUserId(userId);
    if (!normalizedUserId) return null;
    return prisma.user.delete({
      where: {
        id: normalizedUserId,
      },
      select: publicSelect,
    });
  }

  return {
    findByEmail,
    findById,
    createUser,
    createAccount,
    findByPhone,
    updatePasswordById,
    createPasswordResetToken,
    findValidPasswordResetToken,
    findActivePasswordResetTokenByUserId,
    revokeActivePasswordResetTokensByUserId,
    applyPasswordReset,
    listUsers,
    touchUserPresence,
    updateUserRole,
    updateUserEnabledStatus,
    updateProfileAvatar,
    updateLoginSecurityState,
    markSuccessfulLogin,
    deleteUserById,
  };
}

module.exports = {
  createUserRepository,
};
