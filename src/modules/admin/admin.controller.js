const { asyncHandler } = require("../../utils/asyncHandler");

function createAdminController({ adminService }) {
  const getOverview = asyncHandler(async (req, res) => {
    const fresh = String(req.query && req.query.fresh ? req.query.fresh : "")
      .trim()
      .toLowerCase() === "true";
    const overview = await adminService.getOverview({ fresh });

    return res.status(200).json({
      message: "Painel do administrador geral carregado com sucesso.",
      overview,
    });
  });

  const updateUserRole = asyncHandler(async (req, res) => {
    const user = await adminService.updateUserRole({
      actorId: req.user.id,
      userId: req.params.userId,
      role: req.body.role,
    });

    return res.status(200).json({
      message: "Função do usuário atualizada com sucesso.",
      user,
    });
  });

  const updateStudentStatus = asyncHandler(async (req, res) => {
    const user = await adminService.updateStudentStatus({
      actorId: req.user.id,
      userId: req.params.userId,
      isEnabled: req.body.isEnabled,
    });

    return res.status(200).json({
      message: user.isEnabled
        ? "Aluno habilitado com sucesso."
        : "Aluno desabilitado com sucesso.",
      user,
    });
  });

  const deleteDisabledUser = asyncHandler(async (req, res) => {
    const user = await adminService.deleteDisabledUser({
      actorId: req.user.id,
      userId: req.params.userId,
      adminPassword: req.body && req.body.adminPassword,
    });

    return res.status(200).json({
      message: "Usuário desabilitado excluído com sucesso.",
      user,
    });
  });

  const getSiteTeamMembers = asyncHandler(async (_req, res) => {
    const members = await adminService.getSiteTeamMembers();
    return res.status(200).json({
      members,
    });
  });

  const updateSiteTeamMembers = asyncHandler(async (req, res) => {
    const members = await adminService.updateSiteTeamMembers({
      members: req.body && req.body.members,
    });
    return res.status(200).json({
      message: "Sessao de time atualizada com sucesso.",
      members,
    });
  });

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
  createAdminController,
};

