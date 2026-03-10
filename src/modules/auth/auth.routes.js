const { Router } = require("express");

function createAuthRoutes({ userController, authMiddleware }) {
  const router = Router();

  router.post("/auth/register", userController.register);
  router.post("/auth/login", userController.login);
  router.post("/auth/forgot-password/request", userController.requestPasswordReset);
  router.post("/auth/forgot-password/reset", userController.resetPassword);
  router.post("/auth/forgot-password", userController.forgotPassword);
  router.get("/auth/profile", authMiddleware, userController.profile);
  router.patch("/auth/profile/avatar", authMiddleware, userController.updateProfileAvatar);
  router.post("/auth/heartbeat", authMiddleware, userController.heartbeat);

  return router;
}

module.exports = {
  createAuthRoutes,
};
