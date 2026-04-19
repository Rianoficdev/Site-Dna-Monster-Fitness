let bcrypt = null;
try {
  bcrypt = require("bcrypt");
} catch (_error) {
  bcrypt = require("bcryptjs");
}
const { createHash } = require("crypto");
const { signAccessToken } = require("../config/jwt");
const { env } = require("../config/env");
const { VALID_ROLES } = require("./roles");
const { prisma } = require("../config/prisma");
const { clearCachedAuthUser } = require("../middlewares/auth.middleware");
const { createInMemoryStore, persistInMemoryStore } = require("./inMemoryStore");
const { createUserRepository } = require("../modules/users/user.repository");
const { createWorkoutsRepository } = require("../modules/workouts/workouts.repository");
const { createExercisesRepository } = require("../modules/exercises/exercises.repository");
const { createProgressRepository } = require("../modules/progress/progress.repository");
const { createLibraryRepository } = require("../modules/library/library.repository");
const { createLibraryDatabaseRepository } = require("../modules/library/library.database.repository");
const { createSupportRepository } = require("../modules/support/support.repository");
const { createUserService } = require("../modules/users/user.service");
const { createWorkoutsService } = require("../modules/workouts/workouts.service");
const { createExercisesService } = require("../modules/exercises/exercises.service");
const { createProgressService } = require("../modules/progress/progress.service");
const { createLibraryService } = require("../modules/library/library.service");
const { createAdminService } = require("../modules/admin/admin.service");
const { createSupportService } = require("../modules/support/support.service");
const { createUserController } = require("../modules/users/user.controller");
const { createWorkoutsController } = require("../modules/workouts/workouts.controller");
const { createExercisesController } = require("../modules/exercises/exercises.controller");
const { createProgressController } = require("../modules/progress/progress.controller");
const { createLibraryController } = require("../modules/library/library.controller");
const { createAdminController } = require("../modules/admin/admin.controller");
const { createSupportController } = require("../modules/support/support.controller");
const { seedSampleWorkouts, purgeSampleWorkouts } = require("./sampleWorkoutsSeed");
const { wrapTimedMethods } = require("./timing");

function createContainer() {
  const store = createInMemoryStore();
  const withTiming = (namespace, target) =>
    wrapTimedMethods(target, {
      namespace,
      enabled: env.operationTimingEnabled,
      slowThresholdMs: env.operationTimingSlowMs,
    });

  const repositories = {
    userRepository: withTiming("repository.user", createUserRepository({ prisma })),
    workoutsRepository: withTiming("repository.workouts", createWorkoutsRepository({ prisma })),
    exercisesRepository: withTiming("repository.exercises", createExercisesRepository({ prisma })),
    progressRepository: withTiming("repository.progress", createProgressRepository({ prisma })),
    libraryRepository: withTiming("repository.library", createLibraryRepository(store)),
    libraryDatabaseRepository: withTiming(
      "repository.libraryDatabase",
      createLibraryDatabaseRepository({ prisma })
    ),
    supportRepository: withTiming("repository.support", createSupportRepository({ prisma })),
  };

  if (
    repositories.workoutsRepository &&
    typeof repositories.workoutsRepository.initializeCompatibilityTables === "function"
  ) {
    void repositories.workoutsRepository.initializeCompatibilityTables().catch(() => {});
  }
  if (
    repositories.exercisesRepository &&
    typeof repositories.exercisesRepository.initializeObservationColumn === "function"
  ) {
    void repositories.exercisesRepository.initializeObservationColumn().catch(() => {});
  }

  const services = {
    userService: withTiming("service.user", createUserService({
      userRepository: repositories.userRepository,
      bcrypt,
      signAccessToken,
      validRoles: VALID_ROLES,
      createHash,
      jwtSessionExpiresIn: env.jwtSessionExpiresIn,
      jwtRememberExpiresIn: env.jwtRememberExpiresIn,
      nodeEnv: env.nodeEnv,
    })),
    workoutsService: withTiming("service.workouts", createWorkoutsService({
      workoutsRepository: repositories.workoutsRepository,
      exercisesRepository: repositories.exercisesRepository,
      libraryRepository: repositories.libraryRepository,
      userRepository: repositories.userRepository,
      validRoles: VALID_ROLES,
    })),
  };

  services.exercisesService = withTiming("service.exercises", createExercisesService({
    exercisesRepository: repositories.exercisesRepository,
    workoutsService: services.workoutsService,
    libraryRepository: repositories.libraryRepository,
  }));

  services.progressService = withTiming("service.progress", createProgressService({
    progressRepository: repositories.progressRepository,
    workoutsService: services.workoutsService,
    exercisesRepository: repositories.exercisesRepository,
    libraryRepository: repositories.libraryRepository,
    userRepository: repositories.userRepository,
  }));

  services.libraryService = withTiming("service.library", createLibraryService({
    libraryRepository: repositories.libraryRepository,
    libraryDatabaseRepository: repositories.libraryDatabaseRepository,
    workoutsRepository: repositories.workoutsRepository,
    exercisesRepository: repositories.exercisesRepository,
  }));

  services.supportService = withTiming("service.support", createSupportService({
    supportRepository: repositories.supportRepository,
    userRepository: repositories.userRepository,
    createHash,
    passwordResetTokenMinutes: env.passwordResetTokenMinutes,
  }));

  services.adminService = withTiming("service.admin", createAdminService({
    userService: services.userService,
    userRepository: repositories.userRepository,
    workoutsService: services.workoutsService,
    libraryRepository: repositories.libraryRepository,
    supportService: services.supportService,
    clearCachedAuthUser,
    store,
    persistStore: persistInMemoryStore,
    bcrypt,
    validRoles: VALID_ROLES,
    onlineWindowMinutes: env.onlinePresenceWindowMinutes,
  }));

  const controllers = {
    userController: createUserController({
      userService: services.userService,
      workoutsService: services.workoutsService,
      supportService: services.supportService,
    }),
    workoutsController: createWorkoutsController({ workoutsService: services.workoutsService }),
    exercisesController: createExercisesController({ exercisesService: services.exercisesService }),
    progressController: createProgressController({ progressService: services.progressService }),
    libraryController: createLibraryController({ libraryService: services.libraryService }),
    adminController: createAdminController({ adminService: services.adminService }),
    supportController: createSupportController({ supportService: services.supportService }),
  };

  if (env.seedSampleWorkouts) {
    void seedSampleWorkouts({
      userRepository: repositories.userRepository,
      workoutsRepository: repositories.workoutsRepository,
    });
  } else {
    void purgeSampleWorkouts({
      workoutsRepository: repositories.workoutsRepository,
      exercisesRepository: repositories.exercisesRepository,
    });
  }

  return {
    store,
    repositories,
    services,
    controllers,
  };
}

module.exports = {
  createContainer,
};
