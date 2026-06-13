import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";

// Données « moyens humains » pour le mémoire technique + chapitres réutilisables.
export async function GET() {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const isAdmin = session.role === "admin" || session.role === "superadmin";
  const techWhere = isAdmin ? { isActive: true } : { isActive: true, companyId: session.companyId ?? "__none__" };
  const now = new Date();

  const techs = await prisma.technician.findMany({
    where: techWhere,
    select: {
      service: true, contractStart: true, medicalVisitDate: true, medicalVisitPeriodicityMonths: true,
      certifications: { where: { status: "active" }, select: { expiryDate: true, certification: { select: { name: true, category: true } } } },
    },
  });

  const effectif = techs.length;
  const byService: Record<string, number> = {};
  let ancienneteSum = 0, ancienneteN = 0, medicalOk = 0;
  const habil: Record<string, number> = {};
  for (const t of techs) {
    byService[t.service] = (byService[t.service] || 0) + 1;
    if (t.contractStart) { ancienneteSum += (now.getTime() - new Date(t.contractStart).getTime()) / (365.25 * 86400000); ancienneteN++; }
    const due = t.medicalVisitDate ? new Date(new Date(t.medicalVisitDate).setMonth(new Date(t.medicalVisitDate).getMonth() + (t.medicalVisitPeriodicityMonths || 24))) : null;
    if (due && due > now) medicalOk++;
    for (const c of t.certifications) {
      if (c.certification.category === "securite" && (!c.expiryDate || new Date(c.expiryDate) > now)) {
        habil[c.certification.name] = (habil[c.certification.name] || 0) + 1;
      }
    }
  }

  const [equip, equipOverdue, riskUnits, riskItems, riskOpen, sessions, sections] = await Promise.all([
    prisma.equipment.count(),
    prisma.equipment.count({ where: { nextCheckDate: { lt: now } } }),
    prisma.riskUnit.count(),
    prisma.riskItem.count(),
    prisma.riskItem.count({ where: { status: { not: "maitrise" } } }),
    prisma.trainingSession.count(),
    prisma.tenderMemoSection.findMany({ orderBy: { order: "asc" } }),
  ]);

  return NextResponse.json({
    stats: {
      effectif,
      ancienneteMoyenne: ancienneteN ? Math.round((ancienneteSum / ancienneteN) * 10) / 10 : null,
      medicalOk, medicalTotal: effectif,
      byService,
      habilitations: Object.entries(habil).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, n })),
      equip, equipOverdue,
      riskUnits, riskItems, riskOpen,
      sessions,
    },
    sections,
  });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const body = await req.json();
  if (!body.title?.trim()) return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  const s = await prisma.tenderMemoSection.create({ data: { title: body.title.trim(), content: body.content?.trim() || "", order: Number(body.order) || 0 } });
  return NextResponse.json(s, { status: 201 });
}
