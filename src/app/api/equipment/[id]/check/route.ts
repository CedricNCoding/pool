import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { auditLog } from "@/lib/audit";

// Vérification périodique (VGP) : enregistre un contrôle et planifie le suivant.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const body = await req.json();
  const e = await prisma.equipment.findFirst({ where: { id } });
  if (!e) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await prisma.equipmentCheck.create({
    data: {
      equipmentId: id,
      date: body.date ? new Date(body.date) : new Date(),
      result: body.result || "conforme",
      checkedBy: body.checkedBy?.trim() || session.name,
      note: body.note?.trim() || null,
    },
  });
  const data: Record<string, unknown> = {};
  if (body.nextCheckDate) data.nextCheckDate = new Date(body.nextCheckDate);
  if (body.result === "non_conforme") data.status = "maintenance";
  if (Object.keys(data).length) await prisma.equipment.update({ where: { id }, data });
  await auditLog({ userId: session.id, action: "create", entityType: "equipment_check", entityId: id });
  return NextResponse.json({ ok: true }, { status: 201 });
}
