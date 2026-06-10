import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";

// Cockpit du dirigeant : effectif, capacite, capital competences, dependances
// critiques (bus factor), priorites de recrutement. Cloisonne par entreprise.
// Admin : filtrable via ?companyId=. Manager : limite a son entreprise.
export async function GET(req: NextRequest) {
  const session = await requireSession();
  const reqCompany = new URL(req.url).searchParams.get("companyId");
  const companyFilter =
    session.role !== "admin"
      ? session.companyId
        ? { companyId: session.companyId }
        : {}
      : reqCompany
        ? { companyId: reqCompany }
        : {};

  const now = new Date();
  const in90 = new Date(now.getTime() + 90 * 86400000);

  const [techs, skills] = await Promise.all([
    prisma.technician.findMany({
      where: { isActive: true, ...companyFilter },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        contractType: true,
        availabilityStatus: true,
        contractEnd: true,
        skills: { select: { level: true, skillId: true } },
        certifications: {
          select: { status: true, expiryDate: true, certification: { select: { category: true } } },
        },
      },
    }),
    prisma.skill.findMany({ select: { id: true, name: true, category: { select: { name: true, color: true } } } }),
  ]);

  const total = techs.length;
  const skillName = new Map(skills.map((s) => [s.id, s]));

  // --- Capital competences ---
  let skillPoints = 0;
  const levels: number[] = [];
  let validCerts = 0;
  let securityHab = 0;
  const covered = new Set<string>();
  for (const t of techs) {
    for (const s of t.skills) {
      skillPoints += s.level;
      if (s.level >= 1) {
        levels.push(s.level);
        covered.add(s.skillId);
      }
    }
    for (const c of t.certifications) {
      const valid = c.status === "active" && (!c.expiryDate || new Date(c.expiryDate) > now);
      if (valid) {
        validCerts++;
        if (c.certification.category === "securite") securityHab++;
      }
    }
  }
  const avgLevel = levels.length ? levels.reduce((a, b) => a + b, 0) / levels.length : 0;

  // --- Capacite (disponibilite) ---
  const capacity = { disponible: 0, en_mission: 0, indisponible: 0 };
  for (const t of techs) {
    const k = t.availabilityStatus as keyof typeof capacity;
    if (k in capacity) capacity[k]++;
    else capacity.disponible++;
  }

  // --- Repartition contrat ---
  const byContract: Record<string, number> = {};
  for (const t of techs) byContract[t.contractType] = (byContract[t.contractType] || 0) + 1;

  // --- Bus factor : competences avancees (>=3) detenues par un seul actif ---
  const holdersAdvanced = new Map<string, { id: string; name: string }[]>();
  const holdersAny = new Map<string, number>();
  for (const t of techs) {
    for (const s of t.skills) {
      if (s.level >= 1) holdersAny.set(s.skillId, (holdersAny.get(s.skillId) || 0) + 1);
      if (s.level >= 3) {
        const arr = holdersAdvanced.get(s.skillId) || [];
        arr.push({ id: t.id, name: `${t.firstName} ${t.lastName}` });
        holdersAdvanced.set(s.skillId, arr);
      }
    }
  }
  const busFactor = [...holdersAdvanced.entries()]
    .filter(([, arr]) => arr.length === 1)
    .map(([skillId, arr]) => {
      const s = skillName.get(skillId);
      return {
        skill: s?.name ?? "?",
        family: s?.category.name ?? "",
        color: s?.category.color ?? "#94A3B8",
        holder: arr[0].name,
        holderId: arr[0].id,
      };
    })
    .sort((a, b) => a.family.localeCompare(b.family))
    .slice(0, 12);

  // --- Recrutement : departs a venir + competences sous-couvertes ---
  const departures = techs
    .filter((t) => t.contractEnd && new Date(t.contractEnd) >= now && new Date(t.contractEnd) <= in90)
    .map((t) => ({ id: t.id, name: `${t.firstName} ${t.lastName}`, date: t.contractEnd }));

  const priorities = skills
    .map((s) => ({
      skill: s.name,
      family: s.category.name,
      color: s.category.color,
      holders: holdersAny.get(s.id) || 0,
    }))
    .filter((s) => s.holders <= Math.max(2, Math.round(total * 0.05)))
    .sort((a, b) => a.holders - b.holders)
    .slice(0, 8);

  return NextResponse.json({
    headcount: { total, byContract },
    capacity,
    capital: {
      skillPoints,
      avgLevel: Math.round(avgLevel * 10) / 10,
      validCerts,
      securityHab,
      coveredSkills: covered.size,
      totalSkills: skills.length,
    },
    busFactor,
    recruitment: { departures, priorities },
  });
}
