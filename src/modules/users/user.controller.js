const { asyncHandler } = require("../../utils/asyncHandler");

function createUserController({ userService, workoutsService, supportService }) {
  const normalizeRole = (role) => String(role || "").trim().toUpperCase();

  const register = asyncHandler(async (req, res) => {
    const user = await userService.register(req.body);

    return res.status(201).json({
      message: "Usuario cadastrado com sucesso.",
      user,
    });
  });

  const login = asyncHandler(async (req, res) => {
    const result = await userService.login(req.body);
    return res.status(200).json(result);
  });

  const requestPasswordReset = asyncHandler(async (req, res) => {
    let result = null;
    if (supportService && typeof supportService.openPasswordResetSupportRequest === "function") {
      result = await supportService.openPasswordResetSupportRequest(req.body || {});
    } else {
      result = await userService.requestPasswordReset(req.body || {});
    }
    return res.status(200).json(result);
  });

  const resetPassword = asyncHandler(async (req, res) => {
    const payload = req.body || {};
    const hasToken = Boolean(String(payload.token || "").trim());
    let result = null;

    if (!hasToken && supportService && typeof supportService.resetPasswordFromApprovedRequest === "function") {
      result = await supportService.resetPasswordFromApprovedRequest(payload);
    } else {
      result = await userService.resetPassword(payload);
    }
    return res.status(200).json(result);
  });

  const profile = asyncHandler(async (req, res) => {
    const user = await userService.getProfile(req.userId || (req.user && req.user.id), req.user);
    return res.status(200).json({ user });
  });

  const updateProfileAvatar = asyncHandler(async (req, res) => {
    const user = await userService.updateProfileAvatar(
      req.userId || (req.user && req.user.id),
      req.body || {}
    );
    return res.status(200).json({
      message: "Avatar atualizado com sucesso.",
      user,
    });
  });

  const listUsers = asyncHandler(async (_req, res) => {
    const users = await userService.listUsers();
    return res.status(200).json({ users });
  });

  const listStudents = asyncHandler(async (req, res) => {
    let students = [];
    if (workoutsService && typeof workoutsService.listAssignableStudents === "function") {
      students = await workoutsService.listAssignableStudents({
        authUser: req.user,
      });
    } else {
      const users = await userService.listUsers();
      students = users.filter(
        (user) => normalizeRole(user.role) === "ALUNO" && user.isEnabled !== false
      );
    }

    return res.status(200).json({ users: students });
  });

  const heartbeat = asyncHandler(async (req, res) => {
    await userService.heartbeat(req.userId || (req.user && req.user.id));
    return res.status(204).send();
  });

  return {
    register,
    login,
    requestPasswordReset,
    resetPassword,
    forgotPassword: requestPasswordReset,
    profile,
    updateProfileAvatar,
    listUsers,
    listStudents,
    heartbeat,
  };
}

module.exports = {
  createUserController,
};
