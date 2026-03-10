const logger = require("./logger");

const SAMPLE_WORKOUTS = [
  {
    name: "Treino A",
    description: "Treino de exemplo A para futura implantacao de exercicios.",
    weekDays: ["Seg", "Qua", "Sex"],
  },
  {
    name: "Treino B",
    description: "Treino de exemplo B para futura implantacao de exercicios.",
    weekDays: ["Ter", "Qui", "Sab"],
  },
  {
    name: "Treino C",
    description: "Treino de exemplo C para futura implantacao de exercicios.",
    weekDays: ["Seg", "Ter", "Qui"],
  },
  {
    name: "Treino D",
    description: "Treino de exemplo D para futura implantacao de exercicios.",
    weekDays: ["Qua", "Sex"],
  },
  {
    name: "Treino E",
    description: "Treino de exemplo E para futura implantacao de exercicios.",
    weekDays: ["Seg", "Qua"],
  },
  {
    name: "Treino F",
    description: "Treino de exemplo F para futura implantacao de exercicios.",
    weekDays: ["Ter", "Qui"],
  },
  {
    name: "Treino G",
    description: "Treino de exemplo G para futura implantacao de exercicios.",
    weekDays: ["Seg", "Ter", "Qua", "Qui", "Sex"],
  },
];

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeDescription(value) {
  return String(value || "").trim().toLowerCase();
}

const SAMPLE_WORKOUT_SIGNATURES = new Map(
  SAMPLE_WORKOUTS.map((sample) => [normalizeName(sample.name), normalizeDescription(sample.description)])
);

function isSampleWorkoutSignature(workout) {
  const normalizedName = normalizeName(workout && (workout.name || workout.title));
  if (!normalizedName) return false;

  const signatureDescription = SAMPLE_WORKOUT_SIGNATURES.get(normalizedName);
  if (!signatureDescription) return false;

  const normalizedDescription = normalizeDescription(
    workout && (workout.description || workout.observations || workout.observacoes)
  );
  return normalizedDescription === signatureDescription;
}

async function purgeSampleWorkouts({ workoutsRepository, exercisesRepository }) {
  if (!workoutsRepository || typeof workoutsRepository.listAll !== "function") return;
  if (typeof workoutsRepository.deleteWorkout !== "function") return;

  try {
    const allWorkouts = await workoutsRepository.listAll();
    const sampleWorkouts = (Array.isArray(allWorkouts) ? allWorkouts : []).filter(isSampleWorkoutSignature);
    if (!sampleWorkouts.length) return;

    let removedExercises = 0;
    for (const workout of sampleWorkouts) {
      const workoutId = Number(workout && workout.id) || 0;
      if (!workoutId) continue;

      if (
        exercisesRepository &&
        typeof exercisesRepository.listByWorkoutId === "function" &&
        typeof exercisesRepository.deleteExercise === "function"
      ) {
        const linkedExercises = await exercisesRepository.listByWorkoutId(workoutId);
        for (const exercise of (Array.isArray(linkedExercises) ? linkedExercises : [])) {
          const exerciseId = Number(exercise && exercise.id) || 0;
          if (!exerciseId) continue;
          const removedExercise = await exercisesRepository.deleteExercise({
            workoutId,
            workoutExerciseId: exerciseId,
          });
          if (removedExercise) removedExercises += 1;
        }
      }

      await workoutsRepository.deleteWorkout(workoutId);
    }

    logger.info("Sample workouts removed", {
      removedWorkouts: sampleWorkouts.length,
      removedExercises,
    });
  } catch (error) {
    logger.error("Sample workouts purge failed", {
      message: error && error.message ? error.message : "Unknown error",
    });
  }
}

async function seedSampleWorkouts({ userRepository, workoutsRepository }) {
  if (!userRepository || typeof userRepository.listUsers !== "function") return;
  if (!workoutsRepository || typeof workoutsRepository.createWorkout !== "function") return;
  if (typeof workoutsRepository.listAll !== "function") return;

  try {
    const users = await userRepository.listUsers();
    const list = Array.isArray(users) ? users : [];

    const students = list.filter(
      (user) => String(user && user.role || "").toUpperCase() === "ALUNO" && user.isEnabled !== false
    );
    const managers = list.filter((user) => {
      const role = String(user && user.role || "").toUpperCase();
      return (role === "INSTRUTOR" || role === "ADMIN_GERAL") && user.isEnabled !== false;
    });

    if (!students.length || !managers.length) {
      logger.info("Sample workouts skipped: no active student/manager found");
      return;
    }

    const targetStudent = students[0];
    const targetManager = managers[0];

    const existingWorkouts = await workoutsRepository.listAll();
    const existingNames = new Set(
      (Array.isArray(existingWorkouts) ? existingWorkouts : []).map((workout) =>
        normalizeName(workout && (workout.name || workout.title))
      )
    );

    let createdCount = 0;
    for (const sample of SAMPLE_WORKOUTS) {
      const normalizedSampleName = normalizeName(sample.name);
      if (!normalizedSampleName || existingNames.has(normalizedSampleName)) continue;

      await workoutsRepository.createWorkout({
        name: sample.name,
        description: sample.description,
        studentId: Number(targetStudent.id),
        createdBy: Number(targetManager.id),
        originTemplateId: null,
        isActive: true,
        weekDays: Array.isArray(sample.weekDays) ? sample.weekDays : [],
        startDate: null,
        endDate: null,
      });

      existingNames.add(normalizedSampleName);
      createdCount += 1;
    }

    if (createdCount > 0) {
      logger.info("Sample workouts created", {
        createdCount,
        studentId: Number(targetStudent.id),
        managerId: Number(targetManager.id),
      });
    } else {
      logger.info("Sample workouts already present");
    }
  } catch (error) {
    logger.error("Sample workouts seed failed", {
      message: error && error.message ? error.message : "Unknown error",
    });
  }
}

module.exports = {
  seedSampleWorkouts,
  purgeSampleWorkouts,
};
