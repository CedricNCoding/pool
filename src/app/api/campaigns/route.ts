import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { auditLog } from "@/lib/audit";

export async function GET() {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const list = await prisma.skillCampaign.findMany({
    include: { assessments: { select: { status: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(list.map((c) => ({
    id: c.id, name: c.name, status: c.status, createdAt: c.createdAt,
    total: c.assessments.length, traites: c.assessments.filter((a) => a.status !== "propose").length,
  })));
}

// Crée une campagne et une ligne d'évaluation par (technicien × compétence),
// pré-remplie au niveau actuel.
export async function POST(req: NextRequest) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  const techIds: string[] = Array.isArray(body.technicianIds) ? body.technicianIds : [];
  const skillIds: string[] = Array.isArray(body.skillIds) ? body.skillIds : [];
  if (techIds.length === 0 || skillIds.length === 0) return NextResponse.json({ error: "Techniciens et compétences requis" }, { status: 400 });

  const c = await prisma.skillCampaign.create({ data: { name: body.name.trim(), createdById: session.id } });
  const current = await prisma.technicianSkill.findMany({
    where: { technicianId: { in: techIds }, skillId: { in: skillIds } },
    select: { technicianId: true, skillId: true, level: true },
  });
  const lvl = new Map(current.map((s) => [`${s.technicianId}:${s.skillId}`, s.level]));
  const data = techIds.flatMap((technicianId) => skillIds.map((skillId) => ({
    campaignId: c.id, technicianId, skillId, proposedLevel: lvl.get(`${technicianId}:${skillId}`) ?? 0, status: "propose",
  })));
  await prisma.skillSelfAssessment.createMany({ data });
  await auditLog({ userId: session.id, action: "create", entityType: "skill_campaign", entityId: c.id, details: c.name });
  return NextResponse.json(c, { status: 201 });
}
