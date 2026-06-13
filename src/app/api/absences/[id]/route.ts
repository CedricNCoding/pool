import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, canAccessCompany } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { auditLog } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const body = await req.json();
  const a = await prisma.absence.findFirst({ where: { id }, include: { technician: { select: { companyId: true } } } });
  if (!a) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!canAccessCompany(session, a.technician.companyId)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const data: Record<string, unknown> = {};
  if (body.status !== undefined) { data.status = body.status; data.validatedById = session.id; }
  if (body.type !== undefined) data.type = body.type;
  if (body.reason !== undefined) data.reason = body.reason?.trim() || null;
  if (body.start !== undefined) data.start = body.start ? new Date(body.start) : null;
  if (body.end !== undefined) data.end = body.end ? new Date(body.end) : null;
  const updated = await prisma.absence.update({ where: { id }, data });
  await auditLog({ userId: session.id, action: "update", entityType: "absence", entityId: id, details: body.status || "" });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const a = await prisma.absence.findFirst({ where: { id }, include: { technician: { select: { companyId: true } } } });
  if (!a) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!canAccessCompany(session, a.technician.companyId)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  await prisma.absence.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
