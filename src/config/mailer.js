const nodemailer = require("nodemailer");
const { env } = require("./env");
const logger = require("../shared/logger");

function getTransportConfig() {
  if (!env.mailUser || !env.mailPass) return null;

  if (env.mailService) {
    return {
      service: env.mailService,
      auth: {
        user: env.mailUser,
        pass: env.mailPass,
      },
    };
  }

  if (!env.mailHost || !env.mailPort) return null;

  return {
    host: env.mailHost,
    port: Number(env.mailPort),
    secure: Boolean(env.mailSecure),
    auth: {
      user: env.mailUser,
      pass: env.mailPass,
    },
  };
}

function getFromAddress() {
  const fromEmail = env.mailFromEmail || env.mailUser;
  if (!fromEmail) return "";
  return `"${env.mailFromName || "DNA Monster Fitness"}" <${fromEmail}>`;
}

const transportConfig = getTransportConfig();
const isMailerEnabled = Boolean(transportConfig);
const transporter = isMailerEnabled ? nodemailer.createTransport(transportConfig) : null;

async function sendPasswordResetEmail({ to, name, code, expiresInMinutes }) {
  if (!isMailerEnabled || !transporter) return false;

  const safeName = String(name || "aluno").trim();
  const safeCode = String(code || "").trim();
  const subject = "DNA Monster Fitness - Código de recuperação";
  const text = [
    `Olá, ${safeName}.`,
    "",
    `Seu código de recuperação de senha: ${safeCode}`,
    `Validade: ${Number(expiresInMinutes)} minutos.`,
    "",
    "Se você não solicitou esta alteração, ignore este e-mail.",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f1a15;">
      <h2 style="margin:0 0 12px;">DNA Monster Fitness</h2>
      <p>Olá, ${safeName}.</p>
      <p>Use este código para redefinir sua senha:</p>
      <p style="font-size:28px; font-weight:700; letter-spacing:4px; margin:16px 0;">${safeCode}</p>
      <p>Validade: <strong>${Number(expiresInMinutes)} minutos</strong>.</p>
      <p>Se você não solicitou esta alteração, ignore este e-mail.</p>
    </div>
  `;

  await transporter.sendMail({
    from: getFromAddress(),
    to,
    subject,
    text,
    html,
  });

  logger.info("Password reset email sent", { to });
  return true;
}

module.exports = {
  isMailerEnabled,
  sendPasswordResetEmail,
};

