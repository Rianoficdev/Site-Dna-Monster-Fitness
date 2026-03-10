const { Router } = require("express");

function createProgressRoutes({ progressController, authMiddleware, roleMiddleware, roles }) {
  const router = Router();
  const studentAccessRoles = [roles.ALUNO, roles.ADMIN, roles.ADMIN_GERAL, roles.INSTRUTOR];

  router.post(
    "/progress",
    authMiddleware,
    roleMiddleware(roles.ALUNO, roles.ADMIN, roles.ADMIN_GERAL),
    progressController.registerProgress
  );

  router.get(
    "/progress/week",
    authMiddleware,
    roleMiddleware(...studentAccessRoles),
    progressController.getMyWeekSummary
  );

  router.get(
    "/progress/workouts/history",
    authMiddleware,
    roleMiddleware(...studentAccessRoles),
    progressController.listMyWorkoutHistory
  );

  router.post(
    "/progress/workouts/:workoutId/complete",
    authMiddleware,
    roleMiddleware(roles.ALUNO),
    progressController.completeMyWorkout
  );

  router.get(
    "/progress/instructor/students-report",
    authMiddleware,
    roleMiddleware(roles.INSTRUTOR, roles.ADMIN_GERAL),
    progressController.getInstructorStudentsReport
  );

  router.put(
    "/progress/week/day",
    authMiddleware,
    roleMiddleware(...studentAccessRoles),
    progressController.setMyWeekDay
  );

  router.get("/progress/my", authMiddleware, progressController.listMyProgress);

  return router;
}

module.exports = {
  createProgressRoutes,
};
