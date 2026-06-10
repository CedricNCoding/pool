import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireAdmin } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

export async function GET() {
  await requireSession();
  const modules = await prisma.trainingModule.findMany({
    include: {
      targetSkills: { include: { category: true } },
      _count: { select: { assignments: true } },
    },
    orderBy: { title: "asc" },
  });
  return NextResponse.json(modules);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  const body = await req.json();
  const title = (body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "Titre obligatoire" }, { status: 400 });
  }
  const skillIds: string[] = Array.isArray(body.targetSkillIds) ? body.targetSkillIds : [];
  let durationHours: number | null = null;
  if (body.durationHours) {
    const d = parseInt(String(body.durationHours), 10);
    durationHours = Number.isFinite(d) && d > 0 ? d : null;
  }

  const cost = Math.max(0, parseInt(String(body.cost)) || 0);

  const module = await prisma.trainingModule.create({
    data: {
      title,
      description: body.description?.trim() || null,
      durationHours,
      cost,
      targetSkills: { connect: skillIds.map((id) => ({ id })) },
    },
    include: { targetSkills: true },
  });

  await auditLog({
    userId: session.id,
    action: "create",
    entityType: "training_module",
    entityId: module.id,
    details: title,
  });

  return NextResponse.json(module, { status: 201 });
}
