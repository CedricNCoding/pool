import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { requiredDocsFor } from "@/lib/dossier";

// Centre de notifications : agrege les signaux d'attention (echeances, validations,
// dossiers incomplets, fins de contrat) en une liste triee par urgence.
export async function GET() {
  const session = await requireSession();
  const techWhere =
    session.role !== "admin" && session.companyId
      ? { isActive: true, companyId: session.companyId }
      : { isActive: true };

  const now = new Date();
  const in60 = new Date(now.getTime() + 60 * 86400000);
  const days = (d: Date) => Math.ceil((d.getTime() - now.getTime()) / 86400000);

  const [certs, docs, validations, techsForDossier, endingContracts] = await Promise.all([
    prisma.technicianCertification.findMany({
      where: { status: "active", expiryDate: { gte: now, lte: in60 }, technician: techWhere },
      include: {
        technician: { select: { id: true, firstName: true, lastName: true } },
        certification: { select: { name: true } },
      },
      orderBy: { expiryDate: "asc" },
      take: 30,
    }),
    prisma.document.findMany({
      where: { expiryDate: { gte: now, lte: in60 }, technician: techWhere },
      include: { technician: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { expiryDate: "asc" },
      take: 30,
    }),
    prisma.trainingAssignment.findMany({
      where: { status: "en_cours", technician: techWhere },
      include: {
        technician: { select: { id: true, firstName: true, lastName: true } },
        module: { select: { title: true } },
        path: { select: { title: true } },
      },
      take: 30,
    }),
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
    prisma.technician.findMany({
      where: { ...techWhere, contractEnd: { gte: now, lte: in60 } },
      select: { id: true, firstName: true, lastName: true, contractEnd: true },
      orderBy: { contractEnd: "asc" },
      take: 30,
    }),
  ]);

  type Item = { id: string; kind: string; label: string; sub: string; href: string; days: number };
  const items: Item[] = [];

  for (const c of certs) {
    const d = days(new Date(c.expiryDate!));
    items.push({
      id: `cert-${c.id}`,
      kind: "cert",
      label: `${c.certification.name} — ${c.technician.firstName} ${c.technician.lastName}`,
      sub: `Certification expire dans ${d} j`,
      href: `/technicians/${c.technician.id}`,
      days: d,
    });
  }
  for (const doc of docs) {
    const d = days(new Date(doc.expiryDate!));
    items.push({
      id: `doc-${doc.id}`,
      kind: "doc",
      label: `${doc.title} — ${doc.technician.firstName} ${doc.technician.lastName}`,
      sub: `Document expire dans ${d} j`,
      href: `/technicians/${doc.technician.id}`,
      days: d,
    });
  }
  for (const v of validations) {
    items.push({
      id: `val-${v.id}`,
      kind: "validation",
      label: `${v.module?.title || v.path?.title || "Formation"} — ${v.technician.firstName} ${v.technician.lastName}`,
      sub: "Formation a valider",
      href: `/formation`,
      days: 0,
    });
  }
  for (const t of endingContracts) {
    const d = days(new Date(t.contractEnd!));
    items.push({
      id: `contract-${t.id}`,
      kind: "contract",
      label: `${t.firstName} ${t.lastName}`,
      sub: `Fin de contrat dans ${d} j`,
      href: `/technicians/${t.id}`,
      days: d,
    });
  }
  for (const t of techsForDossier) {
    const present = [...new Set(t.documents.map((d) => d.category))];
    const missing = requiredDocsFor(t.service).filter((r) => !present.includes(r));
    if (missing.length > 0) {
      items.push({
        id: `dossier-${t.id}`,
        kind: "dossier",
        label: `${t.firstName} ${t.lastName}`,
        sub: `Dossier incomplet (${missing.length} doc.)`,
        href: `/technicians/${t.id}`,
        days: 500,
      });
    }
  }

  items.sort((a, b) => a.days - b.days);

  return NextResponse.json({ total: items.length, items: items.slice(0, 40) });
}
