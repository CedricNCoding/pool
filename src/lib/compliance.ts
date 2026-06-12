import { prisma } from "./db";

// Conformité réglementaire d'un technicien : visite médicale du travail à jour
// + habilitations (catégorie « securite ») non expirées. Sert à l'affichage et
// au BLOCAGE de l'affectation à une mission.

export interface ComplianceTech {
  medicalVisitDate: Date | string | null;
  medicalVisitPeriodicityMonths: number | null;
  certifications?: {
    status: string;
    expiryDate: Date | string | null;
    certification: { name: string; category?: string | null };
  }[];
}

// Prochaine échéance de visite médicale = dernière visite + périodicité (mois).
export function nextMedicalVisit(t: {
  medicalVisitDate: Date | string | null;
  medicalVisitPeriodicityMonths: number | null;
}): Date | null {
  if (!t.medicalVisitDate) return null;
  const d = new Date(t.medicalVisitDate);
  d.setMonth(d.getMonth() + (t.medicalVisitPeriodicityMonths || 24));
  return d;
}

const DAY = 24 * 60 * 60 * 1000;

// blocking = empêche l'affectation ; warnings = signalé mais non bloquant.
export function technicianCompliance(t: ComplianceTech, now = new Date()): {
  blocking: string[];
  warnings: string[];
  ok: boolean;
} {
  const blocking: string[] = [];
  const warnings: string[] = [];
  const t0 = now.getTime();

  const due = nextMedicalVisit(t);
  if (due) {
    if (due.getTime() < t0) blocking.push("Visite médicale dépassée");
    else if (due.getTime() < t0 + 60 * DAY) warnings.push("Visite médicale à renouveler (< 60 j)");
  } else {
    warnings.push("Visite médicale non renseignée");
  }

  for (const c of t.certifications ?? []) {
    if (c.status === "revoked" || !c.expiryDate) continue;
    if (new Date(c.expiryDate).getTime() < t0) {
      // Habilitation/sécurité expirée = bloquant ; autre certif expirée = avertissement.
      if (c.certification.category === "securite") {
        blocking.push(`${c.certification.name} (habilitation) expirée`);
      } else {
        warnings.push(`${c.certification.name} expirée`);
      }
    }
  }

  return { blocking, warnings, ok: blocking.length === 0 };
}

// Parmi un ensemble de techniciens (par id, dans le tenant courant), renvoie
// ceux qui ont des problèmes BLOQUANTS. force=true court-circuite (override admin).
export async function blockingTechnicians(
  ids: string[],
  force = false
): Promise<{ id: string; name: string; issues: string[] }[]> {
  if (force || ids.length === 0) return [];
  const techs = await prisma.technician.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      medicalVisitDate: true,
      medicalVisitPeriodicityMonths: true,
      certifications: {
        where: { status: "active" },
        select: { status: true, expiryDate: true, certification: { select: { name: true, category: true } } },
      },
    },
  });
  return techs
    .map((t) => ({ id: t.id, name: `${t.firstName} ${t.lastName}`, issues: technicianCompliance(t).blocking }))
    .filter((t) => t.issues.length > 0);
}
