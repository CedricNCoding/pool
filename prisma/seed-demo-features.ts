/* =============================================================================
 * Praxis — peuplement de DÉMO des fonctions récentes
 *   npx tsx prisma/seed-demo-features.ts
 *
 * Peuple, pour le tenant qui possède déjà les techniciens (Démo) :
 *  - Planning : créneaux (Booking) + absences
 *  - EPI & matériel : équipements (dont outillage) + dotations + VGP + packs
 *  - DUERP : unités de travail + risques
 *  - Sécurité : consignes + accusés
 *  - Compétences/RH : campagne d'évaluation + entretiens
 *  - Aptitudes médicales (restrictions) sur quelques techniciens
 *  - Exigences mission (dossier, client, adresse/géoloc, habilitations/EPI/formations requises)
 *  - Renouvellements d'habilitations (cycle)
 *
 * /!\ Idempotent : vide d'abord ces tables de fonctionnalités (pas les
 *     techniciens / compétences / certifs / référentiel / projets existants).
 * ===========================================================================*/
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const rnd = () => Math.random();
const randInt = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
const chance = (p: number) => rnd() < p;
function sample<T>(arr: readonly T[], n: number): T[] {
  const c = [...arr]; const out: T[] = [];
  while (out.length < n && c.length) out.push(c.splice(Math.floor(rnd() * c.length), 1)[0]);
  return out;
}
const at = (dayOffset: number, h: number, m = 0) => { const d = new Date(now + dayOffset * DAY); d.setHours(h, m, 0, 0); return d; };

const CITIES = [
  { name: "Lyon", lat: 45.764, lng: 4.8357 }, { name: "Paris", lat: 48.8566, lng: 2.3522 },
  { name: "Marseille", lat: 43.2965, lng: 5.3698 }, { name: "Bordeaux", lat: 44.8378, lng: -0.5792 },
  { name: "Lille", lat: 50.6292, lng: 3.0573 }, { name: "Nantes", lat: 47.2184, lng: -1.5536 },
];

