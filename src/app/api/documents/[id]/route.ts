import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { requireSession, canAccessCompany } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { auditLog } from "@/lib/audit";
import { UPLOAD_DIR } from "@/lib/uploads";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;

  const doc = await prisma.document.findFirst({
    where: { id },
    include: { technician: { select: { companyId: true } } },
  });
  if (!doc) return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  if (!canAccessCompany(session, doc.technician.companyId)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  // Supprime le fichier (ignore s'il a deja disparu) puis l'enregistrement
  try {
    await fs.unlink(path.join(UPLOAD_DIR, doc.technicianId, doc.fileName));
  } catch {
    /* fichier deja absent */
  }
  await prisma.document.deleteMany({ where: { id } });

  await auditLog({
    userId: session.id,
    action: "delete",
    entityType: "document",
    entityId: id,
    details: doc.title,
  });

  return NextResponse.json({ ok: true });
}
