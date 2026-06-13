import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, canAccessCompany } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";

const clamp = (n: number) => Math.max(0, Math.min(5, Math.round(Number(n) || 0)));

// Matrice compétences : catégories+compétences en colonnes, techniciens en lignes.
export async function GET() {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const isAdmin = session.role === "admin" || session.role === "superadmin";

  const categories = await prisma.skillCategory.findMany({
    include: { skills: { select: { id: true, name: true }, orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });
  const techs = await prisma.technician.findMany({
    where: isAdmin ? { isActive: true } : { isActive: true, companyId: session.companyId ?? "__none__" },
    select: { id: true, firstName: true, lastName: true, service: true, company: { select: { name: true, color: true } }, skills: { select: { skillId: true, level: true } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return NextResponse.json({
    categories: categories.map((c) => ({ id: c.id, name: c.name, color: c.color, skills: c.skills })),
    technicians: techs.map((t) => ({
      id: t.id, firstName: t.firstName, lastName: t.lastName, service: t.service, company: t.company,
      levels: Object.fromEntries(t.skills.map((s) => [s.skillId, s.level])),
    })),
  });
}

// Édition d'une cellule : upsert le niveau + historise.
export async function PATCH(req: NextRequest) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const body = await req.json();
  const technicianId = String(body.technicianId ?? "");
  const skillId = String(body.skillId ?? "");
  const level = clamp(body.level);
  if (!technicianId || !skillId) return NextResponse.json({ error: "technicianId et skillId requis" }, { status: 400 });

  const tech = await prisma.technician.findFirst({ where: { id: technicianId } });
  if (!tech) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!canAccessCompany(session, tech.companyId)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  await prisma.technicianSkill.upsert({
    where: { technicianId_skillId: { technicianId, skillId } },
    create: { technicianId, skillId, level },
    update: { level },
  });
  await prisma.technicianSkillHistory.create({ data: { technicianId, skillId, level, userId: session.id } });
  return NextResponse.json({ ok: true });
}
