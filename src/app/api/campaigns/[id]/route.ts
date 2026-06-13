import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";

const clamp = (n: number) => Math.max(0, Math.min(5, Math.round(Number(n) || 0)));

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const c = await prisma.skillCampaign.findFirst({
    where: { id },
    include: { assessments: { include: { technician: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: "asc" } } },
  });
  if (!c) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  // noms de compétences
  const skillIds = [...new Set(c.assessments.map((a) => a.skillId))];
  const skills = await prisma.skill.findMany({ where: { id: { in: skillIds } }, select: { id: true, name: true } });
  const skillMap = Object.fromEntries(skills.map((s) => [s.id, s.name]));
  return NextResponse.json({ ...c, assessments: c.assessments.map((a) => ({ ...a, skillName: skillMap[a.skillId] ?? a.skillId })) });
}

// Valide/ajuste/refuse une évaluation (écrit la compétence si validé/ajusté),
// ou clôt la campagne {action:"close"}.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const body = await req.json();

  if (body.action === "close") {
    await prisma.skillCampaign.updateMany({ where: { id }, data: { status: "cloturee" } });
    return NextResponse.json({ ok: true });
  }

  const a = await prisma.skillSelfAssessment.findFirst({ where: { id: body.assessmentId, campaignId: id } });
  if (!a) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const status = body.status as string;
  const validatedLevel = body.validatedLevel != null ? clamp(body.validatedLevel) : a.proposedLevel;
  await prisma.skillSelfAssessment.update({ where: { id: a.id }, data: { status, validatedLevel } });

  if (status === "valide" || status === "ajuste") {
    await prisma.technicianSkill.upsert({
      where: { technicianId_skillId: { technicianId: a.technicianId, skillId: a.skillId } },
      create: { technicianId: a.technicianId, skillId: a.skillId, level: validatedLevel },
      update: { level: validatedLevel },
    });
    await prisma.technicianSkillHistory.create({ data: { technicianId: a.technicianId, skillId: a.skillId, level: validatedLevel, userId: session.id } });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const r = await prisma.skillCampaign.deleteMany({ where: { id } });
  if (r.count === 0) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
