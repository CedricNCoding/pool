import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { requiredDocsFor } from "@/lib/dossier";

// Sante du parc : couverture compétences, compétences rares, dossiers incomplets, échéances.
export async function GET() {
  const session = await requireSession();
  const techWhere =
    session.role !== "admin" && session.companyId
      ? { isActive: true, companyId: session.companyId }
      : { isActive: true };
  const companyFilter =
    session.role !== "admin" && session.companyId
      ? { companyId: session.companyId }
      : {};

  const now = new Date();
  const in90 = new Date(now.getTime() + 90 * 86400000);

  const categories = await prisma.skillCategory.findMany({ orderBy: { order: "asc" } });

  const [
    totalActive,
    skillsWithHolders,
    techsForDossier,
    expiringCerts,
    expiringDocs,
  ] = await Promise.all([
    prisma.technician.count({ where: techWhere }),

    // Toutes les competences avec le nombre de detenteurs (niveau >= 1)
    prisma.skill.findMany({
      include: {
        category: { select: { name: true, color: true } },
        technicians: {
          where: { level: { gte: 1 }, technician: techWhere },
          select: { id: true },
        },
      },
    }),

    // Techniciens actifs + categories de documents (pour dossiers incomplets)
    prisma.technician.findMany({
      where: techWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        service: true,
        documents: { select: { category: true } },
      },
    }),

    prisma.technicianCertification.count({
      where: { status: "active", expiryDate: { gte: now, lte: in90 }, technician: techWhere },
    }),
    prisma.document.count({
      where: { expiryDate: { gte: now, lte: in90 }, technician: techWhere },
    }),
  ]);

  // Couverture par famille (compte distinct de techniciens ayant >=1 competence)
  const coverage = await Promise.all(
    categories.map((cat) =>
      prisma.technician.count({
        where: {
          ...techWhere,
          skills: { some: { level: { gte: 1 }, skill: { categoryId: cat.id } } },
        },
      })
    )
  );

  const skillCoverage = categories.map((cat, i) => ({
    name: cat.name,
    color: cat.color,
    techCount: coverage[i],
    pct: totalActive ? Math.round((coverage[i] / totalActive) * 100) : 0,
  }));

  const skillStats = skillsWithHolders
    .map((s) => ({
      name: s.name,
      family: s.category.name,
      color: s.category.color,
      holders: s.technicians.length,
    }))
    .sort((a, b) => a.holders - b.holders);

  const incompleteDossiers = techsForDossier
    .map((t) => {
      const present = [...new Set(t.documents.map((d) => d.category))];
      const missing = requiredDocsFor(t.service).filter((r) => !present.includes(r));
      return { id: t.id, name: `${t.firstName} ${t.lastName}`, service: t.service, missing };
    })
    .filter((t) => t.missing.length > 0);

  return NextResponse.json({
    totalActive,
    skillCoverage,
    rareSkills: skillStats.slice(0, 12),
    incompleteDossiers,
    expiringCerts,
    expiringDocs,
  });
}
