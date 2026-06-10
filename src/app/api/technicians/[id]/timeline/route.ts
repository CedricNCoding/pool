import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, canAccessCompany } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";

// Frise d'evolution : fusionne historique de competences, formations validees,
// certifications obtenues et evenements du journal, triees du plus recent au plus ancien.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const tech = await prisma.technician.findFirst({ where: { id } });
  if (!tech) return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  if (!canAccessCompany(session, tech.companyId)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const [skillHistory, validated, certs, events] = await Promise.all([
    prisma.technicianSkillHistory.findMany({
      where: { technicianId: id },
      include: { skill: { select: { name: true, category: { select: { color: true } } } } },
      orderBy: { recordedAt: "desc" },
      take: 60,
    }),
    prisma.trainingAssignment.findMany({
      where: { technicianId: id, status: "valide" },
      include: { module: { select: { title: true } }, path: { select: { title: true } } },
    }),
    prisma.technicianCertification.findMany({
      where: { technicianId: id },
      include: { certification: { select: { name: true } } },
    }),
    prisma.technicianEvent.findMany({ where: { technicianId: id } }),
  ]);

  type Entry = { date: string; kind: string; label: string; sub: string; color: string };
  const entries: Entry[] = [];

  for (const h of skillHistory) {
    entries.push({
      date: h.recordedAt.toISOString(),
      kind: "skill",
      label: `${h.skill.name} — niveau ${h.level}`,
      sub: "Evolution de competence",
      color: h.skill.category.color,
    });
  }
  for (const v of validated) {
    if (!v.validatedAt) continue;
    entries.push({
      date: v.validatedAt.toISOString(),
      kind: "formation",
      label: v.module?.title || v.path?.title || "Formation",
      sub: "Formation validee",
      color: "#8B5CF6",
    });
  }
  for (const c of certs) {
    entries.push({
      date: c.obtainedDate.toISOString(),
      kind: "cert",
      label: c.certification.name,
      sub: "Certification obtenue",
      color: "#10B981",
    });
  }
  for (const e of events) {
    entries.push({
      date: e.date.toISOString(),
      kind: "event",
      label: e.title,
      sub: e.type,
      color: "#3B82F6",
    });
  }

  entries.sort((a, b) => (a.date < b.date ? 1 : -1));

  return NextResponse.json(entries.slice(0, 80));
}
