import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireAdmin } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { auditLog } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  setTenantContext((await requireSession()).tenantId);
  const { id } = await params;
  const path = await prisma.trainingPath.findFirst({
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.trainingPath.findFirst({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Non trouve" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.description !== undefined) data.description = body.description?.trim() || null;

  // Remplacement complet de la liste ordonnee des sessions du parcours.
  if (Array.isArray(body.moduleIds)) {
    await prisma.trainingPathModule.deleteMany({ where: { pathId: id } });
    data.modules = {
      create: body.moduleIds.map((moduleId: string, i: number) => ({ moduleId, order: i })),
    };
  }

  const path = await prisma.trainingPath.update({
    where: { id },
    data,
    include: {
      modules: { orderBy: { order: "asc" }, include: { module: true } },
    },
  });
  await auditLog({
    userId: session.id,
    action: "update",
    entityType: "training_path",
    entityId: id,
    details: path.title,
  });
  return NextResponse.json(path);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const existing = await prisma.trainingPath.findFirst({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  await prisma.trainingPath.deleteMany({ where: { id } });
  await auditLog({
    userId: session.id,
    action: "delete",
    entityType: "training_path",
    entityId: id,
    details: existing.title,
  });
  return NextResponse.json({ ok: true });
}
