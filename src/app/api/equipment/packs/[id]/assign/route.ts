import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, canAccessCompany } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { auditLog } from "@/lib/audit";

// Dote un pack à un technicien : pour chaque ligne (catégorie × quantité), pioche
// des équipements DISPONIBLES et les attribue. Signale les manques de stock.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const body = await req.json();
  const technicianId = String(body.technicianId ?? "");

  const pack = await prisma.equipmentPack.findFirst({ where: { id }, include: { lines: true } });
  if (!pack) return NextResponse.json({ error: "Pack introuvable" }, { status: 404 });
  const tech = await prisma.technician.findFirst({ where: { id: technicianId } });
  if (!tech) return NextResponse.json({ error: "Technicien introuvable" }, { status: 404 });
  if (!canAccessCompany(session, tech.companyId)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  let assigned = 0;
  const shortfalls: { category: string; manquant: number }[] = [];
  for (const line of pack.lines) {
    const avail = await prisma.equipment.findMany({
      where: { category: line.category, status: "disponible" },
      take: line.quantity,
      orderBy: { createdAt: "asc" },
    });
    for (const eq of avail) {
      await prisma.equipmentAssignment.create({ data: { equipmentId: eq.id, technicianId, createdById: session.id } });
      await prisma.equipment.update({ where: { id: eq.id }, data: { status: "attribue" } });
      assigned++;
    }
    if (avail.length < line.quantity) shortfalls.push({ category: line.category, manquant: line.quantity - avail.length });
  }
  await auditLog({ userId: session.id, action: "update", entityType: "equipment_pack", entityId: id, details: `Dotation pack "${pack.name}" -> ${tech.firstName} ${tech.lastName}` });
  return NextResponse.json({ assigned, shortfalls }, { status: 201 });
}
