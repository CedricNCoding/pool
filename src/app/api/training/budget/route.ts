import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";

// Budget & ROI formation : investi (formations validees x cout), engage (en cours),
// competences gagnees, cout par competence, detail par module.
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

  const assignments = await prisma.trainingAssignment.findMany({
    where: {
      moduleId: { not: null },
      status: { in: ["valide", "en_cours"] },
      technician: { isActive: true, ...companyFilter },
    },
    include: {
      module: { select: { id: true, title: true, cost: true, targetSkills: { select: { id: true } } } },
    },
  });

  let investedValidated = 0;
  let engaged = 0;
  let skillsGained = 0;
  const byModule = new Map<string, { title: string; cost: number; count: number; total: number }>();

  for (const a of assignments) {
    if (!a.module) continue;
    if (a.status === "valide") {
      investedValidated += a.module.cost;
      skillsGained += a.module.targetSkills.length;
      const m = byModule.get(a.module.id) || { title: a.module.title, cost: a.module.cost, count: 0, total: 0 };
      m.count++;
      m.total += a.module.cost;
      byModule.set(a.module.id, m);
    } else {
      engaged += a.module.cost;
    }
  }

  const validatedCount = assignments.filter((a) => a.status === "valide").length;

  return NextResponse.json({
    investedValidated,
    engaged,
    validatedCount,
    skillsGained,
    costPerSkill: skillsGained ? Math.round(investedValidated / skillsGained) : 0,
    byModule: [...byModule.values()].sort((a, b) => b.total - a.total),
  });
}
