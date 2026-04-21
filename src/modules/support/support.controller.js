const { asyncHandler } = require("../../utils/asyncHandler");
const { sendSupportNotification } = require("../../mailer");
const logger = require("../../shared/logger");

function createSupportController({ supportService }) {
  async function notifySupportTicket(ticket) {
    if (!ticket) return;

    try {
      await sendSupportNotification({
        studentName: ticket && ticket.requesterName,
        subject: ticket && ticket.subject,
        message: ticket && ticket.description,
        createdAt: ticket && ticket.createdAt,
      });
    } catch (mailError) {
      logger.error("Support notification email failed", {
        errorMessage: mailError && mailError.message ? mailError.message : String(mailError),
      });
    }
  }

  const createPublicTicket = asyncHandler(async (req, res) => {
    const result = await supportService.openPasswordResetSupportRequest(req.body || {});
    return res.status(result && result.alreadyPending ? 429 : 200).json(result);
  });

  const getPublicPasswordResetStatus = asyncHandler(async (req, res) => {
    const status = await supportService.getPublicPasswordResetRequestStatus({
      email: req.query && req.query.email,
      ticketId: req.query && req.query.ticketId,
    });
    return res.status(200).json(status);
  });

  const requestAuthenticatedPasswordResetTicket = asyncHandler(async (req, res) => {
    const result = await supportService.requestAuthenticatedPasswordResetTicket({
      authUser: req.user,
      subject: req.body && req.body.subject,
      description: req.body && req.body.description,
    });

    if (result && result.success) {
      await notifySupportTicket(result.ticket);
    }

    return res.status(result && result.alreadyPending ? 429 : 201).json(result);
  });

  const checkAuthenticatedPasswordResetStatus = asyncHandler(async (req, res) => {
    const result = await supportService.checkAuthenticatedPasswordResetStatus({
      authUser: req.user,
    });

    return res.status(200).json(result);
  });

  const createMyTicket = asyncHandler(async (req, res) => {
    const isPasswordResetRequest =
      String((req.body && req.body.type) || "")
        .trim()
        .toUpperCase() === "PASSWORD_RESET";

    const result = await supportService.createAuthenticatedSupportTicket({
      authUser: req.user,
      ...req.body,
    });

    if (isPasswordResetRequest) {
      if (result && result.success) {
        await notifySupportTicket(result.ticket);
      }

      return res.status(result && result.alreadyPending ? 429 : 201).json(result);
    }

    await notifySupportTicket(result);

    return res.status(201).json({
      message: "Solicitacao enviada para o suporte com sucesso.",
      ticket: result,
    });
  });

  const listMyTickets = asyncHandler(async (req, res) => {
    const tickets = await supportService.listMyTickets({
      authUser: req.user,
      limit: req.query && req.query.limit,
    });

    return res.status(200).json({ tickets });
  });

  const listAdminTickets = asyncHandler(async (req, res) => {
    const tickets = await supportService.listAdminTickets({
      status: req.query && req.query.status,
      type: req.query && req.query.type,
      archived: req.query && req.query.archived,
      limit: req.query && req.query.limit,
    });

    return res.status(200).json({ tickets });
  });

  const listAdminPasswordResetTickets = asyncHandler(async (req, res) => {
    const tickets = await supportService.listAdminPasswordResetTickets({
      status: req.query && req.query.status,
      archived: req.query && req.query.archived,
      limit: req.query && req.query.limit,
    });

    return res.status(200).json({ tickets });
  });

  const approvePasswordResetTicket = asyncHandler(async (req, res) => {
    const result = await supportService.approvePasswordResetTicket({
      ticketId: req.params.ticketId,
      actorId: req.user.id,
      adminResponse: req.body && req.body.adminResponse,
    });

    return res.status(200).json({
      message: "Reset de senha liberado com sucesso.",
      ...result,
    });
  });

  const approveAdminPasswordResetTicket = asyncHandler(async (req, res) => {
    const result = await supportService.approvePasswordResetTicket({
      ticketId: req.params.id,
      actorId: req.user.id,
      adminResponse: req.body && req.body.adminResponse,
    });

    return res.status(200).json({
      message: "Reset de senha liberado com sucesso.",
      ...result,
    });
  });

  const updateTicketStatus = asyncHandler(async (req, res) => {
    const ticket = await supportService.updateTicketStatus({
      ticketId: req.params.ticketId,
      actorId: req.user.id,
      status: req.body && req.body.status,
      adminResponse: req.body && req.body.adminResponse,
    });

    return res.status(200).json({
      message: "Status da solicitacao atualizado com sucesso.",
      ticket,
    });
  });

  const archiveTicket = asyncHandler(async (req, res) => {
    const ticket = await supportService.archiveTicket({
      ticketId: req.params.ticketId,
      actorId: req.user.id,
    });

    return res.status(200).json({
      message: "Solicitacao arquivada com sucesso.",
      ticket,
    });
  });

  return {
    createPublicTicket,
    getPublicPasswordResetStatus,
    requestAuthenticatedPasswordResetTicket,
    checkAuthenticatedPasswordResetStatus,
    createMyTicket,
    listMyTickets,
    listAdminTickets,
    listAdminPasswordResetTickets,
    approvePasswordResetTicket,
    approveAdminPasswordResetTicket,
    updateTicketStatus,
    archiveTicket,
  };
}

module.exports = {
  createSupportController,
};
