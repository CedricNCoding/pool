import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireSession();

    const companyFilter =
      session.role !== "admin" && session.companyId
        ? { companyId: session.companyId }
        : {};

    const now = new Date();
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const [
      totalTechnicians,
      totalCompanies,
      activeCertifications,
      expiringCerts,
      skillDistribution,
      contractDistribution,
      recentActivity,
      expiringDocs,
    ] = await Promise.all([
      // Total active technicians
      prisma.technician.count({
        where: { isActive: true, ...companyFilter },
      }),

      // Total companies
      prisma.company.count({
        where:
          session.role === "admin"
            ? {}
            : session.companyId
              ? { id: session.companyId }
              : {},
      }),

      // Active certifications
      prisma.technicianCertification.count({
        where: {
          status: "active",
          technician: { isActive: true, ...companyFilter },
        },
      }),

      // Expiring certifications within 90 days
      prisma.technicianCertification.findMany({
        where: {
          status: "active",
          expiryDate: { gte: now, lte: in90Days },
          technician: { isActive: true, ...companyFilter },
        },
        include: {
          technician: { select: { firstName: true, lastName: true } },
          certification: { select: { name: true } },
        },
        orderBy: { expiryDate: "asc" },
        take: 20,
      }),

      // Skill distribution by category
      prisma.skillCategory.findMany({
        select: {
          name: true,
          color: true,
          skills: {
            select: {
              technicians: {
                where: {
                  technician: { isActive: true, ...companyFilter },
                },
                select: { id: true },
              },
            },
          },
        },
        orderBy: { order: "asc" },
      }),

      // Contract type distribution
      prisma.technician.groupBy({
        by: ["contractType"],
        where: { isActive: true, ...companyFilter },
        _count: { id: true },
      }),

      // Recent audit logs
      prisma.auditLog.findMany({
        include: {
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      // Documents qui expirent dans 90 jours (visite medicale, habilitation...)
      prisma.document.findMany({
        where: {
          expiryDate: { gte: now, lte: in90Days },
          technician: { isActive: true, ...companyFilter },
        },
        include: {
          technician: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { expiryDate: "asc" },
        take: 20,
      }),
    ]);

    // Compute days left for expiring certs
    const expiringCertifications = expiringCerts.map(
      (tc: {
        id: string;
        technicianId: string;
        expiryDate: Date | null;
        technician: { firstName: string; lastName: string };
        certification: { name: string };
      }) => {
        const expiry = new Date(tc.expiryDate!);
        const daysLeft = Math.ceil(
          (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          id: tc.id,
          techId: tc.technicianId,
          techName: `${tc.technician.firstName} ${tc.technician.lastName}`,
          certName: tc.certification.name,
          expiryDate: tc.expiryDate,
          daysLeft,
        };
      }
    );

    // Documents qui expirent (medical, habilitation...) -> meme format
    const expiringDocuments = expiringDocs.map(
      (d: {
        id: string;
        title: string;
        category: string;
        expiryDate: Date | null;
        technician: { id: string; firstName: string; lastName: string };
      }) => {
        const daysLeft = Math.ceil(
          (new Date(d.expiryDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          id: d.id,
          techId: d.technician.id,
          techName: `${d.technician.firstName} ${d.technician.lastName}`,
          certName: d.title,
          category: d.category,
          expiryDate: d.expiryDate,
          daysLeft,
        };
      }
    );

    // Liste unifiee "a renouveler" (certifs + documents), triee par echeance
    const renewals = [
      ...expiringCertifications.map((c) => ({ ...c, kind: "cert" as const })),
      ...expiringDocuments.map((d) => ({ ...d, kind: "doc" as const })),
    ].sort((a, b) => a.daysLeft - b.daysLeft);

    // Flatten skill distribution
    const skills = skillDistribution.map(
      (cat: {
        name: string;
        color: string;
        skills: { technicians: { id: string }[] }[];
      }) => ({
        name: cat.name,
        color: cat.color,
        count: cat.skills.reduce(
          (sum: number, s: { technicians: { id: string }[] }) =>
            sum + s.technicians.length,
          0
        ),
      })
    );

    // Format contract distribution
    const contracts = contractDistribution.map(
      (c: { contractType: string; _count: { id: number } }) => ({
        name: c.contractType,
        value: c._count.id,
      })
    );

    // Count expiring within 30 days for the stat card (certifs + documents)
    const expiringSoon = renewals.filter((c) => c.daysLeft <= 30).length;

    return NextResponse.json({
      totalTechnicians,
      totalCompanies,
      activeCertifications,
      expiringSoon,
      expiringCertifications,
      renewals,
      skillDistribution: skills,
      contractDistribution: contracts,
      recentActivity: recentActivity.map(
        (log: {
          id: string;
          action: string;
          entityType: string;
          entityId: string | null;
          details: string | null;
          user: { name: string } | null;
          createdAt: Date;
        }) => ({
          id: log.id,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          details: log.details,
          userName: log.user?.name ?? "Systeme",
          createdAt: log.createdAt,
        })
      ),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Erreur interne" },
      { status: 500 }
    );
  }
}
