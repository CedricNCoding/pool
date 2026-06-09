import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

// Editer une competence : renommer et/ou rattacher a une autre famille.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.skill.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  }

  const name =
    body.name !== undefined ? String(body.name).trim() : existing.name;
  const categoryId = body.categoryId ?? existing.categoryId;
  if (!name) {
    return NextResponse.json({ error: "Nom obligatoire" }, { status: 400 });
  }

  if (categoryId !== existing.categoryId) {
    const cat = await prisma.skillCategory.findUnique({ where: { id: categoryId } });
    if (!cat) {
      return NextResponse.json({ error: "Famille introuvable" }, { status: 400 });
    }
  }

  // Doublon (nom + famille), en excluant la competence courante
  const dup = await prisma.skill.findFirst({
    where: { name, categoryId, NOT: { id } },
  });
  if (dup) {
    return NextResponse.json(
      { error: "Cette competence existe deja dans cette famille" },
      { status: 409 }
    );
  }

  const skill = await prisma.skill.update({
    where: { id },
    data: {
      name,
      categoryId,
      description:
        body.description !== undefined
          ? body.description?.trim() || null
          : existing.description,
    },
  });

  await auditLog({
    userId: session.id,
    action: "update",
    entityType: "skill",
    entityId: id,
    details: name,
  });

  return NextResponse.json(skill);
}

// Supprimer une competence (retire aussi les niveaux des techniciens : cascade).
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  const { id } = await params;

  const existing = await prisma.skill.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  }

  await prisma.skill.delete({ where: { id } });

  await auditLog({
    userId: session.id,
    action: "delete",
    entityType: "skill",
    entityId: id,
    details: existing.name,
  });

  return NextResponse.json({ ok: true });
}
