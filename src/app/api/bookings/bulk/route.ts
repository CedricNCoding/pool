import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, canAccessCompany } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { checkBooking } from "@/lib/scheduling";
import { auditLog } from "@/lib/audit";

// Assistant de planification : crée un créneau par jour (jours de semaine choisis)
// et par technicien sur une plage de dates. Saute les conflits bloquants (sauf force).
export async function POST(req: NextRequest) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const body = await req.json();
  const projectId = String(body.projectId ?? "");
  const techIds: string[] = Array.isArray(body.technicianIds) ? body.technicianIds : [];
  const weekdays: number[] = Array.isArray(body.weekdays) ? body.weekdays.map(Number) : [1, 2, 3, 4, 5];
  if (!projectId || techIds.length === 0 || !body.startDate || !body.endDate) {
    return NextResponse.json({ error: "Projet, techniciens et plage de dates requis" }, { status: 400 });
  }
  const startTime = body.startTime || "09:00";
  const endTime = body.endTime || "17:00";
  const isAdmin = session.role === "admin" || session.role === "superadmin";
  const force = body.force === true && isAdmin;

  const project = await prisma.project.findFirst({ where: { id: projectId } });
  if (!project) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });

  // techniciens accessibles
  const techs = await prisma.technician.findMany({ where: { id: { in: techIds } }, select: { id: true, companyId: true, firstName: true, lastName: true } });
  const accessible = techs.filter((t) => canAccessCompany(session, t.companyId));

  const from = new Date(`${body.startDate}T00:00:00`);
  const to = new Date(`${body.endDate}T00:00:00`);
  const days: Date[] = [];
  for (let d = new Date(from); d <= to && days.length < 200; d.setDate(d.getDate() + 1)) {
    if (weekdays.includes(d.getDay())) days.push(new Date(d));
  }

  let created = 0;
  const skipped: { technician: string; date: string; reasons: string[] }[] = [];
  const warnings = new Set<string>();

  for (const day of days) {
    const ds = day.toISOString().slice(0, 10);
    const start = new Date(`${ds}T${startTime}`);
    const end = new Date(`${ds}T${endTime}`);
    if (!(start < end)) continue;
    for (const t of accessible) {
      const check = await checkBooking({ technicianId: t.id, start, end, projectId });
      if (check.conflicts.length > 0 && !force) {
        skipped.push({ technician: `${t.firstName} ${t.lastName}`, date: ds, reasons: check.conflicts });
        continue;
      }
      await prisma.booking.create({ data: { technicianId: t.id, projectId, start, end, status: "pressenti", createdById: session.id } });
      check.warnings.forEach((w) => warnings.add(w));
      created++;
    }
  }
  await auditLog({ userId: session.id, action: "create", entityType: "booking_bulk", entityId: projectId, details: `${created} créneau(x)` });
  return NextResponse.json({ created, skipped, warnings: [...warnings] }, { status: 201 });
}
