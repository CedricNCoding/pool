import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, canAccessCompany } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { auditLog } from "@/lib/audit";

// Avance une habilitation dans le cycle de renouvellement. À "realise", met à
// jour la date d'expiration et remet le statut à "ok".
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const body = await req.json();

  const cert = await prisma.technicianCertification.findFirst({
    where: { id },
    include: { technician: { select: { companyId: true } } },
  });
  if (!cert) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!canAccessCompany(session, cert.technician.companyId)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const data: Record<string, unknown> = {};
  if (body.renewalStatus !== undefined) data.renewalStatus = body.renewalStatus;
  if (body.renewalDate !== undefined) data.renewalDate = body.renewalDate ? new Date(body.renewalDate) : null;
  if (body.renewalOrganism !== undefined) data.renewalOrganism = body.renewalOrganism?.trim() || null;
  if (body.renewalStatus === "realise") {
    data.renewalStatus = "ok";
    if (body.newExpiryDate) data.expiryDate = new Date(body.newExpiryDate);
    if (body.renewalDate) data.obtainedDate = new Date(body.renewalDate);
  }
  await prisma.technicianCertification.update({ where: { id }, data });
  await auditLog({ userId: session.id, action: "update", entityType: "habilitation_renewal", entityId: id, details: body.renewalStatus || "" });
  return NextResponse.json({ ok: true });
}
