const { Router } = require("express");

function createSupportRoutes({ supportController, authMiddleware, roleMiddleware, roles }) {
  const router = Router();

  router.post("/support/tickets/public", supportController.createPublicTicket);
  router.get("/support/tickets/public-status", supportController.getPublicPasswordResetStatus);
  router.post(
    "/password-reset/request",
    authMiddleware,
    supportController.requestAuthenticatedPasswordResetTicket
  );
  router.get(
    "/password-reset/status",
    authMiddleware,
    supportController.checkAuthenticatedPasswordResetStatus
  );

  router.post("/support/tickets", authMiddleware, supportController.createMyTicket);
  router.get("/support/tickets/my", authMiddleware, supportController.listMyTickets);

  router.get(
    "/admin/support-tickets",
    authMiddleware,
    roleMiddleware(roles.ADMIN_GERAL),
    supportController.listAdminTickets
  );
  router.get(
    "/admin/password-reset-tickets",
    authMiddleware,
    roleMiddleware(roles.ADMIN_GERAL),
    supportController.listAdminPasswordResetTickets
  );

  router.post(
    "/admin/support-tickets/:ticketId/approve-password-reset",
    authMiddleware,
    roleMiddleware(roles.ADMIN_GERAL),
    supportController.approvePasswordResetTicket
  );
  router.patch(
    "/admin/password-reset-tickets/:id/approve",
    authMiddleware,
    roleMiddleware(roles.ADMIN_GERAL),
    supportController.approveAdminPasswordResetTicket
  );

  router.patch(
    "/admin/support-tickets/:ticketId/status",
    authMiddleware,
    roleMiddleware(roles.ADMIN_GERAL),
    supportController.updateTicketStatus
  );

  router.patch(
    "/admin/support-tickets/:ticketId/archive",
    authMiddleware,
    roleMiddleware(roles.ADMIN_GERAL),
    supportController.archiveTicket
  );

  return router;
}

module.exports = {
  createSupportRoutes,
};
