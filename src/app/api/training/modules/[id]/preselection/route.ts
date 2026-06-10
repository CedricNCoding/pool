import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";

// Techniciens "en faiblesse" sur les competences ciblees par le module :
// au moins une competence ciblee sous le seuil (niveau manquant = 0).
//   ?level=3  -> seuil (defaut : sous "Avance")
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const url = new URL(req.url);
  const threshold = parseInt(url.searchParams.get("level") || "3") || 3;

  const module = await prisma.trainingModule.findFirst({
    where: { id },
    include: { targetSkills: { select: { id: true, name: true } } },
  });
  if (!module) return NextResponse.json({ error: "Non trouve" }, { status: 404 });

  const targetIds = module.targetSkills.map((s) => s.id);
  if (targetIds.length === 0) return NextResponse.json([]);

  const where: Record<string, unknown> = { isActive: true };
  if (session.role !== "admin" && session.companyId) {
    where.companyId = session.companyId;
  }

  const techs = await prisma.technician.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      service: true,
      company: { select: { name: true, color: true } },
      skills: {
        where: { skillId: { in: targetIds } },
        select: { skillId: true, level: true },
      },
    },
  });

  const result = techs
    .map((t) => {
      const levelMap = new Map(t.skills.map((s) => [s.skillId, s.level]));
      const perSkill = module.targetSkills.map((s) => ({
        skillId: s.id,
        name: s.name,
        level: levelMap.get(s.id) ?? 0,
      }));
      const weakest = Math.min(...perSkill.map((p) => p.level));
      const avg =
        perSkill.reduce((a, b) => a + b.level, 0) / perSkill.length;
      return { ...t, skills: undefined, perSkill, weakest, avg };
    })
    .filter((t) => t.weakest < threshold)
    .sort((a, b) => a.avg - b.avg);

  return NextResponse.json(result);
}
