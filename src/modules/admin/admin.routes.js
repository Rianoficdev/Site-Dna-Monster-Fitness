const { Router } = require("express");

function createAdminRoutes({ adminController, authMiddleware, roleMiddleware, roles }) {
  const router = Router();

  router.get("/site-content/team", adminController.getSiteTeamMembers);

  router.get(
    "/admin/overview",
    authMiddleware,
    roleMiddleware(roles.ADMIN_GERAL),
    adminController.getOverview
  );

  router.patch(
    "/admin/users/:userId/role",
    authMiddleware,
    roleMiddleware(roles.ADMIN_GERAL),
    adminController.updateUserRole
  );

  router.patch(
    "/admin/users/:userId/status",
    authMiddleware,
    roleMiddleware(roles.ADMIN_GERAL),
    adminController.updateStudentStatus
  );

  router.delete(
    "/admin/users/:userId",
    authMiddleware,
    roleMiddleware(roles.ADMIN_GERAL),
    adminController.deleteDisabledUser
  );

  router.patch(
    "/admin/site-content/team",
    authMiddleware,
    roleMiddleware(roles.ADMIN_GERAL),
    adminController.updateSiteTeamMembers
  );

  return router;
}

module.exports = {
  createAdminRoutes,
};
