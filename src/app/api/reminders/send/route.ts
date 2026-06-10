import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { sendExpiryDigest } from "@/lib/mailer";
import { auditLog } from "@/lib/audit";

// Envoie un digest des echeances (certifs + documents) a un destinataire.
// POST { to?, days? }  -> defaut: smtp_from, 90 jours.
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  setTenantContext(session.tenantId);
  const body = await req.json().catch(() => ({}));
  const days = parseInt(body.days) || 90;
  const now = new Date();
  const until = new Date(now.getTime() + days * 86400000);

  const [certs, docs, fromSetting] = await Promise.all([
    prisma.technicianCertification.findMany({
      where: {
        status: "active",
        expiryDate: { gte: now, lte: until },
        technician: { isActive: true },
      },
      include: {
        technician: { select: { firstName: true, lastName: true } },
        certification: { select: { name: true } },
      },
    }),
    prisma.document.findMany({
      where: { expiryDate: { gte: now, lte: until }, technician: { isActive: true } },
      include: { technician: { select: { firstName: true, lastName: true } } },
    }),
    prisma.setting.findFirst({ where: { key: "smtp_from" } }),
  ]);

  const to = body.to || fromSetting?.value;
  if (!to) {
    return NextResponse.json(
      { error: "Aucun destinataire (renseignez 'to' ou l'expediteur SMTP)" },
      { status: 400 }
    );
  }

  const items = [
    ...certs.map((c) => ({
      techName: `${c.technician.firstName} ${c.technician.lastName}`,
      label: c.certification.name,
      kind: "cert",
      expiryDate: new Date(c.expiryDate!),
      daysLeft: Math.ceil((new Date(c.expiryDate!).getTime() - now.getTime()) / 86400000),
    })),
    ...docs.map((d) => ({
      techName: `${d.technician.firstName} ${d.technician.lastName}`,
      label: d.title,
      kind: "doc",
      expiryDate: new Date(d.expiryDate!),
      daysLeft: Math.ceil((new Date(d.expiryDate!).getTime() - now.getTime()) / 86400000),
    })),
  ].sort((a, b) => a.daysLeft - b.daysLeft);

  if (items.length === 0) {
    return NextResponse.json({ sent: false, count: 0, message: "Aucune echeance dans la fenetre." });
  }

  try {
    await sendExpiryDigest({ to, items });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Echec de l'envoi" },
      { status: 500 }
    );
  }

  await auditLog({
    userId: session.id,
    action: "reminder",
    entityType: "digest",
    details: `${items.length} echeances -> ${to}`,
  });

  return NextResponse.json({ sent: true, count: items.length, to });
}
