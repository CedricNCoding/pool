import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  const body = await req.json();
  const name = (body.name ?? "").trim();
  const categoryId = body.categoryId;

  if (!name || !categoryId) {
    return NextResponse.json(
      { error: "Nom et famille sont obligatoires" },
      { status: 400 }
    );
  }

  const category = await prisma.skillCategory.findUnique({
    where: { id: categoryId },
  });
  if (!category) {
    return NextResponse.json({ error: "Famille introuvable" }, { status: 400 });
  }

  const dup = await prisma.skill.findFirst({ where: { name, categoryId } });
  if (dup) {
    return NextResponse.json(
      { error: "Cette competence existe deja dans cette famille" },
      { status: 409 }
    );
  }

  const last = await prisma.skill.findFirst({
    where: { categoryId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const skill = await prisma.skill.create({
    data: {
      name,
      categoryId,
      description: body.description?.trim() || null,
      order: (last?.order ?? 0) + 1,
    },
  });

  await auditLog({
    userId: session.id,
    action: "create",
    entityType: "skill",
    entityId: skill.id,
    details: `${name} (${category.name})`,
  });

  return NextResponse.json(skill, { status: 201 });
}
