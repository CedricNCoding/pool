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
  const path = await prisma.trainingPath.findUnique({
    where: { id },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          module: { include: { targetSkills: { include: { category: true } } } },
        },
      },
    },
  });
  if (!path) return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  return NextResponse.json(path);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  const { id } = await params;
  const existing = await prisma.trainingPath.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  await prisma.trainingPath.delete({ where: { id } });
  await auditLog({
    userId: session.id,
    action: "delete",
    entityType: "training_path",
    entityId: id,
    details: existing.title,
  });
  return NextResponse.json({ ok: true });
}
