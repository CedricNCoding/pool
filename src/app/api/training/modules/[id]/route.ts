import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireAdmin } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireSession();
  const { id } = await params;
  const module = await prisma.trainingModule.findUnique({
    where: { id },
    include: { targetSkills: { include: { category: true } } },
  });
  if (!module) return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  return NextResponse.json(module);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.durationHours !== undefined) {
    const d = parseInt(String(body.durationHours), 10);
    data.durationHours = Number.isFinite(d) && d > 0 ? d : null;
  }
  if (Array.isArray(body.targetSkillIds)) {
    data.targetSkills = { set: body.targetSkillIds.map((sid: string) => ({ id: sid })) };
  }

  const module = await prisma.trainingModule.update({
    where: { id },
    data,
    include: { targetSkills: true },
  });
  await auditLog({
    userId: session.id,
    action: "update",
    entityType: "training_module",
    entityId: id,
    details: module.title,
  });
  return NextResponse.json(module);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  const { id } = await params;
  const existing = await prisma.trainingModule.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  await prisma.trainingModule.delete({ where: { id } });
  await auditLog({
    userId: session.id,
    action: "delete",
    entityType: "training_module",
    entityId: id,
    details: existing.title,
  });
  return NextResponse.json({ ok: true });
}
