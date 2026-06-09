import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, canAccessCompany } from "@/lib/auth";

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

  await prisma.technicianSkill.deleteMany({ where: { technicianId: id } });

  if (skills && skills.length > 0) {
    await prisma.technicianSkill.createMany({
      data: skills.map((s: { skillId: string; level: number }) => ({
        technicianId: id,
        skillId: s.skillId,
        level: Math.max(1, Math.min(4, s.level)),
      })),
    });
  }

  const updated = await prisma.technicianSkill.findMany({
    where: { technicianId: id },
    include: { skill: { include: { category: true } } },
  });

  return NextResponse.json(updated);
}
