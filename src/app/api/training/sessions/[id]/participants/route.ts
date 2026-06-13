import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, canAccessCompany } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { recordSessionEvent, recordAssignmentEvent } from "@/lib/training";
import { auditLog } from "@/lib/audit";

// Ajoute des participants à une session : crée une affectation (TrainingAssignment)
// par technicien, rattachée à la session et héritant de son contenu (module/parcours).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const body = await req.json();
  const technicianIds: string[] = Array.isArray(body.technicianIds) ? body.technicianIds : [];
  if (technicianIds.length === 0) {
    return NextResponse.json({ error: "Aucun technicien" }, { status: 400 });
  }

  const sess = await prisma.trainingSession.findFirst({
    where: { id },
    include: { participants: { select: { technicianId: true } } },
  });
  if (!sess) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

  const already = new Set(sess.participants.map((p) => p.technicianId));
  let added = 0;
  for (const technicianId of technicianIds) {
    if (already.has(technicianId)) continue;
    const tech = await prisma.technician.findFirst({ where: { id: technicianId } });
    if (!tech) continue;
    if (!canAccessCompany(session, tech.companyId)) continue;

    const a = await prisma.trainingAssignment.create({
      data: {
        technicianId,
        sessionId: id,
        moduleId: sess.moduleId,
        pathId: sess.pathId,
        status: body.status || "propose",
        assignedById: session.id,
      },
    });
    await recordAssignmentEvent({
      assignmentId: a.id,
      status: a.status,
      note: "Ajouté à la session",
      actorId: session.id,
      actorName: session.name,
    });
    added++;
  }

  if (added > 0) {
    await recordSessionEvent({
      sessionId: id,
      kind: "participant",
      label: `${added} participant(s) ajouté(s)`,
      actorId: session.id,
      actorName: session.name,
    });
    await auditLog({ userId: session.id, action: "update", entityType: "training_session", entityId: id, details: `+${added} participant(s)` });
  }

  return NextResponse.json({ added }, { status: 201 });
}

// Retire un participant de la session (supprime l'affectation et son historique).
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const { assignmentId } = await req.json();

  const a = await prisma.trainingAssignment.findFirst({
    where: { id: assignmentId, sessionId: id },
    include: { technician: { select: { companyId: true, firstName: true, lastName: true } } },
  });
  if (!a) return NextResponse.json({ error: "Participant introuvable" }, { status: 404 });
  if (!canAccessCompany(session, a.technician.companyId)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  await prisma.trainingAssignment.deleteMany({ where: { id: assignmentId } });
  await recordSessionEvent({
    sessionId: id,
    kind: "participant",
    label: `Participant retiré : ${a.technician.firstName} ${a.technician.lastName}`,
    actorId: session.id,
    actorName: session.name,
  });
  return NextResponse.json({ ok: true });
}
