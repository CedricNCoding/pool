import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, canAccessCompany } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { auditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const url = new URL(req.url);
  const technicianId = url.searchParams.get("technicianId");
  const isAdmin = session.role === "admin" || session.role === "superadmin";

  const where: Record<string, unknown> = {};
  if (technicianId) where.technicianId = technicianId;
  if (!isAdmin) where.technician = { companyId: session.companyId ?? "__none__" };

  const absences = await prisma.absence.findMany({
    where,
    include: { technician: { select: { id: true, firstName: true, lastName: true, company: { select: { name: true, color: true } } } } },
    orderBy: [{ status: "asc" }, { start: "desc" }],
  });
  return NextResponse.json(absences);
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const body = await req.json();
  const technicianId = String(body.technicianId ?? "");
  if (!technicianId) return NextResponse.json({ error: "Technicien requis" }, { status: 400 });
  const recurring = body.recurringWeekday != null && body.recurringWeekday !== "" ? Number(body.recurringWeekday) : null;
  if (recurring == null && (!body.start || !body.end)) {
    return NextResponse.json({ error: "Période (début/fin) ou récurrence requise" }, { status: 400 });
  }

  const tech = await prisma.technician.findFirst({ where: { id: technicianId } });
  if (!tech) return NextResponse.json({ error: "Technicien introuvable" }, { status: 404 });
  if (!canAccessCompany(session, tech.companyId)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const a = await prisma.absence.create({
    data: {
      technicianId,
      type: body.type || "cp",
      start: recurring == null && body.start ? new Date(body.start) : null,
      end: recurring == null && body.end ? new Date(body.end) : null,
      halfStart: !!body.halfStart,
      halfEnd: !!body.halfEnd,
      recurringWeekday: recurring,
      reason: body.reason?.trim() || null,
      status: body.status || "valide",
      createdById: session.id,
    },
  });
  await auditLog({ userId: session.id, action: "create", entityType: "absence", entityId: a.id, details: `${tech.firstName} ${tech.lastName} (${a.type})` });
  return NextResponse.json(a, { status: 201 });
}
