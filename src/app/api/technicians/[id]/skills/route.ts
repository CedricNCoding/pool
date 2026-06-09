import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, canAccessCompany } from "@/lib/auth";

const clamp = (n: number) => Math.max(0, Math.min(5, Math.round(Number(n) || 0)));

// Historique des niveaux de competence (pour suivre l'evolution)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;

  const tech = await prisma.technician.findUnique({ where: { id } });
  if (!tech) return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  if (!canAccessCompany(session, tech.companyId)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const history = await prisma.technicianSkillHistory.findMany({
    where: { technicianId: id },
    include: { skill: { include: { category: true } } },
    orderBy: { recordedAt: "asc" },
  });

  return NextResponse.json(history);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;
  const { skills } = await req.json();

  const tech = await prisma.technician.findUnique({ where: { id } });
  if (!tech) return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  if (!canAccessCompany(session, tech.companyId)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  // Niveaux actuels (pour calculer les changements a historiser)
  const current = await prisma.technicianSkill.findMany({
    where: { technicianId: id },
    select: { skillId: true, level: true },
  });
  const oldMap = new Map(current.map((s) => [s.skillId, s.level]));

  const incoming: { skillId: string; level: number }[] = (skills ?? []).map(
    (s: { skillId: string; level: number }) => ({
      skillId: s.skillId,
      level: clamp(s.level),
    })
  );

  // Changements = competence dont le niveau differe de l'ancien (ajout ou modif).
  // Les retraits (competence absente du nouvel ensemble) ne creent pas d'entree.
  const changed = incoming.filter((s) => oldMap.get(s.skillId) !== s.level);

  // Remplacement complet de l'etat courant
  await prisma.technicianSkill.deleteMany({ where: { technicianId: id } });
  if (incoming.length > 0) {
    await prisma.technicianSkill.createMany({
      data: incoming.map((s) => ({
        technicianId: id,
        skillId: s.skillId,
        level: s.level,
      })),
    });
  }

  // Journalisation de l'evolution
  if (changed.length > 0) {
    await prisma.technicianSkillHistory.createMany({
      data: changed.map((s) => ({
        technicianId: id,
        skillId: s.skillId,
        level: s.level,
        userId: session.id,
      })),
    });
  }

  const updated = await prisma.technicianSkill.findMany({
    where: { technicianId: id },
    include: { skill: { include: { category: true } } },
  });

  return NextResponse.json(updated);
}
