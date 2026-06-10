/* =============================================================================
 * AV Pool — peuplement de DEMONSTRATION (complement)
 *
 *   npx tsx prisma/seed-demo-extra.ts
 *
 * A lancer APRES prisma/seed-demo.ts. Peuple tout ce qui a ete construit ensuite :
 * formations (modules + parcours + affectations proposees/en cours/validees),
 * documents (coffre-fort, avec echeances), etiquettes, projets (kanban),
 * journal d'evenements, disponibilites, fins de contrat et objectifs.
 *
 * /!\ REMPLACE ces donnees de demo (vide d'abord modules, affectations,
 *     documents, etiquettes, projets, evenements, objectifs). Ne touche pas aux
 *     techniciens / competences / certifications / referentiel.
 * ===========================================================================*/
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { randomUUID } from "node:crypto";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const rnd = () => Math.random();
const randInt = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
const chance = (p: number) => rnd() < p;
function sample<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
  return out;
}
const dPast = (maxDays: number) => new Date(now - randInt(1, maxDays) * DAY);
const dFuture = (minDays: number, maxDays: number) => new Date(now + randInt(minDays, maxDays) * DAY);

// --- Catalogue de modules de formation -------------------------------------
const MODULES: { title: string; hours: number; cost: number; skills: string[] }[] = [
  { title: "Dante niveau 2 - audio sur IP", hours: 14, cost: 1200, skills: ["Dante", "Reseau", "AES67"] },
  { title: "Perfectionnement audio - DSP & calibration", hours: 21, cost: 1150, skills: ["Mixage", "Sonorisation", "Acoustique"] },
  { title: "Crestron - programmation avancee", hours: 35, cost: 1800, skills: ["Crestron", "Programmation", "Controle"] },
  { title: "Q-SYS niveau 2 - scripting Lua", hours: 21, cost: 1400, skills: ["Q-SYS", "Controle", "Programmation"] },
  { title: "Eclairage scenique - consoles", hours: 14, cost: 950, skills: ["Eclairage", "Consoles", "DMX"] },
  { title: "Visioconference - Teams Rooms & Zoom", hours: 7, cost: 800, skills: ["Teams", "Zoom", "Visio"] },
  { title: "Reseaux IT pour l'AV", hours: 14, cost: 1100, skills: ["Reseau", "Switching", "Infrastructure"] },
  { title: "Habilitation electrique B1/B2 (recyclage)", hours: 14, cost: 600, skills: [] },
  { title: "Travail en hauteur & port du harnais", hours: 7, cost: 450, skills: [] },
  { title: "Gestion de projet AV", hours: 21, cost: 1300, skills: ["Conception", "Gestion", "Coordination"] },
  { title: "Extron - Global Configurator", hours: 14, cost: 1050, skills: ["Extron", "Controle"] },
  { title: "Video sur IP - NDI & SDVoE", hours: 14, cost: 1250, skills: ["Video", "Streaming", "Switching"] },
];

const PATHS = [
  { title: "Parcours Ingenieur son", modules: ["Dante niveau 2 - audio sur IP", "Perfectionnement audio - DSP & calibration"] },
  { title: "Parcours Integrateur controle", modules: ["Crestron - programmation avancee", "Q-SYS niveau 2 - scripting Lua", "Extron - Global Configurator"] },
  { title: "Parcours Securite chantier", modules: ["Habilitation electrique B1/B2 (recyclage)", "Travail en hauteur & port du harnais"] },
];

const TAGS = [
  "vehicule", "permis B", "permis poids lourd", "anglais courant", "espagnol",
  "habilite hauteur", "CACES nacelle", "astreinte", "mobile national", "premiers secours",
  "permis cariste", "disponible week-end",
];

const PROJECTS = [
  "Salon Pro AV Paris 2026", "Conference annuelle - siege client", "Festival Les Nuits Sonores",
  "Installation auditorium universite", "Tournee theatre national", "Showroom flagship Lyon",
  "Convention groupe BNP", "Concert salle Pleyel", "Seminaire direction Deauville",
  "Mariage chateau Bordeaux", "Lancement produit automobile", "Gala caritatif Monaco",
];
const PROJECT_STATUS = ["actif", "actif", "actif", "termine", "termine", "archive"];

const EVENT_TYPES = ["entretien", "evaluation", "note", "incident"];
const EVENT_TITLES: Record<string, string[]> = {
  entretien: ["Entretien annuel 2025", "Entretien professionnel", "Point carriere"],
  evaluation: ["Evaluation mi-parcours", "Evaluation apres mission", "Bilan de competences"],
  note: ["Souhait de mobilite geographique", "Interesse par la formation Dante", "Disponible pour astreintes"],
  incident: ["Retard signale sur chantier", "Materiel endommage - rapport", "Conflit client resolu"],
};

