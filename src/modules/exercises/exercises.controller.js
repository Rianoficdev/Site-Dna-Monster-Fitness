const { asyncHandler } = require("../../utils/asyncHandler");

function createExercisesController({ exercisesService }) {
  const createExercise = asyncHandler(async (req, res) => {
    const exercise = await exercisesService.createExercise({
      ...req.body,
      authUser: req.user,
    });

    return res.status(201).json({
      message: "Exercicio criado com sucesso.",
      exercise,
    });
  });

  const listWorkoutExercises = asyncHandler(async (req, res) => {
    const exercises = await exercisesService.listWorkoutExercises(req.user, req.params.workoutId);
    const progress = exercisesService.calculateProgress(exercises);
    return res.status(200).json({ exercises, progress });
  });

  const setWorkoutExerciseCompleted = asyncHandler(async (req, res) => {
    const result = await exercisesService.setWorkoutExerciseCompleted({
      authUser: req.user,
      workoutId: req.params.workoutId,
      workoutExerciseId: req.params.workoutExerciseId,
      completed: req.body.completed,
    });

    return res.status(200).json({
      message: "Status de conclusão atualizado com sucesso.",
      ...result,
    });
  });

  const replaceWorkoutExercise = asyncHandler(async (req, res) => {
    const exercise = await exercisesService.replaceWorkoutExercise({
      authUser: req.user,
      workoutId: req.params.workoutId,
      workoutExerciseId: req.params.workoutExerciseId,
      exerciseId: req.body.exerciseId,
    });

    return res.status(200).json({
      message: "Exercício substituído com sucesso.",
      exercise,
    });
  });

  const updateWorkoutExerciseLoad = asyncHandler(async (req, res) => {
    const exercise = await exercisesService.updateWorkoutExerciseLoad({
      authUser: req.user,
      workoutId: req.params.workoutId,
      workoutExerciseId: req.params.workoutExerciseId,
      load: req.body.load,
      loadKg: req.body.loadKg,
    });

    return res.status(200).json({
      message: "Carga atualizada com sucesso.",
      exercise,
    });
  });

  const updateWorkoutExercise = asyncHandler(async (req, res) => {
    const exercise = await exercisesService.updateWorkoutExercise({
      ...req.body,
      authUser: req.user,
      workoutId: req.params.workoutId,
      workoutExerciseId: req.params.workoutExerciseId,
    });

    return res.status(200).json({
      message: "Exercicio do treino atualizado com sucesso.",
      exercise,
    });
  });

  const removeWorkoutExercise = asyncHandler(async (req, res) => {
    const exercise = await exercisesService.removeWorkoutExercise({
      authUser: req.user,
      workoutId: req.params.workoutId,
      workoutExerciseId: req.params.workoutExerciseId,
    });

    return res.status(200).json({
      message: "Exercicio removido do treino com sucesso.",
      exercise,
    });
  });

  return {
    createExercise,
    listWorkoutExercises,
    setWorkoutExerciseCompleted,
    replaceWorkoutExercise,
    updateWorkoutExerciseLoad,
    updateWorkoutExercise,
    removeWorkoutExercise,
  };
}

module.exports = {
  createExercisesController,
};
