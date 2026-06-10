import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireAdmin } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";

// Objectifs de montee en competences : % de techniciens actifs a niveau >= minLevel.
export async function GET(req: NextRequest) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const reqCompany = new URL(req.url).searchParams.get("companyId");
  const companyFilter =
    session.role !== "admin"
      ? session.companyId
        ? { companyId: session.companyId }
        : {}
      : reqCompany
        ? { companyId: reqCompany }
        : {};

  const [objectives, techs] = await Promise.all([
    prisma.skillObjective.findMany({
      include: { skill: { select: { name: true, category: { select: { name: true, color: true } } } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.technician.findMany({
      where: { isActive: true, ...companyFilter },
      select: { skills: { select: { skillId: true, level: true } } },
    }),
  ]);
  const total = techs.length;

  return NextResponse.json(
    objectives.map((o) => {
      const count = o.skillId
        ? techs.filter((t) => t.skills.some((s) => s.skillId === o.skillId && s.level >= o.minLevel)).length
        : 0;
      const currentPercent = total ? Math.round((count / total) * 100) : 0;
      return {
        id: o.id,
        label: o.label,
        skillName: o.skill?.name ?? null,
        color: o.skill?.category.color ?? "#6366F1",
        minLevel: o.minLevel,
        targetPercent: o.targetPercent,
        deadline: o.deadline,
        count,
        total,
        currentPercent,
        reached: currentPercent >= o.targetPercent,
      };
    })
  );
}

export async function POST(req: NextRequest) {
  setTenantContext((await requireAdmin()).tenantId);
  const body = await req.json();
  const label = (body.label ?? "").trim();
  if (!label) return NextResponse.json({ error: "Intitule obligatoire" }, { status: 400 });

  const objective = await prisma.skillObjective.create({
    data: {
      label,
      skillId: body.skillId || null,
      minLevel: Math.min(5, Math.max(1, parseInt(body.minLevel) || 3)),
      targetPercent: Math.min(100, Math.max(1, parseInt(body.targetPercent) || 80)),
      deadline: body.deadline ? new Date(body.deadline) : null,
    },
  });
  return NextResponse.json(objective, { status: 201 });
}