async function main() {
  console.log("== Peuplement complementaire (formations, documents, etiquettes, projets...) ==");

  // 0) Nettoyage des donnees de demo precedemment generees
  await prisma.trainingAssignment.deleteMany({});
  await prisma.trainingPathModule.deleteMany({});
  await prisma.trainingPath.deleteMany({});
  await prisma.trainingModule.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.technicianEvent.deleteMany({});
  await prisma.skillObjective.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.tag.deleteMany({});

  const techs = await prisma.technician.findMany({
    where: { isActive: true },
    select: { id: true, companyId: true, service: true, contractType: true },
  });
  const skills = await prisma.skill.findMany({ select: { id: true, name: true } });
  const findSkillIds = (keywords: string[]) =>
    skills
      .filter((s) => keywords.some((k) => s.name.toLowerCase().includes(k.toLowerCase())))
      .map((s) => s.id);

  // 1) Modules de formation
  const moduleByTitle = new Map<string, string>();
  for (const m of MODULES) {
    let targetIds = findSkillIds(m.skills);
    if (targetIds.length === 0) targetIds = sample(skills, 2).map((s) => s.id);
    targetIds = targetIds.slice(0, 3);
    const created = await prisma.trainingModule.create({
      data: {
        title: m.title,
        description: `Module de formation : ${m.title}.`,
        durationHours: m.hours,
        cost: m.cost,
        targetSkills: { connect: targetIds.map((id) => ({ id })) },
      },
    });
    moduleByTitle.set(m.title, created.id);
  }
  console.log(`  ${MODULES.length} modules crees (avec cout et competences cibles)`);

  // 2) Parcours
  for (const p of PATHS) {
    const path = await prisma.trainingPath.create({ data: { title: p.title, description: `${p.title}.` } });
    let order = 0;
    for (const t of p.modules) {
      const mid = moduleByTitle.get(t);
      if (mid) await prisma.trainingPathModule.create({ data: { pathId: path.id, moduleId: mid, order: order++ } });
    }
  }
  console.log(`  ${PATHS.length} parcours crees`);

  // 3) Affectations (proposees / en cours / validees)
  const moduleIds = [...moduleByTitle.values()];
  const assignmentsData: { technicianId: string; moduleId: string; status: string; validatedAt: Date | null; createdAt: Date }[] = [];
  const seen = new Set<string>();
  for (const t of techs) {
    if (!chance(0.55)) continue; // ~55% des techs ont au moins une formation
    const nb = randInt(1, 3);
    for (const mid of sample(moduleIds, nb)) {
      const key = `${t.id}:${mid}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const r = rnd();
      const status = r < 0.45 ? "valide" : r < 0.7 ? "en_cours" : "propose";
      assignmentsData.push({
        technicianId: t.id,
        moduleId: mid,
        status,
        validatedAt: status === "valide" ? dPast(330) : null,
        createdAt: dPast(360),
      });
    }
  }
  await prisma.trainingAssignment.createMany({ data: assignmentsData });
  const valid = assignmentsData.filter((a) => a.status === "valide").length;
  const enc = assignmentsData.filter((a) => a.status === "en_cours").length;
  console.log(`  ${assignmentsData.length} affectations (${valid} validees, ${enc} en cours)`);

  // 4) Documents (coffre-fort) — contrat, identite, visite medicale, habilitation
  const docs: {
    technicianId: string; category: string; title: string; fileName: string; originalName: string;
    mimeType: string; size: number; expiryDate: Date | null; createdAt: Date;
  }[] = [];
  const addDoc = (techId: string, category: string, title: string, expiry: Date | null) => {
    docs.push({
      technicianId: techId, category, title,
      fileName: `${randomUUID()}.pdf`, originalName: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.pdf`,
      mimeType: "application/pdf", size: randInt(80_000, 900_000), expiryDate: expiry, createdAt: dPast(700),
    });
  };
  let medicalMissing = 0;
  for (const t of techs) {
    if (chance(0.95)) addDoc(t.id, "contrat", "Contrat de travail signe", null);
    if (chance(0.92)) addDoc(t.id, "identite", "Piece d'identite", dFuture(200, 2500));
    // visite medicale : 80% presente (dont certaines expirees/proches), 20% manquante
    if (chance(0.8)) {
      const r = rnd();
      const exp = r < 0.12 ? dPast(120) : r < 0.3 ? dFuture(1, 80) : dFuture(120, 760);
      addDoc(t.id, "medical", "Visite medicale d'aptitude", exp);
    } else medicalMissing++;
    // habilitation : tous les electriciens + ~25% des autres
    if (t.service === "electricien" || chance(0.25)) {
      const r = rnd();
      const exp = r < 0.15 ? dPast(90) : dFuture(60, 1080);
      addDoc(t.id, "habilitation", "Habilitation electrique", exp);
    }
    if (chance(0.2)) addDoc(t.id, "diplome", "Diplome / attestation de formation", null);
  }
  await prisma.document.createMany({ data: docs });
  console.log(`  ${docs.length} documents (dont ${medicalMissing} techs sans visite medicale)`);

  // 5) Etiquettes
  await prisma.tag.createMany({ data: TAGS.map((name) => ({ name })) });
  const tagRows = await prisma.tag.findMany({ select: { id: true, name: true } });
  let tagLinks = 0;
  for (const t of techs) {
    const n = randInt(0, 4);
    if (n === 0) continue;
    const chosen = sample(tagRows, n);
    tagLinks += chosen.length;
    await prisma.technician.update({
      where: { id: t.id },
      data: { tags: { connect: chosen.map((tg) => ({ id: tg.id })) } },
    });
  }
  console.log(`  ${tagRows.length} etiquettes, ${tagLinks} associations`);

  // 6) Disponibilites (distribution) + fins de contrat proches
  const ids = techs.map((t) => t.id);
  const enMission = sample(ids, Math.round(ids.length * 0.18));
  const rest = ids.filter((i) => !enMission.includes(i));
  const indispo = sample(rest, Math.round(ids.length * 0.08));
  await prisma.technician.updateMany({ where: { id: { in: ids } }, data: { availabilityStatus: "disponible", availableUntil: null } });
  await prisma.technician.updateMany({ where: { id: { in: enMission } }, data: { availabilityStatus: "en_mission", availableUntil: dFuture(5, 60) } });
  await prisma.technician.updateMany({ where: { id: { in: indispo } }, data: { availabilityStatus: "indisponible", availableUntil: dFuture(10, 45) } });

  const precaire = techs.filter((t) => t.contractType === "interim" || t.contractType === "CDD").map((t) => t.id);
  const ending = sample(precaire, Math.min(10, precaire.length));
  for (const id of ending) {
    await prisma.technician.update({ where: { id }, data: { contractEnd: dFuture(10, 88) } });
  }
  console.log(`  disponibilites: ${enMission.length} en mission, ${indispo.length} indispo | ${ending.length} fins de contrat <90j`);

  // 7) Journal d'evenements
  const events: { technicianId: string; type: string; title: string; body: string | null; date: Date; createdAt: Date }[] = [];
  for (const t of techs) {
    if (!chance(0.35)) continue;
    for (let i = 0; i < randInt(1, 2); i++) {
      const type = pick(EVENT_TYPES);
      events.push({
        technicianId: t.id, type, title: pick(EVENT_TITLES[type]),
        body: chance(0.5) ? "Note de suivi consignee lors de la demonstration." : null,
        date: dPast(500), createdAt: dPast(500),
      });
    }
  }
  await prisma.technicianEvent.createMany({ data: events });
  console.log(`  ${events.length} evenements de journal`);

  // 8) Projets (kanban) — cloisonnes par entreprise
  const byCompany = new Map<string, string[]>();
  for (const t of techs) {
    const arr = byCompany.get(t.companyId) || [];
    arr.push(t.id);
    byCompany.set(t.companyId, arr);
  }
  const companies = [...byCompany.keys()];
  let projCount = 0;
  for (let i = 0; i < PROJECTS.length; i++) {
    const companyId = pick(companies);
    const members = sample(byCompany.get(companyId) || [], randInt(3, 6));
    if (members.length === 0) continue;
    await prisma.project.create({
      data: {
        title: PROJECTS[i],
        description: "Equipe constituee pour la demonstration.",
        status: pick(PROJECT_STATUS),
        companyId,
        technicians: { connect: members.map((id) => ({ id })) },
      },
    });
    projCount++;
  }
  console.log(`  ${projCount} projets (actif / termine / archive)`);

  // 9) Objectifs de montee en competences
  const obj = (label: string, kw: string[], minLevel: number, targetPercent: number, days: number) => {
    const ids2 = findSkillIds(kw);
    return { label, skillId: ids2[0] ?? null, minLevel, targetPercent, deadline: dFuture(days, days), createdAt: new Date(now) };
  };
  await prisma.skillObjective.createMany({
    data: [
      obj("70% des techniciens niveau 3+ en reseau Dante", ["Dante", "Reseau"], 3, 70, 200),
      obj("Generaliser la maitrise du mixage (niveau 4+)", ["Mixage"], 4, 50, 300),
      obj("60% des techs niveau 3+ en visioconference", ["Visio", "Teams"], 3, 60, 240),
      obj("Monter en competence sur le controle Crestron", ["Crestron", "Controle"], 3, 40, 365),
    ],
  });
  console.log("  4 objectifs de competences");

  console.log("Termine. Rafraichis l'application — Direction, Formation, Projets, conformite sont peuples.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Erreur seed-demo-extra:", e);
    process.exit(1);
  });
