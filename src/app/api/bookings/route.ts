import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, canAccessCompany } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { checkBooking } from "@/lib/scheduling";
import { auditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const projectId = url.searchParams.get("projectId");
  const technicianId = url.searchParams.get("technicianId");
  const isAdmin = session.role === "admin" || session.role === "superadmin";

  const where: Record<string, unknown> = {};
  if (from) where.end = { gte: new Date(from) };
  if (to) where.start = { lte: new Date(to) };
  if (projectId) where.projectId = projectId;
  if (technicianId) where.technicianId = technicianId;
  if (!isAdmin) where.technician = { companyId: session.companyId ?? "__none__" };

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      project: { select: { id: true, title: true, status: true, requiredEpi: true, requiredCertifications: { select: { id: true, name: true } } } },
      technician: { select: { id: true, firstName: true, lastName: true, company: { select: { name: true, color: true } } } },
    },
    orderBy: { start: "asc" },
  });

  // Enrichit chaque créneau d'un récap des manques (habilitations bloquantes / EPI avertissement).
  const techIds = [...new Set(bookings.map((b) => b.technicianId))];
  const certs = techIds.length ? await prisma.technicianCertification.findMany({
    where: { technicianId: { in: techIds }, status: "active" },
    select: { technicianId: true, certificationId: true, expiryDate: true },
  }) : [];
  const equips = techIds.length ? await prisma.equipmentAssignment.findMany({
    where: { technicianId: { in: techIds }, returnedAt: null },
    select: { technicianId: true, equipment: { select: { category: true } } },
  }) : [];
  const now = Date.now();
  const validCertByTech = new Map<string, Set<string>>();
  for (const c of certs) {
    if (c.expiryDate && new Date(c.expiryDate).getTime() < now) continue;
    if (!validCertByTech.has(c.technicianId)) validCertByTech.set(c.technicianId, new Set());
    validCertByTech.get(c.technicianId)!.add(c.certificationId);
  }
  const catByTech = new Map<string, Set<string>>();
  for (const e of equips) {
    if (!catByTech.has(e.technicianId)) catByTech.set(e.technicianId, new Set());
    catByTech.get(e.technicianId)!.add(e.equipment.category);
  }

  const enriched = bookings.map((b) => {
    const held = validCertByTech.get(b.technicianId) ?? new Set();
    const cats = catByTech.get(b.technicianId) ?? new Set();
    const missingCerts = b.project.requiredCertifications.filter((c) => !held.has(c.id)).map((c) => c.name);
    const reqEpi = (b.project.requiredEpi ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const missingEpi = reqEpi.filter((e) => !cats.has(e));
    return { ...b, project: { id: b.project.id, title: b.project.title, status: b.project.status }, missingCerts, missingEpi };
  });
  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const body = await req.json();
  const technicianId = String(body.technicianId ?? "");
  const projectId = String(body.projectId ?? "");
  if (!technicianId || !projectId || !body.start || !body.end) {
    return NextResponse.json({ error: "Technicien, projet, début et fin requis" }, { status: 400 });
  }
  const start = new Date(body.start);
  const end = new Date(body.end);
  if (!(start < end)) return NextResponse.json({ error: "La fin doit être après le début" }, { status: 400 });

  const tech = await prisma.technician.findFirst({ where: { id: technicianId } });
  if (!tech) return NextResponse.json({ error: "Technicien introuvable" }, { status: 404 });
  if (!canAccessCompany(session, tech.companyId)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const isAdmin = session.role === "admin" || session.role === "superadmin";
  const check = await checkBooking({ technicianId, start, end, projectId });
  if (check.conflicts.length > 0 && !(body.force === true && isAdmin)) {
    return NextResponse.json({ error: "Conflit de planning", conflicts: check.conflicts, warnings: check.warnings }, { status: 409 });
  }

  const booking = await prisma.booking.create({
    data: {
      technicianId, projectId, start, end,
      role: body.role?.trim() || null,
      note: body.note?.trim() || null,
      status: body.status || "pressenti",
      createdById: session.id,
    },
  });
  await auditLog({ userId: session.id, action: "create", entityType: "booking", entityId: booking.id, details: `${tech.firstName} ${tech.lastName}` });
  return NextResponse.json({ booking, warnings: check.warnings }, { status: 201 });
}
