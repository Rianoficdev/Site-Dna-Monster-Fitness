const { asyncHandler } = require("../../utils/asyncHandler");
const { sendSupportNotification } = require("../../mailer");

function createSupportController({ supportService }) {
  const createPublicTicket = asyncHandler(async (req, res) => {
    const result = await supportService.openPasswordResetSupportRequest(req.body || {});
    return res.status(200).json(result);
  });

  const getPublicPasswordResetStatus = asyncHandler(async (req, res) => {
    const status = await supportService.getPublicPasswordResetRequestStatus({
      email: req.query && req.query.email,
      ticketId: req.query && req.query.ticketId,
    });
    return res.status(200).json(status);
  });

  const createMyTicket = asyncHandler(async (req, res) => {
    const ticket = await supportService.createAuthenticatedSupportTicket({
      authUser: req.user,
      ...req.body,
    });

    try {
      await sendSupportNotification({
        studentName: ticket && ticket.requesterName,
        subject: ticket && ticket.subject,
        message: ticket && ticket.description,
        createdAt: ticket && ticket.createdAt,
      });
    } catch (mailError) {
      console.error("Falha ao enviar e-mail de suporte:", mailError);
    }

    return res.status(201).json({
      message: "Solicitação enviada para o suporte com sucesso.",
      ticket,
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

  const updateTicketStatus = asyncHandler(async (req, res) => {
    const ticket = await supportService.updateTicketStatus({
      ticketId: req.params.ticketId,
      actorId: req.user.id,
      status: req.body && req.body.status,
      adminResponse: req.body && req.body.adminResponse,
    });

    return res.status(200).json({
      message: "Status da solicitação atualizado com sucesso.",
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
    createMyTicket,
    listMyTickets,
    listAdminTickets,
    approvePasswordResetTicket,
    updateTicketStatus,
    archiveTicket,
  };
}

module.exports = {
  createSupportController,
};
