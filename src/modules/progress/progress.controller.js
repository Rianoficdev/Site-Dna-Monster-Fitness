const { asyncHandler } = require("../../utils/asyncHandler");

function createProgressController({ progressService }) {
  const registerProgress = asyncHandler(async (req, res) => {
    const record = await progressService.registerProgress({
      ...req.body,
      userId: req.user.id,
    });

    return res.status(201).json({
      message: "Progresso registrado com sucesso.",
      record,
    });
  });

  const listMyProgress = asyncHandler(async (req, res) => {
    const records = await progressService.listMyProgress(req.user.id);
    return res.status(200).json({ records });
  });

  const getMyWeekSummary = asyncHandler(async (req, res) => {
    const summary = await progressService.getWeeklySummary({
      userId: req.user.id,
      referenceDateKey: req.query.referenceDateKey || req.query.dateKey,
    });

    return res.status(200).json({ summary });
  });

  const setMyWeekDay = asyncHandler(async (req, res) => {
    const summary = await progressService.setWeeklyDayStatus({
      userId: req.user.id,
      dateKey: req.body.dateKey,
      done: req.body.done,
      referenceDateKey: req.body.referenceDateKey,
    });

    return res.status(200).json({
      message: "Resumo semanal atualizado com sucesso.",
      summary,
    });
  });

  const listMyWorkoutHistory = asyncHandler(async (req, res) => {
    const history = await progressService.listWorkoutHistory({
      userId: req.user.id,
      limit: req.query.limit,
      completedDateFrom: req.query.completedDateFrom || req.query.dateFrom,
      completedDateTo: req.query.completedDateTo || req.query.dateTo,
    });

    return res.status(200).json({ history });
  });

  const completeMyWorkout = asyncHandler(async (req, res) => {
    const result = await progressService.completeWorkout({
      authUser: req.user,
      workoutId: req.params.workoutId,
      completedAt: req.body.completedAt,
      completedDateKey: req.body.completedDateKey,
    });

    return res.status(200).json({
      message: "Treino concluído com sucesso.",
      ...result,
    });
  });

  const getInstructorStudentsReport = asyncHandler(async (req, res) => {
    const report = await progressService.getInstructorStudentsReport({
      authUser: req.user,
      referenceDateKey: req.query.referenceDateKey || req.query.dateKey,
    });

    return res.status(200).json({ report });
  });

  return {
    registerProgress,
    listMyProgress,
    getMyWeekSummary,
    setMyWeekDay,
    listMyWorkoutHistory,
    completeMyWorkout,
    getInstructorStudentsReport,
  };
}

module.exports = {
  createProgressController,
};
