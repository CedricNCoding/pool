import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireAdmin } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

export async function GET() {
  await requireSession();
  const paths = await prisma.trainingPath.findMany({
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: { module: { select: { id: true, title: true, durationHours: true } } },
      },
      _count: { select: { assignments: true } },
    },
    orderBy: { title: "asc" },
  });
  return NextResponse.json(paths);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  const body = await req.json();
  const title = (body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "Titre obligatoire" }, { status: 400 });
  }
  const moduleIds: string[] = Array.isArray(body.moduleIds) ? body.moduleIds : [];

  const path = await prisma.trainingPath.create({
    data: {
      title,
      description: body.description?.trim() || null,
      modules: {
        create: moduleIds.map((moduleId, i) => ({ moduleId, order: i })),
      },
    },
    include: {
      modules: { orderBy: { order: "asc" }, include: { module: true } },
    },
  });

  await auditLog({
    userId: session.id,
    action: "create",
    entityType: "training_path",
    entityId: path.id,
    details: title,
  });

  return NextResponse.json(path, { status: 201 });
}