async function main() {
  const anyTech = await prisma.technician.findFirst({ select: { tenantId: true } });
  const tenantId = anyTech?.tenantId ?? null;
  console.log("Tenant démo:", tenantId);

  const techs = await prisma.technician.findMany({ where: { tenantId, isActive: true }, select: { id: true, firstName: true, lastName: true, companyId: true } });
  const projects = await prisma.project.findMany({ where: { tenantId }, select: { id: true, title: true } });
  const secuCerts = await prisma.certification.findMany({ where: { tenantId, category: "securite" }, select: { id: true, name: true } });
  const modules = await prisma.trainingModule.findMany({ where: { tenantId }, select: { id: true, title: true } });
  const skills = await prisma.skill.findMany({ where: { tenantId }, select: { id: true } });
  if (techs.length === 0 || projects.length === 0) { console.log("Pas de techniciens/projets — lance d'abord seed-demo."); return; }

  // --- Idempotence : on vide les tables de fonctionnalités ---
  await prisma.$transaction([
    prisma.booking.deleteMany({}), prisma.absence.deleteMany({}),
    prisma.equipmentCheck.deleteMany({}), prisma.equipmentAssignment.deleteMany({}),
    prisma.equipmentPackLine.deleteMany({}), prisma.equipmentPack.deleteMany({}), prisma.equipment.deleteMany({}),
    prisma.riskItem.deleteMany({}), prisma.riskUnit.deleteMany({}),
    prisma.safetyNoticeAck.deleteMany({}), prisma.safetyNotice.deleteMany({}),
    prisma.skillSelfAssessment.deleteMany({}), prisma.skillCampaign.deleteMany({}),
    prisma.interview.deleteMany({}), prisma.interviewTemplate.deleteMany({}),
    prisma.tenderMemoSection.deleteMany({}),
  ]);

  // === PLANNING : créneaux sur 6 semaines (lun-ven) ===
  const bookings: { tenantId: string | null; projectId: string; technicianId: string; start: Date; end: Date; role: string | null; status: string }[] = [];
  const ROLES = ["Régie", "Montage", "Exploitation", "Câblage", "Captation", null];
  const HOURS: [number, number][] = [[8, 12], [9, 17], [13, 18], [8, 17], [14, 22]];
  for (let d = -7; d <= 35; d++) {
    const day = new Date(now + d * DAY);
    const dow = day.getDay();
    if (dow === 0 || dow === 6) continue;
    const count = randInt(6, 16);
    for (let i = 0; i < count; i++) {
      const t = pick(techs); const p = pick(projects); const [h1, h2] = pick(HOURS);
      bookings.push({ tenantId, projectId: p.id, technicianId: t.id, start: at(d, h1), end: at(d, h2), role: pick(ROLES), status: pick(["pressenti", "confirme", "confirme", "confirme"]) });
    }
  }
  await prisma.booking.createMany({ data: bookings });
  console.log(`  ${bookings.length} créneaux`);

  // === ABSENCES ===
  const absences: { tenantId: string | null; technicianId: string; type: string; start: Date | null; end: Date | null; recurringWeekday: number | null; reason: string | null; status: string }[] = [];
  for (const t of sample(techs, 18)) {
    if (chance(0.25)) absences.push({ tenantId, technicianId: t.id, type: "indispo", start: null, end: null, recurringWeekday: pick([3, 5]), reason: "Indisponibilité récurrente", status: "valide" });
    else { const s = randInt(2, 40); absences.push({ tenantId, technicianId: t.id, type: pick(["cp", "cp", "rtt", "maladie"]), start: new Date(now + s * DAY), end: new Date(now + (s + randInt(1, 9)) * DAY), recurringWeekday: null, reason: null, status: pick(["valide", "valide", "demande"]) }); }
  }
  await prisma.absence.createMany({ data: absences });
  console.log(`  ${absences.length} absences`);

  // === EPI & MATÉRIEL ===
  const EQUIP: { category: string; name: string; brand?: string }[] = [
    { category: "epi", name: "Casque de chantier", brand: "Petzl" }, { category: "epi", name: "Harnais antichute", brand: "Petzl" },
    { category: "epi", name: "Gants anti-coupure" }, { category: "epi", name: "Chaussures de sécurité" }, { category: "epi", name: "Casque anti-bruit", brand: "3M" },
    { category: "outillage", name: "Pince multiprise", brand: "Knipex" }, { category: "outillage", name: "Tournevis isolé", brand: "Wera" },
    { category: "outillage", name: "Jeu de clés Allen" }, { category: "outillage", name: "Cutter pro" }, { category: "outillage", name: "Mètre 5 m" },
    { category: "outillage", name: "Pince à dénuder", brand: "Knipex" }, { category: "outillage", name: "Niveau à bulle" },
    { category: "electroportatif", name: "Perceuse-visseuse", brand: "Makita" }, { category: "electroportatif", name: "Perforateur SDS", brand: "Bosch" }, { category: "electroportatif", name: "Meuleuse 125", brand: "Makita" },
    { category: "instrument", name: "Multimètre", brand: "Fluke" }, { category: "instrument", name: "Testeur réseau", brand: "Fluke" }, { category: "instrument", name: "Sonomètre" },
    { category: "vehicule", name: "Utilitaire Trafic", brand: "Renault" }, { category: "vehicule", name: "Camionnette Master", brand: "Renault" },
  ];
  const equipIds: { id: string; category: string }[] = [];
  let serial = 1000;
  for (const e of EQUIP) {
    const qty = e.category === "outillage" || e.category === "epi" ? randInt(2, 4) : 1;
    for (let i = 0; i < qty; i++) {
      const overdueVgp = chance(0.2);
      const rec = await prisma.equipment.create({
        data: {
          tenantId, companyId: pick(techs).companyId, category: e.category, name: e.name, brand: e.brand ?? null,
          serialNumber: `${e.name.slice(0, 3).toUpperCase()}-${serial++}`,
          purchaseDate: new Date(now - randInt(200, 2000) * DAY),
          expiryDate: e.category === "epi" && e.name.includes("Harnais") ? new Date(now + randInt(-60, 1500) * DAY) : null,
          nextCheckDate: ["epi", "electroportatif"].includes(e.category) ? new Date(now + (overdueVgp ? -randInt(5, 40) : randInt(20, 300)) * DAY) : null,
          status: "disponible",
        },
      });
      equipIds.push({ id: rec.id, category: e.category });
    }
  }
  // dotations : ~40% du matériel attribué à un technicien
  for (const eq of equipIds) {
    if (chance(0.4)) {
      const t = pick(techs);
      await prisma.equipmentAssignment.create({ data: { tenantId, equipmentId: eq.id, technicianId: t.id, assignedAt: new Date(now - randInt(5, 120) * DAY) } });
      await prisma.equipment.update({ where: { id: eq.id }, data: { status: "attribue" } });
    }
    if (chance(0.3)) await prisma.equipmentCheck.create({ data: { tenantId, equipmentId: eq.id, date: new Date(now - randInt(10, 200) * DAY), result: pick(["conforme", "conforme", "a_surveiller"]), checkedBy: "APAVE" } });
  }
  console.log(`  ${equipIds.length} équipements (+ dotations & VGP)`);

  // packs
  const PACKS = [
    { name: "Caisse à outils standard", lines: [{ category: "outillage", quantity: 5 }] },
    { name: "Kit travail en hauteur", lines: [{ category: "epi", quantity: 2 }, { category: "outillage", quantity: 2 }] },
    { name: "Pack régie mobile", lines: [{ category: "electroportatif", quantity: 1 }, { category: "outillage", quantity: 3 }, { category: "instrument", quantity: 1 }] },
  ];
  for (const p of PACKS) {
    const pack = await prisma.equipmentPack.create({ data: { tenantId, name: p.name } });
    await prisma.equipmentPackLine.createMany({ data: p.lines.map((l) => ({ tenantId, packId: pack.id, category: l.category, quantity: l.quantity })) });
  }
  console.log(`  ${PACKS.length} packs`);

  // === APTITUDES MÉDICALES (restrictions) ===
  const RESTR = ["hauteur", "charges", "conduite", "vision", "nuit"];
  for (const t of sample(techs, 14)) {
    if (chance(0.15)) await prisma.technician.update({ where: { id: t.id }, data: { medicalAptitude: "inapte_temp", medicalRestrictionUntil: new Date(now + randInt(20, 90) * DAY), medicalRestrictions: sample(RESTR, randInt(1, 2)).join(",") } });
    else await prisma.technician.update({ where: { id: t.id }, data: { medicalAptitude: "apte_restrictions", medicalRestrictions: sample(RESTR, randInt(1, 2)).join(",") } });
  }
  console.log("  aptitudes médicales (restrictions) sur ~14 techniciens");

  // === EXIGENCES MISSION sur quelques projets ===
  for (const p of sample(projects, Math.min(6, projects.length))) {
    const city = pick(CITIES);
    await prisma.project.update({
      where: { id: p.id },
      data: {
        dossierNumber: `DOS-2026-${randInt(100, 999)}`,
        clientName: pick(["Mairie de " + city.name, "Université " + city.name, "Palais des Congrès", "Groupe Hôtelier", "CHU " + city.name]),
        clientContact: pick(["M. Martin", "Mme Dubois", "Service technique", "M. Bernard"]),
        clientPhone: `0${randInt(1, 9)} ${randInt(10, 99)} ${randInt(10, 99)} ${randInt(10, 99)} ${randInt(10, 99)}`,
        clientEmail: "contact@client-demo.fr",
        address: `${randInt(1, 80)} rue de ${city.name}`,
        lat: city.lat, lng: city.lng,
        requiredEpi: sample(["epi", "outillage", "electroportatif"], randInt(1, 2)).join(","),
        ...(secuCerts.length ? { requiredCertifications: { connect: sample(secuCerts, Math.min(2, secuCerts.length)).map((c) => ({ id: c.id })) } } : {}),
        ...(modules.length ? { requiredTrainingModules: { connect: sample(modules, 1).map((m) => ({ id: m.id })) } } : {}),
      },
    });
  }
  console.log("  exigences mission sur 6 projets (dossier, client, adresse, habilitations/EPI/formations)");

  // === RENOUVELLEMENTS d'habilitations (cycle) ===
  const expiring = await prisma.technicianCertification.findMany({ where: { technician: { tenantId }, certification: { category: "securite" }, expiryDate: { not: null } }, select: { id: true }, take: 40 });
  for (const c of expiring) {
    if (chance(0.5)) await prisma.technicianCertification.update({ where: { id: c.id }, data: { renewalStatus: pick(["a_planifier", "a_planifier", "convoque"]), renewalOrganism: chance(0.5) ? "APAVE" : null } });
  }
  console.log("  statuts de renouvellement sur des habilitations");

  // === DUERP ===
  const DUERP: { name: string; items: { danger: string; g: number; p: number; planned: string; status: string }[] }[] = [
    { name: "Travail en hauteur", items: [{ danger: "Chute de hauteur", g: 4, p: 2, planned: "Ligne de vie + harnais vérifié", status: "en_cours" }, { danger: "Chute d'objets", g: 3, p: 2, planned: "Périmètre de sécurité", status: "maitrise" }] },
    { name: "Montage scénique", items: [{ danger: "Écrasement (structures)", g: 4, p: 1, planned: "Procédure de levage", status: "en_cours" }, { danger: "TMS / manutention", g: 2, p: 3, planned: "Aides à la manutention", status: "a_traiter" }] },
    { name: "Régie / électricité", items: [{ danger: "Risque électrique", g: 4, p: 2, planned: "Habilitation + consignation", status: "maitrise" }, { danger: "Bruit", g: 2, p: 3, planned: "EPI auditifs", status: "en_cours" }] },
    { name: "Déplacements", items: [{ danger: "Accident de la route", g: 4, p: 2, planned: "Entretien véhicules + repos", status: "en_cours" }] },
  ];
  for (let i = 0; i < DUERP.length; i++) {
    const u = await prisma.riskUnit.create({ data: { tenantId, name: DUERP[i].name, order: i } });
    await prisma.riskItem.createMany({ data: DUERP[i].items.map((it) => ({ tenantId, riskUnitId: u.id, danger: it.danger, gravity: it.g, probability: it.p, plannedMeasures: it.planned, responsible: "Resp. HSE", status: it.status, dueDate: it.status !== "maitrise" ? new Date(now + randInt(15, 120) * DAY) : null })) });
  }
  console.log(`  DUERP : ${DUERP.length} unités`);

  // === SÉCURITÉ : consignes + accusés ===
  const NOTICES = ["Nouvelle procédure de consignation électrique", "Rappel : port du harnais obligatoire > 2 m", "Mise à jour du plan de prévention", "Canicule : adaptation des horaires"];
  for (const title of NOTICES) {
    const n = await prisma.safetyNotice.create({ data: { tenantId, title, content: "Merci de prendre connaissance de cette consigne et d'en accuser réception.", publishedAt: new Date(now - randInt(2, 40) * DAY) } });
    const dests = sample(techs, randInt(10, 25));
    await prisma.safetyNoticeAck.createMany({ data: dests.map((t) => ({ tenantId, noticeId: n.id, technicianId: t.id, ackAt: chance(0.6) ? new Date(now - randInt(1, 20) * DAY) : null })) });
  }
  console.log(`  ${NOTICES.length} consignes (+ accusés)`);

  // === CAMPAGNE d'évaluation ===
  if (skills.length) {
    const camp = await prisma.skillCampaign.create({ data: { tenantId, name: "Revue annuelle des compétences 2026", status: "ouverte" } });
    const campTechs = sample(techs, 12); const campSkills = sample(skills, 4);
    const assess: { tenantId: string | null; campaignId: string; technicianId: string; skillId: string; proposedLevel: number; status: string; validatedLevel: number | null }[] = [];
    for (const t of campTechs) for (const s of campSkills) {
      const done = chance(0.45);
      assess.push({ tenantId, campaignId: camp.id, technicianId: t.id, skillId: s.id, proposedLevel: randInt(1, 4), status: done ? pick(["valide", "ajuste"]) : "propose", validatedLevel: done ? randInt(2, 5) : null });
    }
    await prisma.skillSelfAssessment.createMany({ data: assess });
    console.log(`  1 campagne (${assess.length} évaluations)`);
  }

  // === ENTRETIENS ===
  const tpl = await prisma.interviewTemplate.create({ data: { tenantId, name: "Entretien annuel", sections: JSON.stringify([{ title: "Entretien annuel", questions: ["Bilan de la période écoulée", "Points forts et axes de progrès", "Compétences à développer", "Souhaits d'évolution", "Besoins de formation"] }]) } });
  const ivs: { tenantId: string | null; technicianId: string; templateId: string; date: Date; status: string; signedAt: Date | null }[] = [];
  for (const t of sample(techs, 10)) {
    const st = pick(["planifie", "planifie", "tenu", "signe"]);
    ivs.push({ tenantId, technicianId: t.id, templateId: tpl.id, date: new Date(now + randInt(-60, 40) * DAY), status: st, signedAt: st === "signe" ? new Date(now - randInt(1, 30) * DAY) : null });
  }
  await prisma.interview.createMany({ data: ivs });
  console.log(`  ${ivs.length} entretiens`);

  // === MÉMOIRE TECHNIQUE : chapitres ===
  await prisma.tenderMemoSection.createMany({
    data: [
      { tenantId, title: "Organisation et encadrement", content: "Notre équipe est structurée autour de chefs de projet expérimentés encadrant des techniciens qualifiés, avec une astreinte assurée pour la continuité de service.", order: 0 },
      { tenantId, title: "Démarche qualité et sécurité", content: "Nous appliquons un plan de prévention par chantier, un DUERP tenu à jour, des causeries sécurité régulières et un suivi rigoureux des habilitations et EPI.", order: 1 },
      { tenantId, title: "Moyens matériels", content: "Parc d'équipements régulièrement vérifié (VGP), outillage et matériel électroportatif tracés par numéro de série.", order: 2 },
    ],
  });
  console.log("  3 chapitres de mémoire technique");

  console.log("Seed démo des fonctions terminé.");
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
