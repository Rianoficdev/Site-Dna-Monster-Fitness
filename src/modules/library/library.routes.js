const { Router } = require("express");

function createLibraryRoutes({ libraryController, authMiddleware, roleMiddleware, roles }) {
  const router = Router();

  router.get("/library/exercises", authMiddleware, libraryController.listLibraryExercises);

  router.post(
    "/library/exercises",
    authMiddleware,
    roleMiddleware(roles.ADMIN, roles.ADMIN_GERAL),
    libraryController.createLibraryExercise
  );

  router.put(
    "/library/exercises/:exerciseId",
    authMiddleware,
    roleMiddleware(roles.ADMIN, roles.ADMIN_GERAL),
    libraryController.updateLibraryExercise
  );

  router.patch(
    "/library/exercises/:exerciseId/status",
    authMiddleware,
    roleMiddleware(roles.ADMIN, roles.ADMIN_GERAL),
    libraryController.setLibraryExerciseStatus
  );

  router.delete(
    "/library/exercises/:exerciseId",
    authMiddleware,
    roleMiddleware(roles.ADMIN, roles.ADMIN_GERAL),
    libraryController.deleteLibraryExercise
  );

  return router;
}

module.exports = {
  createLibraryRoutes,
};
