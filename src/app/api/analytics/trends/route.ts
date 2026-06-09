import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const MONTHS = ["jan", "fev", "mar", "avr", "mai", "juin", "juil", "aout", "sep", "oct", "nov", "dec"];

// Evolution du parc dans le temps : montee en competences, nouveaux techniciens
// (12 derniers mois), certifications expirant (12 prochains mois).
export async function GET() {
  const session = await requireSession();
  const techScope =
    session.role !== "admin" && session.companyId
      ? { companyId: session.companyId }
      : {};

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 12, 1);

  const [history, newTechs, certs] = await Promise.all([
    prisma.technicianSkillHistory.findMany({
      where: { recordedAt: { gte: start }, technician: techScope },
      select: { recordedAt: true },
    }),
    prisma.technician.findMany({
      where: { createdAt: { gte: start }, ...techScope },
      select: { createdAt: true },
    }),
    prisma.technicianCertification.findMany({
      where: { status: "active", expiryDate: { gte: now, lt: end }, technician: techScope },
      select: { expiryDate: true },
    }),
  ]);

  // Fenetre des 12 derniers mois (montee en competences, recrutements)
  const past: { key: string; label: string; skills: number; recrues: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    past.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS[d.getMonth()], skills: 0, recrues: 0 });
  }
  const pastIndex = new Map(past.map((p, i) => [p.key, i]));
  const bucketPast = (date: Date, field: "skills" | "recrues") => {
    const k = `${date.getFullYear()}-${date.getMonth()}`;
    const i = pastIndex.get(k);
    if (i !== undefined) past[i][field]++;
  };
  history.forEach((h) => bucketPast(new Date(h.recordedAt), "skills"));
  newTechs.forEach((t) => bucketPast(new Date(t.createdAt), "recrues"));

  // Fenetre des 12 prochains mois (certifs a renouveler)
  const future: { key: string; label: string; certs: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    future.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTHS[d.getMonth()], certs: 0 });
  }
  const futureIndex = new Map(future.map((p, i) => [p.key, i]));
  certs.forEach((c) => {
    const d = new Date(c.expiryDate!);
    const i = futureIndex.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i !== undefined) future[i].certs++;
  });

  return NextResponse.json({
    past: past.map(({ label, skills, recrues }) => ({ label, skills, recrues })),
    future: future.map(({ label, certs }) => ({ label, certs })),
  });
}
