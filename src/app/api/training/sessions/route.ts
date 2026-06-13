import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { recordSessionEvent } from "@/lib/training";
import { auditLog } from "@/lib/audit";

// Liste des sessions de formation (fiches). Admin -> toutes ; gestionnaire ->
// celles qui comptent au moins un participant de sa société.
export async function GET() {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const isAdmin = session.role === "admin" || session.role === "superadmin";

  const where = isAdmin
    ? {}
    : { participants: { some: { technician: { companyId: session.companyId ?? "__none__" } } } };

  const sessions = await prisma.trainingSession.findMany({
    where,
    include: {
      module: { select: { title: true } },
      path: { select: { title: true } },
      participants: { select: { cost: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(
    sessions.map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      startDate: s.startDate,
      endDate: s.endDate,
      location: s.location,
      trainer: s.trainer,
      module: s.module,
      path: s.path,
      participantCount: s.participants.length,
      totalCost: s.participants.reduce((sum, p) => sum + (p.cost ?? 0), 0),
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const body = await req.json();

  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Titre requis" }, { status: 400 });

  const created = await prisma.trainingSession.create({
    data: {
      title,
      moduleId: body.moduleId || null,
      pathId: body.pathId || null,
      status: body.status || "planifiee",
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      location: body.location?.trim() || null,
      trainer: body.trainer?.trim() || null,
      notes: body.notes?.trim() || null,
    },
  });

  await recordSessionEvent({
    sessionId: created.id,
    kind: "status",
    label: "Session créée",
    actorId: session.id,
    actorName: session.name,
  });
  await auditLog({
    userId: session.id,
    action: "create",
    entityType: "training_session",
    entityId: created.id,
    details: title,
  });

  return NextResponse.json(created, { status: 201 });
}
