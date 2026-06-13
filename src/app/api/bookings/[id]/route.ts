import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, canAccessCompany } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { checkBooking } from "@/lib/scheduling";
import { auditLog } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const body = await req.json();

  const b = await prisma.booking.findFirst({ where: { id }, include: { technician: { select: { companyId: true } } } });
  if (!b) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!canAccessCompany(session, b.technician.companyId)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const data: Record<string, unknown> = {};
  if (body.role !== undefined) data.role = body.role?.trim() || null;
  if (body.note !== undefined) data.note = body.note?.trim() || null;
  if (body.status !== undefined) data.status = body.status;
  let warnings: string[] = [];
  if (body.start && body.end) {
    const start = new Date(body.start), end = new Date(body.end);
    const isAdmin = session.role === "admin" || session.role === "superadmin";
    const check = await checkBooking({ technicianId: b.technicianId, start, end, excludeBookingId: id });
    if (check.conflicts.length > 0 && !(body.force === true && isAdmin)) {
      return NextResponse.json({ error: "Conflit de planning", conflicts: check.conflicts, warnings: check.warnings }, { status: 409 });
    }
    data.start = start; data.end = end; warnings = check.warnings;
  }
  const updated = await prisma.booking.update({ where: { id }, data });
  await auditLog({ userId: session.id, action: "update", entityType: "booking", entityId: id });
  return NextResponse.json({ booking: updated, warnings });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const b = await prisma.booking.findFirst({ where: { id }, include: { technician: { select: { companyId: true } } } });
  if (!b) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!canAccessCompany(session, b.technician.companyId)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  await prisma.booking.deleteMany({ where: { id } });
  await auditLog({ userId: session.id, action: "delete", entityType: "booking", entityId: id });
  return NextResponse.json({ ok: true });
}
