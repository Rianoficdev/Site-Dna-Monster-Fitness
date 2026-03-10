const { Router } = require("express");

function createUsersRoutes({ userController, authMiddleware, roleMiddleware, roles }) {
  const router = Router();

  router.get(
    "/users",
    authMiddleware,
    roleMiddleware(roles.ADMIN, roles.ADMIN_GERAL),
    userController.listUsers
  );

  router.get(
    "/users/students",
    authMiddleware,
    roleMiddleware(roles.INSTRUTOR, roles.ADMIN_GERAL),
    userController.listStudents
  );

  return router;
}

module.exports = {
  createUsersRoutes,
};
