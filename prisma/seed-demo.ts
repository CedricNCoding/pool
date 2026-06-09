/* =============================================================================
 * AV Pool — peuplement de DEMONSTRATION
 *
 *   npx tsx prisma/seed-demo.ts            (par defaut : 200 techniciens)
 *   COUNT=300 npx tsx prisma/seed-demo.ts  (nombre personnalise)
 *
 * Genere 8 entreprises (siege + agences dans d'autres regions), N techniciens
 * fictifs (tous services / contrats / niveaux), leurs competences et des
 * certifications avec expirations echelonnees (certaines proches, certaines
 * depassees) pour que le dashboard soit parlant.
 *
 * /!\ REMPLACE les donnees de demo : supprime techniciens, agences et
 *     entreprises existants. Ne touche pas au referentiel (competences,
 *     certifications) ni au compte admin. A lancer APRES le seed principal.
 * ===========================================================================*/
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

const COUNT = parseInt(process.env.COUNT || "200", 10);
const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

// --- RNG helpers -----------------------------------------------------------
const rnd = () => Math.random();
const randInt = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
const chance = (p: number) => rnd() < p;
function sample<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
  }
  return out;
}
const jitter = (v: number, amp = 0.08) => v + (rnd() - 0.5) * 2 * amp;
const daysAgo = (d: number) => new Date(now - d * DAY);
const daysAhead = (d: number) => new Date(now + d * DAY);
function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[^\x00-\x7f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

// --- Donnees de reference --------------------------------------------------
const FIRST_NAMES = [
  "Thomas", "Julien", "Nicolas", "Alexandre", "Maxime", "Antoine", "Pierre",
  "Lucas", "Hugo", "Romain", "Mathieu", "Clement", "Florian", "Sebastien",
  "Quentin", "Vincent", "Guillaume", "Damien", "Cedric", "Fabien", "Kevin",
  "Sophie", "Marie", "Camille", "Laura", "Julie", "Manon", "Emma", "Chloe",
  "Sarah", "Pauline", "Lea", "Audrey", "Marine", "Aurelie", "Elodie", "Celine",
  "Nadia", "Karim", "Mehdi", "Yanis", "Samuel", "Adrien", "Benjamin", "Gauthier",
  "Tristan", "Loic", "Olivier", "Bruno", "Franck",
];
const LAST_NAMES = [
  "Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Petit",
  "Durand", "Leroy", "Moreau", "Simon", "Laurent", "Lefebvre", "Michel",
  "Garcia", "David", "Bertrand", "Roux", "Vincent", "Fournier", "Morel",
  "Girard", "Andre", "Lefevre", "Mercier", "Dupont", "Lambert", "Bonnet",
  "Francois", "Martinez", "Legrand", "Garnier", "Faure", "Rousseau", "Blanc",
  "Guerin", "Muller", "Henry", "Roussel", "Nicolas", "Perrin", "Morin",
  "Mathieu", "Clement", "Gauthier", "Dumont", "Lopez", "Fontaine", "Chevalier",
  "Robin",
];

// Villes francaises : [lat, lng, prefixe code postal]
const CITY: Record<string, [number, number, string]> = {
  Paris: [48.8566, 2.3522, "75002"],
  Lyon: [45.764, 4.8357, "69003"],
  Marseille: [43.2965, 5.3698, "13001"],
  Toulouse: [43.6047, 1.4442, "31000"],
  Nice: [43.7102, 7.262, "06000"],
  Nantes: [47.2184, -1.5536, "44000"],
  Strasbourg: [48.5734, 7.7521, "67000"],
  Montpellier: [43.6108, 3.8767, "34000"],
  Bordeaux: [44.8378, -0.5792, "33000"],
  Lille: [50.6292, 3.0573, "59000"],
  Rennes: [48.1173, -1.6778, "35000"],
  Reims: [49.2583, 4.0317, "51100"],
  Dijon: [47.322, 5.0415, "21000"],
  Grenoble: [45.1885, 5.7245, "38000"],
  Angers: [47.4784, -0.5632, "49000"],
  Nancy: [48.6921, 6.1844, "54000"],
};

// 8 entreprises : siege (HQ) dans une region, agences dans d'autres.
const COMPANIES = [
  { name: "AV Concept", color: "#3B82F6", hq: "Paris", agencies: ["Lyon", "Marseille"] },
  { name: "SonoLight Pro", color: "#10B981", hq: "Lyon", agencies: ["Toulouse", "Nantes"] },
  { name: "Scene & Lumiere", color: "#F59E0B", hq: "Bordeaux", agencies: ["Toulouse", "Rennes"] },
  { name: "MediaTech Solutions", color: "#8B5CF6", hq: "Lille", agencies: ["Paris", "Strasbourg"] },
  { name: "ImageSon", color: "#EC4899", hq: "Marseille", agencies: ["Nice", "Montpellier"] },
  { name: "Pro Audio Systems", color: "#06B6D4", hq: "Toulouse", agencies: ["Montpellier", "Grenoble"] },
  { name: "EventTech", color: "#EF4444", hq: "Nantes", agencies: ["Rennes", "Angers"] },
  { name: "Cite Audiovisuel", color: "#6366F1", hq: "Strasbourg", agencies: ["Dijon", "Nancy", "Reims"] },
];

const SERVICES = [
  "tech", "tech", "tech", "installateur", "installateur", "BE", "electricien",
  "chef_projet", "regisseur", "pupitreur", "cadreur", "monteur", "ingenieur_son",
  "ingenieur_lumiere", "directeur_technique", "programmeur", "support",
];
const CONTRACTS = ["CDI", "CDI", "CDI", "CDI", "CDI", "CDD", "CDD", "interim", "interim", "freelance"];
const RADII = [30, 50, 50, 75, 100, 150];

function phone(): string {
  const lead = pick(["6", "7", "1", "3", "4"]);
  const g = () => String(randInt(0, 99)).padStart(2, "0");
  return `+33 ${lead} ${g()} ${g()} ${g()} ${g()}`;
}

function siret(): string {
  let s = "";
  for (let i = 0; i < 14; i++) s += randInt(0, 9);
  return s;
}

// Dates de certif : obtenue/expiration, avec part de "bientot" et "depassee".
function certDates(validityMonths: number | null): {
  obtained: Date;
  expiry: Date | null;
} {
  if (!validityMonths) {
    return { obtained: daysAgo(randInt(60, 1500)), expiry: null };
  }
  const vDays = validityMonths * 30;
  const roll = rnd();
  if (roll < 0.16) {
    // expire bientot (3 a 85 jours)
    const soon = randInt(3, 85);
    return { obtained: daysAgo(vDays - soon), expiry: daysAhead(soon) };
  }
  if (roll < 0.28) {
    // deja depassee (5 a 160 jours)
    const over = randInt(5, 160);
    return { obtained: daysAgo(vDays + over), expiry: daysAgo(over) };
  }
  // saine : obtenue il y a peu, expiration confortablement future
  const maxAge = Math.max(40, vDays - 130);
  const age = randInt(20, maxAge);
  return { obtained: daysAgo(age), expiry: daysAhead(vDays - age) };
}

async function main() {
  console.log(`Peuplement de demonstration (${COUNT} techniciens)...`);

  const skills = await prisma.skill.findMany({ select: { id: true } });
  const certs = await prisma.certification.findMany({
    select: { id: true, issuer: true, validityMonths: true },
  });
  if (skills.length === 0 || certs.length === 0) {
    throw new Error(
      "Referentiel vide : lance d'abord le seed principal (npx tsx prisma/seed.ts)."
    );
  }

  // --- Reset des donnees de demo ------------------------------------------
  console.log("  Nettoyage des donnees existantes...");
  await prisma.technicianCertification.deleteMany();
  await prisma.technicianSkill.deleteMany();
  await prisma.technician.deleteMany();
  await prisma.agency.deleteMany();
  await prisma.company.deleteMany();

  // --- Entreprises + agences ----------------------------------------------
  type Posting = { agencyId: string | null; lat: number; lng: number; city: string };
  const companyPostings: { companyId: string; color: string; domain: string; postings: Posting[] }[] = [];

  for (const c of COMPANIES) {
    const [hqLat, hqLng, hqCp] = CITY[c.hq];
    const domain = `${slug(c.name)}.fr`;
    const company = await prisma.company.create({
      data: {
        name: c.name,
        siret: siret(),
        address: `${randInt(1, 120)} ${pick(["rue", "avenue", "boulevard"])} ${pick(["des Arts", "de la Republique", "Victor Hugo", "Jean Jaures", "de l'Industrie", "Gambetta"])}`,
        city: c.hq,
        postalCode: hqCp,
        country: "France",
        lat: hqLat,
        lng: hqLng,
        phone: phone(),
        email: `contact@${domain}`,
        color: c.color,
      },
    });

    const postings: Posting[] = [
      { agencyId: null, lat: hqLat, lng: hqLng, city: c.hq }, // siege social
    ];

    for (const aCity of c.agencies) {
      const [aLat, aLng, aCp] = CITY[aCity];
      const agency = await prisma.agency.create({
        data: {
          companyId: company.id,
          name: `Agence ${aCity}`,
          address: `${randInt(1, 120)} ${pick(["rue", "avenue"])} ${pick(["du Commerce", "de la Gare", "Pasteur", "Carnot"])}`,
          city: aCity,
          postalCode: aCp,
          country: "France",
          lat: aLat,
          lng: aLng,
          phone: phone(),
        },
      });
      postings.push({ agencyId: agency.id, lat: aLat, lng: aLng, city: aCity });
    }

    companyPostings.push({ companyId: company.id, color: c.color, domain, postings });
  }
  console.log(`  ${COMPANIES.length} entreprises + ${companyPostings.reduce((n, c) => n + c.postings.length - 1, 0)} agences crees`);

  // --- Techniciens ---------------------------------------------------------
  const usedEmails = new Set<string>();
  let skillRows = 0;
  let certRows = 0;
  let soonCount = 0;
  let inactiveCount = 0;
  let histRows = 0;
  const levelTally = [0, 0, 0, 0, 0];

  for (let i = 0; i < COUNT; i++) {
    const comp = companyPostings[i % companyPostings.length];
    const post = pick(comp.postings);

    const firstName = pick(FIRST_NAMES);
    const lastName = pick(LAST_NAMES);
    let email = `${slug(firstName)}.${slug(lastName)}@${comp.domain}`;
    if (usedEmails.has(email)) email = `${slug(firstName)}.${slug(lastName)}${i}@${comp.domain}`;
    usedEmails.add(email);

    const contractType = pick(CONTRACTS);
    const contractStart = daysAgo(randInt(120, 15 * 365));
    let contractEnd: Date | null = null;
    if (contractType !== "CDI") {
      contractEnd = new Date(contractStart.getTime() + randInt(6, 30) * 30 * DAY);
    }

    // ~8% de fiches inactives (depart) -> alimente le widget RGPD
    const isActive = !chance(0.08);
    let departureDate: Date | null = null;
    let scheduledDeletionDate: Date | null = null;
    if (!isActive) {
      inactiveCount++;
      departureDate = daysAgo(randInt(15, 330));
      scheduledDeletionDate = new Date(departureDate.getTime() + 365 * DAY);
      contractEnd = departureDate;
    }

    // Niveau "seniorite" du technicien -> ses competences gravitent autour
    // (echelle 0 a 5 ; ~5% a 0 = Aucune).
    const seniority = randInt(1, 5);
    const skillCount = randInt(5, 16);
    const chosenSkills = sample(skills, Math.min(skillCount, skills.length));
    const skillData: { skillId: string; level: number }[] = [];
    const historyData: { skillId: string; level: number; recordedAt: Date }[] = [];
    for (const s of chosenSkills) {
      const level = chance(0.05)
        ? 0
        : Math.min(5, Math.max(1, seniority + randInt(-1, 1)));
      if (level >= 1) levelTally[level - 1]++;
      skillRows++;
      skillData.push({ skillId: s.id, level });

      // Historique : progression retroactive jusqu'au niveau courant
      if (level >= 1) {
        const steps = randInt(1, 3);
        for (let k = 0; k < steps; k++) {
          const lvl = Math.max(1, level - (steps - 1 - k));
          historyData.push({
            skillId: s.id,
            level: lvl,
            recordedAt: daysAgo((steps - k) * randInt(150, 320)),
          });
          histRows++;
        }
      } else {
        historyData.push({ skillId: s.id, level: 0, recordedAt: daysAgo(randInt(100, 400)) });
        histRows++;
      }
    }

    // Certifications (60% des techniciens, 1 a 4)
    let certData: {
      certificationId: string;
      obtainedDate: Date;
      expiryDate: Date | null;
      certificateNumber: string | null;
      status: string;
    }[] = [];
    if (chance(0.6)) {
      const chosen = sample(certs, randInt(1, 4));
      certData = chosen.map((c) => {
        const { obtained, expiry } = certDates(c.validityMonths);
        if (expiry && expiry.getTime() > now && expiry.getTime() - now < 90 * DAY) soonCount++;
        certRows++;
        return {
          certificationId: c.id,
          obtainedDate: obtained,
          expiryDate: expiry,
          certificateNumber: chance(0.7)
            ? `${slug(c.issuer).slice(0, 3).toUpperCase()}-${randInt(10000, 99999)}`
            : null,
          status: "active",
        };
      });
    }

    await prisma.technician.create({
      data: {
        firstName,
        lastName,
        email,
        phone: phone(),
        companyId: comp.companyId,
        agencyId: post.agencyId,
        service: pick(SERVICES),
        contractType,
        contractStart,
        contractEnd,
        interventionCenterLat: jitter(post.lat),
        interventionCenterLng: jitter(post.lng),
        interventionRadiusKm: pick(RADII),
        isActive,
        departureDate,
        scheduledDeletionDate,
        createdAt: contractStart,
        skills: { create: skillData },
        certifications: { create: certData },
        skillHistory: { create: historyData },
      },
    });
  }

  console.log(`  ${COUNT} techniciens crees (${inactiveCount} inactifs/depart)`);
  console.log(`  ${skillRows} competences | niveaux Debutant/Intermediaire/Avance/Senior/Maitrise = ${levelTally.join("/")}`);
  console.log(`  ${histRows} entrees d'historique (evolution)`);
  console.log(`  ${certRows} certifications dont ${soonCount} a renouveler sous 90j`);
  console.log("Termine.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Erreur seed-demo:", e);
    process.exit(1);
  });
