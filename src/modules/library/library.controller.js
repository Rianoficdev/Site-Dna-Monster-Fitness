const { asyncHandler } = require("../../utils/asyncHandler");

function createLibraryController({ libraryService }) {
  const listLibraryExercises = asyncHandler(async (req, res) => {
    const exercises = await libraryService.listLibraryExercises({
      authUser: req.user,
      includeInactive: req.query.includeInactive,
    });
    return res.status(200).json({ exercises });
  });

  const createLibraryExercise = asyncHandler(async (req, res) => {
    const exercise = await libraryService.createLibraryExercise({
      ...req.body,
      authUser: req.user,
    });

    return res.status(201).json({
      message: "Exercicio da biblioteca criado com sucesso.",
      exercise,
    });
  });

  const updateLibraryExercise = asyncHandler(async (req, res) => {
    const exercise = await libraryService.updateLibraryExercise({
      ...req.body,
      authUser: req.user,
      exerciseId: req.params.exerciseId,
    });

    return res.status(200).json({
      message: "Exercicio da biblioteca atualizado com sucesso.",
      exercise,
    });
  });

  const setLibraryExerciseStatus = asyncHandler(async (req, res) => {
    const exercise = await libraryService.setLibraryExerciseStatus({
      ...req.body,
      authUser: req.user,
      exerciseId: req.params.exerciseId,
    });

    return res.status(200).json({
      message: exercise && exercise.isActive === false
        ? "Exercicio da biblioteca desativado com sucesso."
        : "Status do exercicio atualizado com sucesso.",
      exercise,
    });
  });

  const deleteLibraryExercise = asyncHandler(async (req, res) => {
    const exercise = await libraryService.deleteLibraryExercise({
      authUser: req.user,
      exerciseId: req.params.exerciseId,
    });

    return res.status(200).json({
      message: "Exercicio da biblioteca excluido com sucesso.",
      exercise,
    });
  });

  return {
    listLibraryExercises,
    createLibraryExercise,
    updateLibraryExercise,
    setLibraryExerciseStatus,
    deleteLibraryExercise,
  };
}

module.exports = {
  createLibraryController,
};
