import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { auditLog } from "@/lib/audit";

export async function GET() {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const list = await prisma.safetyBriefing.findMany({
    include: { attendees: { select: { signedAt: true } }, project: { select: { title: true } } },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(list.map((b) => ({
    id: b.id, date: b.date, theme: b.theme, animator: b.animator, project: b.project,
    total: b.attendees.length, signed: b.attendees.filter((a) => a.signedAt).length,
  })));
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const body = await req.json();
  if (!body.theme?.trim() || !body.date) return NextResponse.json({ error: "Thème et date requis" }, { status: 400 });
  const ids: string[] = Array.isArray(body.technicianIds) ? body.technicianIds : [];

  const b = await prisma.safetyBriefing.create({
    data: { date: new Date(body.date), theme: body.theme.trim(), animator: body.animator?.trim() || null, projectId: body.projectId || null, notes: body.notes?.trim() || null },
  });
  // createMany est scopé par l'extension (injecte tenantId).
  if (ids.length) await prisma.safetyBriefingAttendee.createMany({ data: ids.map((technicianId) => ({ briefingId: b.id, technicianId })) });
  await auditLog({ userId: session.id, action: "create", entityType: "safety_briefing", entityId: b.id, details: b.theme });
  return NextResponse.json(b, { status: 201 });
}
