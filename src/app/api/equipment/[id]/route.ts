import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { auditLog } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const e = await prisma.equipment.findFirst({
    where: { id },
    include: {
      assignments: { include: { technician: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { assignedAt: "desc" } },
      checks: { orderBy: { date: "desc" } },
    },
  });
  if (!e) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(e);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const body = await req.json();
  const e = await prisma.equipment.findFirst({ where: { id } });
  if (!e) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const data: Record<string, unknown> = {};
  for (const k of ["name", "brand", "model", "serialNumber", "size", "category", "status", "notes"]) {
    if (body[k] !== undefined) data[k] = body[k]?.toString().trim() || null;
  }
  for (const k of ["purchaseDate", "expiryDate", "nextCheckDate"]) {
    if (body[k] !== undefined) data[k] = body[k] ? new Date(body[k]) : null;
  }
  const updated = await prisma.equipment.update({ where: { id }, data });
  await auditLog({ userId: session.id, action: "update", entityType: "equipment", entityId: id });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const r = await prisma.equipment.deleteMany({ where: { id } });
  if (r.count === 0) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  await auditLog({ userId: session.id, action: "delete", entityType: "equipment", entityId: id });
  return NextResponse.json({ ok: true });
}
