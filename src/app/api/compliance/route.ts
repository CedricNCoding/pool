import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { requiredDocsFor } from "@/lib/dossier";

// Conformite & responsabilite : techniciens actifs sans habilitation/visite
// medicale valide (manquante ou expiree) ou avec une certification periimee.
const CRITICAL = ["medical", "habilitation"];
const LABEL: Record<string, string> = { medical: "Visite medicale", habilitation: "Habilitation" };

export async function GET() {
  const session = await requireSession();
  const companyFilter =
    session.role !== "admin" && session.companyId ? { companyId: session.companyId } : {};
  const now = new Date();

  const techs = await prisma.technician.findMany({
    where: { isActive: true, ...companyFilter },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      service: true,
      documents: { select: { category: true, expiryDate: true } },
      certifications: {
        where: { status: "active", expiryDate: { lt: now } },
        select: { certification: { select: { name: true } }, expiryDate: true },
      },
    },
  });

  const items = techs
    .map((t) => {
      const issues: string[] = [];
      const required = requiredDocsFor(t.service).filter((c) => CRITICAL.includes(c));
      for (const cat of required) {
        const docs = t.documents.filter((d) => d.category === cat);
        if (docs.length === 0) {
          issues.push(`${LABEL[cat]} manquante`);
        } else {
          // valide si au moins un doc sans expiration ou non expire
          const hasValid = docs.some((d) => !d.expiryDate || new Date(d.expiryDate) > now);
          if (!hasValid) issues.push(`${LABEL[cat]} expiree`);
        }
      }
      for (const c of t.certifications) {
        issues.push(`${c.certification.name} expiree`);
      }
      return { id: t.id, name: `${t.firstName} ${t.lastName}`, service: t.service, issues };
    })
    .filter((t) => t.issues.length > 0);

  return NextResponse.json({ total: items.length, items });
}
