import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, canAccessCompany } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  const technicianId = new URL(req.url).searchParams.get("technicianId");
  const where: Record<string, unknown> =
    session.role === "admin"
      ? {}
      : { technician: { companyId: session.companyId ?? "__none__" } };
  if (technicianId) where.technicianId = technicianId;

  const assignments = await prisma.trainingAssignment.findMany({
    where,
    include: {
      technician: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: { select: { name: true, color: true } },
        },
      },
      module: {
        select: {
          id: true,
          title: true,
          targetSkills: { select: { id: true, name: true } },
        },
      },
      path: { select: { id: true, title: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(assignments);
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const body = await req.json();
  const technicianId = body.technicianId;
  if (!technicianId || (!body.moduleId && !body.pathId)) {
    return NextResponse.json(
      { error: "Technicien et module (ou parcours) requis" },
      { status: 400 }
    );
  }

  const tech = await prisma.technician.findUnique({ where: { id: technicianId } });
  if (!tech) return NextResponse.json({ error: "Technicien introuvable" }, { status: 400 });
  if (!canAccessCompany(session, tech.companyId)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const assignment = await prisma.trainingAssignment.create({
    data: {
      technicianId,
      moduleId: body.moduleId || null,
      pathId: body.pathId || null,
      status: body.status || "propose",
      note: body.note?.trim() || null,
      assignedById: session.id,
    },
  });

  await auditLog({
    userId: session.id,
    action: "create",
    entityType: "training_assignment",
    entityId: assignment.id,
    details: `${tech.firstName} ${tech.lastName}`,
  });

  return NextResponse.json(assignment, { status: 201 });
}
