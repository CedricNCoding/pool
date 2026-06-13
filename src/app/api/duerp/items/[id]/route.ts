import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const k of ["danger", "exposure", "existingMeasures", "plannedMeasures", "responsible", "status"]) {
    if (body[k] !== undefined) data[k] = body[k]?.toString().trim() || null;
  }
  if (body.gravity !== undefined) data.gravity = Math.min(4, Math.max(1, Number(body.gravity) || 2));
  if (body.probability !== undefined) data.probability = Math.min(4, Math.max(1, Number(body.probability) || 2));
  if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  const r = await prisma.riskItem.updateMany({ where: { id }, data });
  if (r.count === 0) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const r = await prisma.riskItem.deleteMany({ where: { id } });
  if (r.count === 0) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
