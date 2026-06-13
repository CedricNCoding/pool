import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, canAccessCompany } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { recordAssignmentEvent } from "@/lib/training";
import { auditLog } from "@/lib/audit";

const clamp = (n: number) => Math.max(0, Math.min(5, Math.round(Number(n) || 0)));

// Affectation + son historique (timeline du cycle de vie).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const assignment = await prisma.trainingAssignment.findFirst({
    where: { id },
    include: {
      technician: { select: { companyId: true } },
      history: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!assignment) return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  if (!canAccessCompany(session, assignment.technician.companyId)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }
  return NextResponse.json({ id: assignment.id, status: assignment.status, history: assignment.history });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const body = await req.json();

  const assignment = await prisma.trainingAssignment.findFirst({
    where: { id },
    include: { technician: { select: { id: true, companyId: true } } },
  });
  if (!assignment) return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  if (!canAccessCompany(session, assignment.technician.companyId)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (body.note !== undefined) data.note = body.note?.trim() || null;
  if (body.status !== undefined) data.status = body.status;
  // Financement par participant.
  if (body.cost !== undefined) data.cost = body.cost === null || body.cost === "" ? null : Number(body.cost) || null;
  if (body.fundingSource !== undefined) data.fundingSource = body.fundingSource || null;
  if (body.fundingRef !== undefined) data.fundingRef = body.fundingRef?.trim() || null;

  // Validation : le validateur fixe le niveau atteint -> maj competences + historique
  if (body.status === "valide") {
    data.validatedById = session.id;
    data.validatedAt = new Date();

    const levels: { skillId: string; level: number }[] = Array.isArray(body.levels)
      ? body.levels
      : [];
    const techId = assignment.technician.id;

    for (const l of levels) {
      const level = clamp(l.level);
      await prisma.technicianSkill.upsert({
        where: { technicianId_skillId: { technicianId: techId, skillId: l.skillId } },
        create: { technicianId: techId, skillId: l.skillId, level },
        update: { level },
      });
    }
    if (levels.length > 0) {
      await prisma.technicianSkillHistory.createMany({
        data: levels.map((l) => ({
          technicianId: techId,
          skillId: l.skillId,
          level: clamp(l.level),
          userId: session.id,
        })),
      });
    }
  }

  const updated = await prisma.trainingAssignment.update({ where: { id }, data });

  // Historique : on trace toute transition de statut (et la note associée).
  if (body.status !== undefined && body.status !== assignment.status) {
    await recordAssignmentEvent({
      assignmentId: id,
      status: body.status,
      note: body.note?.trim() || null,
      actorId: session.id,
      actorName: session.name,
    });
  }

  await auditLog({
    userId: session.id,
    action: body.status === "valide" ? "validate" : "update",
    entityType: "training_assignment",
    entityId: id,
    details: body.status || "",
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const assignment = await prisma.trainingAssignment.findFirst({
    where: { id },
    include: { technician: { select: { companyId: true } } },
  });
  if (!assignment) return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  if (!canAccessCompany(session, assignment.technician.companyId)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }
  await prisma.trainingAssignment.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
