const { Router } = require("express");
const { createAuthRoutes } = require("../modules/auth/auth.routes");
const { createUsersRoutes } = require("../modules/users/users.routes");
const { createWorkoutsRoutes } = require("../modules/workouts/workouts.routes");
const { createExercisesRoutes } = require("../modules/exercises/exercises.routes");
const { createProgressRoutes } = require("../modules/progress/progress.routes");
const { createLibraryRoutes } = require("../modules/library/library.routes");
const { createAdminRoutes } = require("../modules/admin/admin.routes");
const { createUploadsRoutes } = require("../modules/uploads/uploads.routes");
const { createSupportRoutes } = require("../modules/support/support.routes");

function createApiRouter({ controllers, authMiddleware, roleMiddleware, roles }) {
  const router = Router();

  router.get("/health", (_req, res) => {
    return res.status(200).json({
      status: "ok",
      service: "dna-monster-fitness-api",
    });
  });

  router.use(
    createAuthRoutes({
      userController: controllers.userController,
      authMiddleware,
    })
  );

  router.use(
    createUsersRoutes({
      userController: controllers.userController,
      authMiddleware,
      roleMiddleware,
      roles,
    })
  );

  router.use(
    createWorkoutsRoutes({
      workoutsController: controllers.workoutsController,
      authMiddleware,
      roleMiddleware,
      roles,
    })
  );

  router.use(
    createExercisesRoutes({
      exercisesController: controllers.exercisesController,
      authMiddleware,
      roleMiddleware,
      roles,
    })
  );

  router.use(
    createProgressRoutes({
      progressController: controllers.progressController,
      authMiddleware,
      roleMiddleware,
      roles,
    })
  );

  router.use(
    createLibraryRoutes({
      libraryController: controllers.libraryController,
      authMiddleware,
      roleMiddleware,
      roles,
    })
  );

  router.use(
    createUploadsRoutes({
      authMiddleware,
      roleMiddleware,
      roles,
    })
  );

  router.use(
    createAdminRoutes({
      adminController: controllers.adminController,
      authMiddleware,
      roleMiddleware,
      roles,
    })
  );

  router.use(
    createSupportRoutes({
      supportController: controllers.supportController,
      authMiddleware,
      roleMiddleware,
      roles,
    })
  );

  return router;
}

module.exports = {
  createApiRouter,
};
