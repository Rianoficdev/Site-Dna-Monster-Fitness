const { Resend } = require("resend");

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatBrazilianDateTime(value) {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Data nao informada";
  }

  const datePart = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parsed);

  const timePart = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);

  return `${datePart} às ${timePart}`;
}

async function sendSupportNotification({
  studentName,
  subject,
  message,
  createdAt,
} = {}) {
  const resendApiKey = String(process.env.RESEND_API_KEY || "").trim();
  const adminEmail = String(process.env.ADMIN_EMAIL || "").trim();
  const fromEmail = String(
    process.env.RESEND_FROM_EMAIL || process.env.MAIL_FROM_EMAIL || adminEmail
  ).trim();

  if (!resendApiKey || !adminEmail) {
    console.warn(
      "[mailer] RESEND_API_KEY ou ADMIN_EMAIL ausente. Notificacao de suporte nao sera enviada."
    );
    return false;
  }

  if (!fromEmail) {
    console.warn(
      "[mailer] Endereco de remetente ausente. Notificacao de suporte nao sera enviada."
    );
    return false;
  }

  const resend = new Resend(resendApiKey);
  const safeStudentName = escapeHtml(studentName || "Aluno");
  const safeSubject = escapeHtml(subject || "Solicitacao de suporte");
  const safeMessage = escapeHtml(message || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n/g, "<br />");
  const formattedDateTime = escapeHtml(formatBrazilianDateTime(createdAt));

  await resend.emails.send({
    from: fromEmail,
    to: adminEmail,
    subject: "🔔 Nova solicitação de suporte - DNA Monster Fitness",
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
        <h2 style="margin: 0 0 16px;">Nova solicitacao de suporte</h2>
        <p style="margin: 0 0 12px;"><strong>Nome do aluno:</strong> ${safeStudentName}</p>
        <p style="margin: 0 0 12px;"><strong>Assunto da solicitacao:</strong> ${safeSubject}</p>
        <p style="margin: 0 0 12px;"><strong>Mensagem do aluno:</strong><br />${safeMessage || "-"}</p>
        <p style="margin: 0 0 12px;"><strong>Data e horario da solicitacao:</strong> ${formattedDateTime}</p>
        <p style="margin: 16px 0 0;">
          Acesse o painel administrativo da DNA Monster Fitness para responder a solicitacao.
        </p>
      </div>
    `,
  });

  return true;
}

module.exports = {
  sendSupportNotification,
};
