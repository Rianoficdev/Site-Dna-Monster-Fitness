const { asyncHandler } = require("../../utils/asyncHandler");

function createWorkoutsController({ workoutsService }) {
  const createInstructorWorkout = asyncHandler(async (req, res) => {
    const workout = await workoutsService.createInstructorWorkout({
      ...req.body,
      authUser: req.user,
    });

    return res.status(201).json({
      message: "Treino criado com sucesso.",
      workout,
    });
  });

  const listInstructorWorkouts = asyncHandler(async (req, res) => {
    const workouts = await workoutsService.listInstructorWorkouts({
      authUser: req.user,
      includeInactive: req.query.includeInactive,
    });
    return res.status(200).json({ workouts });
  });

  const listStudentWorkouts = asyncHandler(async (req, res) => {
    const workouts = await workoutsService.listStudentWorkouts({
      authUser: req.user,
    });
    return res.status(200).json({ workouts });
  });

  const updateInstructorWorkout = asyncHandler(async (req, res) => {
    const workout = await workoutsService.updateInstructorWorkout({
      ...req.body,
      authUser: req.user,
      workoutId: req.params.workoutId,
    });

    return res.status(200).json({
      message: "Treino atualizado com sucesso.",
      workout,
    });
  });

  const deactivateInstructorWorkout = asyncHandler(async (req, res) => {
    const workout = await workoutsService.deactivateWorkout({
      authUser: req.user,
      workoutId: req.params.workoutId,
    });

    return res.status(200).json({
      message: "Treino desativado com sucesso.",
      workout,
    });
  });

  const deleteInstructorWorkout = asyncHandler(async (req, res) => {
    const workout = await workoutsService.deleteWorkout({
      authUser: req.user,
      workoutId: req.params.workoutId,
    });

    return res.status(200).json({
      message: "Treino excluido com sucesso.",
      workout,
    });
  });

  const createWorkout = asyncHandler(async (req, res) => {
    const workout = await workoutsService.createWorkout({
      ...req.body,
      createdByRole: req.user.role,
      createdById: req.user.id,
    });

    return res.status(201).json({
      message: "Treino criado com sucesso.",
      workout,
    });
  });

  const updateWorkout = asyncHandler(async (req, res) => {
    const workout = await workoutsService.updateWorkout({
      ...req.body,
      authUser: req.user,
      workoutId: req.params.workoutId,
    });

    return res.status(200).json({
      message: "Treino atualizado com sucesso.",
      workout,
    });
  });

  const listMyWorkouts = asyncHandler(async (req, res) => {
    const workouts = await workoutsService.listMyWorkouts(req.user);
    return res.status(200).json({ workouts });
  });

  const createWorkoutTemplate = asyncHandler(async (req, res) => {
    const template = await workoutsService.createWorkoutTemplate({
      ...req.body,
      authUser: req.user,
    });

    return res.status(201).json({
      message: "Modelo de treino criado com sucesso.",
      template,
    });
  });

  const listWorkoutTemplates = asyncHandler(async (req, res) => {
    const templates = await workoutsService.listWorkoutTemplates({
      authUser: req.user,
      includeInactive: req.query.includeInactive,
    });

    return res.status(200).json({ templates });
  });

  const updateWorkoutTemplate = asyncHandler(async (req, res) => {
    const template = await workoutsService.updateWorkoutTemplate({
      ...req.body,
      authUser: req.user,
      templateId: req.params.templateId,
    });

    return res.status(200).json({
      message: "Modelo de treino atualizado com sucesso.",
      template,
    });
  });

  const deleteWorkoutTemplate = asyncHandler(async (req, res) => {
    const template = await workoutsService.deleteWorkoutTemplate({
      authUser: req.user,
      templateId: req.params.templateId,
    });

    return res.status(200).json({
      message: "Modelo de treino excluido com sucesso.",
      template,
    });
  });

  const addTemplateExercise = asyncHandler(async (req, res) => {
    const templateExercise = await workoutsService.addTemplateExercise({
      ...req.body,
      templateId: req.params.templateId,
      authUser: req.user,
    });

    return res.status(201).json({
      message: "Exercício vinculado ao modelo com sucesso.",
      templateExercise,
    });
  });

  const listTemplateExercises = asyncHandler(async (req, res) => {
    const templateExercises = await workoutsService.listTemplateExercises({
      authUser: req.user,
      templateId: req.params.templateId,
    });

    return res.status(200).json({ templateExercises });
  });

  const createWorkoutFromTemplate = asyncHandler(async (req, res) => {
    const result = await workoutsService.createWorkoutFromTemplate({
      ...req.body,
      authUser: req.user,
    });

    return res.status(201).json({
      message: "Treino criado a partir do modelo com sucesso.",
      ...result,
    });
  });

  return {
    createInstructorWorkout,
    listInstructorWorkouts,
    listStudentWorkouts,
    updateInstructorWorkout,
    deactivateInstructorWorkout,
    deleteInstructorWorkout,
    createWorkout,
    updateWorkout,
    listMyWorkouts,
    createWorkoutTemplate,
    updateWorkoutTemplate,
    deleteWorkoutTemplate,
    listWorkoutTemplates,
    addTemplateExercise,
    listTemplateExercises,
    createWorkoutFromTemplate,
  };
}

module.exports = {
  createWorkoutsController,
};
