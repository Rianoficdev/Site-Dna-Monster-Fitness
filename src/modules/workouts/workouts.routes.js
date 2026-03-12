const { Router } = require("express");

function createWorkoutsRoutes({ workoutsController, authMiddleware, roleMiddleware, roles }) {
  const router = Router();

  router.get(
    "/instructor/workouts",
    authMiddleware,
    roleMiddleware(roles.INSTRUTOR, roles.ADMIN_GERAL),
    workoutsController.listInstructorWorkouts
  );

  router.post(
    "/instructor/workouts",
    authMiddleware,
    roleMiddleware(roles.INSTRUTOR, roles.ADMIN_GERAL),
    workoutsController.createInstructorWorkout
  );

  router.patch(
    "/instructor/workouts/:workoutId",
    authMiddleware,
    roleMiddleware(roles.INSTRUTOR, roles.ADMIN_GERAL),
    workoutsController.updateInstructorWorkout
  );

  router.patch(
    "/instructor/workouts/:workoutId/deactivate",
    authMiddleware,
    roleMiddleware(roles.INSTRUTOR, roles.ADMIN_GERAL),
    workoutsController.deactivateInstructorWorkout
  );

  router.delete(
    "/instructor/workouts/:workoutId",
    authMiddleware,
    roleMiddleware(roles.INSTRUTOR, roles.ADMIN_GERAL),
    workoutsController.deleteInstructorWorkout
  );

  router.get(
    "/student/workouts",
    authMiddleware,
    roleMiddleware(roles.ALUNO),
    workoutsController.listStudentWorkouts
  );

  router.post(
    "/workouts",
    authMiddleware,
    roleMiddleware(roles.ALUNO, roles.INSTRUTOR, roles.ADMIN_GERAL),
    workoutsController.createWorkout
  );

  router.patch(
    "/workouts/:workoutId",
    authMiddleware,
    roleMiddleware(roles.INSTRUTOR, roles.ADMIN_GERAL),
    workoutsController.updateWorkout
  );

  router.delete(
    "/workouts/:workoutId",
    authMiddleware,
    roleMiddleware(roles.INSTRUTOR, roles.ADMIN_GERAL),
    workoutsController.deleteInstructorWorkout
  );

  router.get("/workouts/my", authMiddleware, workoutsController.listMyWorkouts);

  router.get("/workouts/templates", authMiddleware, workoutsController.listWorkoutTemplates);

  router.post(
    "/workouts/templates",
    authMiddleware,
    roleMiddleware(roles.INSTRUTOR, roles.ADMIN_GERAL),
    workoutsController.createWorkoutTemplate
  );

  router.patch(
    "/workouts/templates/:templateId",
    authMiddleware,
    roleMiddleware(roles.INSTRUTOR, roles.ADMIN_GERAL),
    workoutsController.updateWorkoutTemplate
  );

  router.delete(
    "/workouts/templates/:templateId",
    authMiddleware,
    roleMiddleware(roles.INSTRUTOR, roles.ADMIN_GERAL),
    workoutsController.deleteWorkoutTemplate
  );

  router.get(
    "/workouts/templates/:templateId/exercises",
    authMiddleware,
    workoutsController.listTemplateExercises
  );

  router.post(
    "/workouts/templates/:templateId/exercises",
    authMiddleware,
    roleMiddleware(roles.INSTRUTOR, roles.ADMIN_GERAL),
    workoutsController.addTemplateExercise
  );

  router.post(
    "/workout/from-template",
    authMiddleware,
    roleMiddleware(roles.INSTRUTOR, roles.ADMIN_GERAL),
    workoutsController.createWorkoutFromTemplate
  );

  router.post(
    "/workouts/from-template",
    authMiddleware,
    roleMiddleware(roles.INSTRUTOR, roles.ADMIN_GERAL),
    workoutsController.createWorkoutFromTemplate
  );

  return router;
}

module.exports = {
  createWorkoutsRoutes,
};
