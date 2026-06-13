import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { recordSessionEvent, SESSION_STATUS } from "@/lib/training";
import { auditLog } from "@/lib/audit";

// Fiche complète d'une session : contenu, participants, documents, financement,
// historique. Gestionnaire -> voit la session si elle compte un de ses
// techniciens, et ne voit QUE ses participants (anonymisation inter-sociétés).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const isAdmin = session.role === "admin" || session.role === "superadmin";

  const s = await prisma.trainingSession.findFirst({
    where: { id },
    include: {
      module: { select: { id: true, title: true, description: true, durationHours: true, targetSkills: { select: { id: true, name: true } } } },
      path: { select: { id: true, title: true } },
      participants: {
        include: {
          technician: { select: { id: true, firstName: true, lastName: true, service: true, company: { select: { id: true, name: true, color: true } } } },
        },
        orderBy: { createdAt: "asc" },
      },
      documents: { orderBy: { createdAt: "desc" } },
      history: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!s) return NextResponse.json({ error: "Non trouvee" }, { status: 404 });

  let participants = s.participants;
  if (!isAdmin) {
    const mine = participants.filter((p) => p.technician.company?.id === session.companyId);
    if (mine.length === 0) return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    participants = mine;
  }

  return NextResponse.json({
    id: s.id,
    title: s.title,
    status: s.status,
    startDate: s.startDate,
    endDate: s.endDate,
    location: s.location,
    trainer: s.trainer,
    notes: s.notes,
    module: s.module,
    path: s.path,
    participants: participants.map((p) => ({
      id: p.id,
      status: p.status,
      cost: p.cost,
      fundingSource: p.fundingSource,
      fundingRef: p.fundingRef,
      technician: p.technician,
    })),
    documents: s.documents,
    history: s.history,
    totalCost: participants.reduce((sum, p) => sum + (p.cost ?? 0), 0),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const isAdmin = session.role === "admin" || session.role === "superadmin";
  const body = await req.json();

  const existing = await prisma.trainingSession.findFirst({
    where: { id },
    include: { participants: { select: { technician: { select: { companyId: true } } } } },
  });
  if (!existing) return NextResponse.json({ error: "Non trouvee" }, { status: 404 });
  if (!isAdmin && !existing.participants.some((p) => p.technician.companyId === session.companyId)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = String(body.title).trim() || existing.title;
  if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
  if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null;
  if (body.location !== undefined) data.location = body.location?.trim() || null;
  if (body.trainer !== undefined) data.trainer = body.trainer?.trim() || null;
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null;
  if (body.status !== undefined && SESSION_STATUS[body.status]) data.status = body.status;

  const updated = await prisma.trainingSession.update({ where: { id }, data });

  if (body.status !== undefined && body.status !== existing.status && SESSION_STATUS[body.status]) {
    await recordSessionEvent({
      sessionId: id,
      kind: "status",
      label: `Statut : ${SESSION_STATUS[body.status].label}`,
      actorId: session.id,
      actorName: session.name,
    });
  }
  await auditLog({ userId: session.id, action: "update", entityType: "training_session", entityId: id });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (session.role !== "admin" && session.role !== "superadmin") {
    return NextResponse.json({ error: "Reserve aux administrateurs" }, { status: 403 });
  }
  setTenantContext(session.tenantId);
  const { id } = await params;
  // Les participants (affectations) sont déliés (session_id -> NULL), pas supprimés.
  const r = await prisma.trainingSession.deleteMany({ where: { id } });
  if (r.count === 0) return NextResponse.json({ error: "Non trouvee" }, { status: 404 });
  await auditLog({ userId: session.id, action: "delete", entityType: "training_session", entityId: id });
  return NextResponse.json({ ok: true });
}
