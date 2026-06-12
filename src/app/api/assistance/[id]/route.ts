import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { auditLog } from "@/lib/audit";

// Arbitrage d'une demande de renfort — admin du tenant uniquement.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const body = await req.json();

  const status = body.status;
  if (status !== "accepted" && status !== "declined") {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const existing = await prisma.assistanceRequest.findFirst({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Non trouvée" }, { status: 404 });

  const updated = await prisma.assistanceRequest.update({
    where: { id },
    data: {
      status,
      adminNote: body.adminNote != null ? String(body.adminNote).trim() || null : existing.adminNote,
      resolvedById: session.id,
      resolvedAt: new Date(),
    },
  });

  await auditLog({
    userId: session.id,
    action: "update",
    entityType: "assistance_request",
    entityId: id,
    details: status === "accepted" ? "Renfort accepté" : "Renfort refusé",
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}
