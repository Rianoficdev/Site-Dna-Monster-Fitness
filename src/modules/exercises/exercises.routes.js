const { Router } = require("express");

function createExercisesRoutes({ exercisesController, authMiddleware, roleMiddleware, roles }) {
  const router = Router();

  router.post(
    "/exercises",
    authMiddleware,
    roleMiddleware(roles.INSTRUTOR, roles.ADMIN_GERAL),
    exercisesController.createExercise
  );

  router.get(
    "/workouts/:workoutId/exercises",
    authMiddleware,
    exercisesController.listWorkoutExercises
  );

  router.patch(
    "/workouts/:workoutId/exercises/:workoutExerciseId/completed",
    authMiddleware,
    roleMiddleware(roles.ALUNO, roles.INSTRUTOR, roles.ADMIN_GERAL),
    exercisesController.setWorkoutExerciseCompleted
  );

  router.patch(
    "/workouts/:workoutId/exercises/:workoutExerciseId/substitute",
    authMiddleware,
    roleMiddleware(roles.INSTRUTOR, roles.ADMIN_GERAL),
    exercisesController.replaceWorkoutExercise
  );

  router.patch(
    "/workouts/:workoutId/exercises/:workoutExerciseId/load",
    authMiddleware,
    roleMiddleware(roles.INSTRUTOR, roles.ADMIN_GERAL),
    exercisesController.updateWorkoutExerciseLoad
  );

  router.patch(
    "/workouts/:workoutId/exercises/:workoutExerciseId",
    authMiddleware,
    roleMiddleware(roles.INSTRUTOR, roles.ADMIN_GERAL),
    exercisesController.updateWorkoutExercise
  );

  router.delete(
    "/workouts/:workoutId/exercises/:workoutExerciseId",
    authMiddleware,
    roleMiddleware(roles.INSTRUTOR, roles.ADMIN_GERAL),
    exercisesController.removeWorkoutExercise
  );

  return router;
}

module.exports = {
  createExercisesRoutes,
};
