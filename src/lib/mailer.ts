import nodemailer from "nodemailer";
import { prisma } from "./db";

// Échappe les valeurs issues de la base avant interpolation dans le HTML des
// e-mails (un nom de technicien/certif ne doit pas injecter de HTML).
const esc = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );

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
    subject: `[Praxis] Certification ${params.certName} - Expiration dans ${params.daysLeft} jours`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1E293B;">Rappel de renouvellement</h2>
        <p>Bonjour ${esc(params.techName)},</p>
        <p>Votre certification <strong>${esc(params.certName)}</strong> expire le
        <strong>${params.expiryDate.toLocaleDateString("fr-FR")}</strong>
        (dans ${params.daysLeft} jours).</p>
        <p>Pensez a planifier votre renouvellement.</p>
        <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
        <p style="color: #94A3B8; font-size: 12px;">Praxis — Suite Spektalis</p>
      </div>
    `,
  });
}

// Digest recapitulatif des echeances (certifs + documents) envoye au gestionnaire.
export async function sendExpiryDigest(params: {
  to: string;
  items: { techName: string; label: string; kind: string; daysLeft: number; expiryDate: Date }[];
}) {
  const rows = params.items
    .map((i) => {
      const color = i.daysLeft <= 30 ? "#EF4444" : i.daysLeft <= 60 ? "#F59E0B" : "#10B981";
      return `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #E2E8F0;">${esc(i.techName)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #E2E8F0;">${i.kind === "doc" ? "Document" : "Certification"}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #E2E8F0;">${esc(i.label)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #E2E8F0;">${i.expiryDate.toLocaleDateString("fr-FR")}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #E2E8F0;color:${color};font-weight:600;">${i.daysLeft} j</td>
      </tr>`;
    })
    .join("");

  await sendMail({
    to: params.to,
    subject: `[Praxis] ${params.items.length} echeance(s) a renouveler`,
    html: `
      <div style="font-family: sans-serif; max-width: 680px; margin: 0 auto;">
        <h2 style="color:#1E293B;">Echeances a renouveler</h2>
        <p>${params.items.length} certification(s) / document(s) arrivent a echeance prochainement :</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="text-align:left;color:#64748B;">
            <th style="padding:6px 10px;">Technicien</th><th style="padding:6px 10px;">Type</th>
            <th style="padding:6px 10px;">Intitule</th><th style="padding:6px 10px;">Expiration</th>
            <th style="padding:6px 10px;">Reste</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0;" />
        <p style="color:#94A3B8;font-size:12px;">Praxis — Suite Spektalis</p>
      </div>
    `,
  });
}
