import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, canAccessCompany } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { auditLog } from "@/lib/audit";

// Dotation : attribue l'EPI/matériel à un technicien, ou le restitue (return:true).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const body = await req.json();
  const e = await prisma.equipment.findFirst({ where: { id } });
  if (!e) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (body.return === true) {
    await prisma.equipmentAssignment.updateMany({ where: { equipmentId: id, returnedAt: null }, data: { returnedAt: new Date(), conditionNote: body.conditionNote?.trim() || null } });
    await prisma.equipment.update({ where: { id }, data: { status: "disponible" } });
    await auditLog({ userId: session.id, action: "update", entityType: "equipment", entityId: id, details: "Restitution" });
    return NextResponse.json({ ok: true });
  }

  const technicianId = String(body.technicianId ?? "");
  const tech = await prisma.technician.findFirst({ where: { id: technicianId } });
  if (!tech) return NextResponse.json({ error: "Technicien introuvable" }, { status: 404 });
  if (!canAccessCompany(session, tech.companyId)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  // ferme une éventuelle dotation ouverte, puis en crée une nouvelle.
  await prisma.equipmentAssignment.updateMany({ where: { equipmentId: id, returnedAt: null }, data: { returnedAt: new Date() } });
  await prisma.equipmentAssignment.create({ data: { equipmentId: id, technicianId, conditionNote: body.conditionNote?.trim() || null, createdById: session.id } });
  await prisma.equipment.update({ where: { id }, data: { status: "attribue" } });
  await auditLog({ userId: session.id, action: "update", entityType: "equipment", entityId: id, details: `Dotation ${tech.firstName} ${tech.lastName}` });
  return NextResponse.json({ ok: true }, { status: 201 });
}
