import nodemailer from "nodemailer";
import { prisma } from "./db";

async function getSmtpConfig() {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          "smtp_host",
          "smtp_port",
          "smtp_user",
          "smtp_pass",
          "smtp_from",
          "smtp_secure",
        ],
      },
    },
  });
  const config: Record<string, string> = {};
  settings.forEach((s) => (config[s.key] = s.value));
  if (!config.smtp_host) return null;
  return config;
}

export async function sendMail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const config = await getSmtpConfig();
  if (!config) throw new Error("SMTP non configure");

  const transporter = nodemailer.createTransport({
    host: config.smtp_host,
    port: parseInt(config.smtp_port || "587"),
    secure: config.smtp_secure === "true",
    auth: {
      user: config.smtp_user,
      pass: config.smtp_pass,
    },
  });

  await transporter.sendMail({
    from: config.smtp_from || config.smtp_user,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}

export async function sendCertExpiryReminder(params: {
  techName: string;
  techEmail: string;
  certName: string;
  expiryDate: Date;
  daysLeft: number;
}) {
  await sendMail({
    to: params.techEmail,
    subject: `[AV Pool] Certification ${params.certName} - Expiration dans ${params.daysLeft} jours`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1E293B;">Rappel de renouvellement</h2>
        <p>Bonjour ${params.techName},</p>
        <p>Votre certification <strong>${params.certName}</strong> expire le
        <strong>${params.expiryDate.toLocaleDateString("fr-FR")}</strong>
        (dans ${params.daysLeft} jours).</p>
        <p>Pensez a planifier votre renouvellement.</p>
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
        <p style="color: #94A3B8; font-size: 12px;">AV Pool - Gestion du pool techniciens audiovisuel</p>
      </div>
    `,
  });
}
