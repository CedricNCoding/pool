import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding AV Pool database...");

  // ─── Skill Categories ──────────────────────────────────────────────
  const categories = [
    { name: "Audio", color: "#EC4899", icon: "Headphones", order: 1 },
    { name: "Video", color: "#3B82F6", icon: "Monitor", order: 2 },
    { name: "Eclairage", color: "#F59E0B", icon: "Lightbulb", order: 3 },
    { name: "Reseau IT", color: "#10B981", icon: "Network", order: 4 },
    { name: "Integration", color: "#F97316", icon: "Cable", order: 5 },
    { name: "Controle/Programmation", color: "#8B5CF6", icon: "Cpu", order: 6 },
    { name: "Visioconference/UC", color: "#06B6D4", icon: "Video", order: 7 },
    { name: "Conception", color: "#6366F1", icon: "PenTool", order: 8 },
  ];

  const categoryMap: Record<string, string> = {};

  for (const cat of categories) {
    const record = await prisma.skillCategory.upsert({
      where: { name: cat.name },
      update: { color: cat.color, icon: cat.icon, order: cat.order },
      create: cat,
    });
    categoryMap[cat.name] = record.id;
  }
  console.log(`  ${categories.length} skill categories upserted`);

  // ─── Skills ────────────────────────────────────────────────────────
  const skillsByCategory: Record<string, { name: string; description: string }[]> = {
    Audio: [
      { name: "Mixage", description: "Consoles de mixage analogiques et numeriques (Yamaha, Allen & Heath, DiGiCo, Soundcraft)" },
      { name: "Sonorisation", description: "Systemes de sonorisation, line arrays, amplification, calibration" },
      { name: "Microphones", description: "Microphones filaires et sans-fil, HF, gestion des frequences" },
      { name: "DSP", description: "Processeurs de signal audio (Biamp, QSC, Symetrix, BSS)" },
      { name: "Systemes distribues", description: "Systemes audio distribues 70V/100V, sonorisation de confort, alarmes vocales" },
    ],
    Video: [
      { name: "Projection", description: "Videoprojecteurs, optiques, calcul de throw, mapping video" },
      { name: "LED", description: "Murs LED, pitch, calibration, processeurs video (Brompton, Novastar)" },
      { name: "Switching", description: "Matrices video, scalers, seamless switchers (Barco, Analog Way)" },
      { name: "Streaming", description: "Encodage live, NDI, SRT, RTMP, plateformes de diffusion" },
      { name: "Encodage", description: "Encodage/decodage video, formats, codecs, HDMI/SDI/HDBaseT" },
    ],
    Eclairage: [
      { name: "Eclairage scenique", description: "Lyres, PAR, blinders, effets, programmation de shows" },
      { name: "Eclairage architectural", description: "Mise en lumiere architecturale, DALI, eclairage urbain" },
      { name: "DMX", description: "Protocole DMX512, Art-Net, sACN, distribution de signal" },
      { name: "Consoles lumiere", description: "Consoles (GrandMA, ETC EOS, ChamSys), programmation et exploitation" },
    ],
    "Reseau IT": [
      { name: "Reseau AV", description: "Reseaux dedies AV, VLAN, QoS, multicast, IGMP snooping" },
      { name: "Dante/AES67", description: "Audio sur IP Dante, AES67, Ravenna, configuration et routage" },
      { name: "Controle IP", description: "Protocoles de controle (TCP/UDP, RS-232 sur IP, API REST)" },
      { name: "Cybersecurite AV", description: "Securisation des systemes AV, segmentation, durcissement reseau" },
    ],
    Integration: [
      { name: "Cablage", description: "Cablage cuivre et fibre optique, certification, normes" },
      { name: "Installation rack", description: "Integration rack 19 pouces, organisation, chemins de cables" },
      { name: "Infrastructure", description: "Faux-planchers, faux-plafonds, cheminements, percements" },
      { name: "Tirage cable", description: "Tirage de cables, love, passage de gaines, etiquetage" },
    ],
    "Controle/Programmation": [
      { name: "Crestron", description: "Programmation Crestron SIMPL+, SIMPL#, C#, configuration XiO Cloud" },
      { name: "AMX/Harman", description: "Programmation AMX NetLinx, Cafe Duet, configuration" },
      { name: "Extron", description: "Programmation Extron Global Configurator, GC Pro, Pro Series" },
      { name: "Q-SYS", description: "Programmation Q-SYS Designer, Lua scripting, UCI" },
    ],
    "Visioconference/UC": [
      { name: "Teams Rooms", description: "Microsoft Teams Rooms, Surface Hub, peripheriques certifies" },
      { name: "Zoom Rooms", description: "Zoom Rooms, Zoom Workplace, DTEN, Neat, Poly" },
      { name: "Systemes UC", description: "Solutions UC (Cisco Webex, GoTo, RingCentral), interoperabilite" },
      { name: "Collaboration", description: "Ecrans interactifs, partage sans-fil, BYOD, affichage dynamique" },
    ],
    Conception: [
      { name: "CAO", description: "Conception assistee par ordinateur (AutoCAD, Revit, SketchUp)" },
      { name: "Schematique", description: "Schemas unifilaires, synoptiques AV, documentation technique" },
      { name: "Acoustique", description: "Etudes acoustiques, modelisation (EASE, CATT), traitement acoustique" },
      { name: "Ergonomie salle", description: "Ergonomie des salles de reunion, normes, dimensionnement ecrans" },
    ],
  };

  let skillCount = 0;
  for (const [catName, skills] of Object.entries(skillsByCategory)) {
    const catId = categoryMap[catName];
    for (let i = 0; i < skills.length; i++) {
      const skill = skills[i];
      await prisma.skill.upsert({
        where: { name_categoryId: { name: skill.name, categoryId: catId } },
        update: { description: skill.description, order: i + 1 },
        create: {
          name: skill.name,
          categoryId: catId,
          description: skill.description,
          order: i + 1,
        },
      });
      skillCount++;
    }
  }
  console.log(`  ${skillCount} skills upserted`);

  // ─── Certifications ────────────────────────────────────────────────
  const certifications: {
    name: string;
    issuer: string;
    description: string;
    validityMonths: number | null;
    category: string;
    color: string;
    level: string;
    order: number;
  }[] = [];

  let certOrder = 0;

  // Avixa
  certifications.push(
    { name: "CTS", issuer: "AVIXA", description: "Certified Technology Specialist - certification de base pour les professionnels de l'audiovisuel", validityMonths: 36, category: "general", color: "#10B981", level: "foundation", order: ++certOrder },
    { name: "CTS-D", issuer: "AVIXA", description: "Certified Technology Specialist - Design. Specialisation conception de systemes AV", validityMonths: 36, category: "general", color: "#10B981", level: "standard", order: ++certOrder },
    { name: "CTS-I", issuer: "AVIXA", description: "Certified Technology Specialist - Installation. Specialisation installation de systemes AV", validityMonths: 36, category: "general", color: "#10B981", level: "advanced", order: ++certOrder },
  );

  // Dante
  certifications.push(
    { name: "Dante Level 1", issuer: "Audinate", description: "Fondamentaux du reseau audio Dante, configuration de base", validityMonths: null, category: "reseau", color: "#10B981", level: "foundation", order: ++certOrder },
    { name: "Dante Level 2", issuer: "Audinate", description: "Configuration avancee Dante, topologies reseau, redondance", validityMonths: null, category: "reseau", color: "#10B981", level: "standard", order: ++certOrder },
    { name: "Dante Level 3", issuer: "Audinate", description: "Expert Dante, diagnostics avances, integration systemes complexes", validityMonths: null, category: "reseau", color: "#10B981", level: "advanced", order: ++certOrder },
  );

  // Crestron
  certifications.push(
    { name: "DMC-E-4K", issuer: "Crestron", description: "DigitalMedia Certified Engineer 4K - conception et configuration des systemes DM", validityMonths: 36, category: "controle", color: "#8B5CF6", level: "standard", order: ++certOrder },
    { name: "DMC-D-4K", issuer: "Crestron", description: "DigitalMedia Certified Designer 4K - design de systemes DigitalMedia", validityMonths: 36, category: "controle", color: "#8B5CF6", level: "standard", order: ++certOrder },
    { name: "DMC-T", issuer: "Crestron", description: "DigitalMedia Certified Technician - installation et maintenance DM", validityMonths: 36, category: "controle", color: "#8B5CF6", level: "foundation", order: ++certOrder },
    { name: "Master Programmer", issuer: "Crestron", description: "Crestron Master Programmer - programmation avancee SIMPL# et C#", validityMonths: 36, category: "controle", color: "#8B5CF6", level: "advanced", order: ++certOrder },
    { name: "Master Technology Architect", issuer: "Crestron", description: "Crestron Master Technology Architect - architecture et integration avancees", validityMonths: 36, category: "controle", color: "#8B5CF6", level: "advanced", order: ++certOrder },
  );

  // Extron
  certifications.push(
    { name: "AV Associate", issuer: "Extron", description: "Extron AV Associate - fondamentaux des technologies Extron", validityMonths: null, category: "controle", color: "#8B5CF6", level: "foundation", order: ++certOrder },
    { name: "Control Specialist", issuer: "Extron", description: "Extron Control Specialist - programmation Global Configurator", validityMonths: null, category: "controle", color: "#8B5CF6", level: "standard", order: ++certOrder },
    { name: "Control Professional", issuer: "Extron", description: "Extron Control Professional - programmation avancee GC Pro", validityMonths: null, category: "controle", color: "#8B5CF6", level: "advanced", order: ++certOrder },
    { name: "XTP Systems", issuer: "Extron", description: "Extron XTP Systems - matrices de distribution video XTP", validityMonths: null, category: "controle", color: "#8B5CF6", level: "standard", order: ++certOrder },
    { name: "NAV Systems", issuer: "Extron", description: "Extron NAV Systems - distribution AV sur IP", validityMonths: null, category: "controle", color: "#8B5CF6", level: "standard", order: ++certOrder },
  );

  // QSC/Q-SYS
  certifications.push(
    { name: "Q-SYS Level 1", issuer: "QSC", description: "Q-SYS Level 1 - fondamentaux Q-SYS Designer, routage audio", validityMonths: null, category: "controle", color: "#8B5CF6", level: "foundation", order: ++certOrder },
    { name: "Q-SYS Level 2", issuer: "QSC", description: "Q-SYS Level 2 - scripting Lua, UCI, controle avance", validityMonths: null, category: "controle", color: "#8B5CF6", level: "standard", order: ++certOrder },
    { name: "Q-SYS Level 3", issuer: "QSC", description: "Q-SYS Level 3 - architectures complexes, plugins, integration tierce", validityMonths: null, category: "controle", color: "#8B5CF6", level: "advanced", order: ++certOrder },
  );

  // Biamp
  certifications.push(
    { name: "Tesira", issuer: "Biamp", description: "Biamp Tesira - configuration et programmation de la plateforme Tesira", validityMonths: null, category: "audio", color: "#EC4899", level: "standard", order: ++certOrder },
    { name: "TesiraFORTE", issuer: "Biamp", description: "Biamp TesiraFORTE - processeurs audio fixes TesiraFORTE", validityMonths: null, category: "audio", color: "#EC4899", level: "standard", order: ++certOrder },
    { name: "Devio", issuer: "Biamp", description: "Biamp Devio - solutions de conferencing Devio, beamtracking", validityMonths: null, category: "audio", color: "#EC4899", level: "foundation", order: ++certOrder },
  );

  // Shure
  certifications.push(
    { name: "Wireless Systems", issuer: "Shure", description: "Shure Wireless Systems - gestion des frequences, systemes HF", validityMonths: null, category: "audio", color: "#EC4899", level: "standard", order: ++certOrder },
    { name: "Conferencing Systems", issuer: "Shure", description: "Shure Conferencing - MXA, IntelliMix, Stem Ecosystem", validityMonths: null, category: "audio", color: "#EC4899", level: "standard", order: ++certOrder },
    { name: "Networked Audio", issuer: "Shure", description: "Shure Networked Audio - systemes audio en reseau, Dante", validityMonths: null, category: "audio", color: "#EC4899", level: "standard", order: ++certOrder },
  );

  // AMX/Harman
  certifications.push(
    { name: "ACE", issuer: "AMX/Harman", description: "AMX Certified Engineer - programmation NetLinx, configuration systemes AMX", validityMonths: 36, category: "controle", color: "#8B5CF6", level: "standard", order: ++certOrder },
    { name: "ACE-P", issuer: "AMX/Harman", description: "AMX Certified Engineer - Programmer. Programmation avancee Cafe Duet", validityMonths: 36, category: "controle", color: "#8B5CF6", level: "advanced", order: ++certOrder },
  );

  // Barco
  certifications.push(
    { name: "Certified Design Partner", issuer: "Barco", description: "Barco Certified Design Partner - conception de systemes de projection et LED", validityMonths: null, category: "video", color: "#3B82F6", level: "standard", order: ++certOrder },
    { name: "ClickShare Certified", issuer: "Barco", description: "Barco ClickShare Certified - deploiement et configuration ClickShare", validityMonths: null, category: "video", color: "#3B82F6", level: "foundation", order: ++certOrder },
  );

  // Christie
  certifications.push(
    { name: "Professional Certified Installer", issuer: "Christie", description: "Christie Professional Certified Installer - installation et calibration de projecteurs Christie", validityMonths: null, category: "video", color: "#3B82F6", level: "standard", order: ++certOrder },
  );

  // NEC/Sharp
  certifications.push(
    { name: "Display Solutions Certified", issuer: "NEC/Sharp", description: "NEC/Sharp Display Solutions - ecrans professionnels, videowall, calibration", validityMonths: null, category: "video", color: "#3B82F6", level: "standard", order: ++certOrder },
  );

  // Kramer
  certifications.push(
    { name: "Certified AV Technician", issuer: "Kramer", description: "Kramer Certified AV Technician - installation et configuration de solutions Kramer", validityMonths: null, category: "controle", color: "#8B5CF6", level: "foundation", order: ++certOrder },
    { name: "KNet Academy", issuer: "Kramer", description: "Kramer KNet Academy - distribution AV sur IP, KDS, VIA", validityMonths: null, category: "controle", color: "#8B5CF6", level: "standard", order: ++certOrder },
  );

  // Sennheiser
  certifications.push(
    { name: "Certified Specialist Wireless", issuer: "Sennheiser", description: "Sennheiser Certified Specialist Wireless - systemes HF Evolution, Digital 6000/9000", validityMonths: null, category: "audio", color: "#EC4899", level: "standard", order: ++certOrder },
    { name: "Immersive Audio", issuer: "Sennheiser", description: "Sennheiser Immersive Audio - AMBEO, audio immersif, spatialisation", validityMonths: null, category: "audio", color: "#EC4899", level: "advanced", order: ++certOrder },
  );

  // Meyer Sound
  certifications.push(
    { name: "System Design", issuer: "Meyer Sound", description: "Meyer Sound System Design - conception et calibration de systemes Meyer Sound", validityMonths: null, category: "audio", color: "#EC4899", level: "standard", order: ++certOrder },
    { name: "Compass Certification", issuer: "Meyer Sound", description: "Meyer Sound Compass - utilisation de Compass pour la prediction et le design", validityMonths: null, category: "audio", color: "#EC4899", level: "standard", order: ++certOrder },
  );

  // d&b audiotechnik
  certifications.push(
    { name: "System Design", issuer: "d&b audiotechnik", description: "d&b System Design - conception de systemes d&b, optimisation acoustique", validityMonths: null, category: "audio", color: "#EC4899", level: "standard", order: ++certOrder },
    { name: "ArrayCalc", issuer: "d&b audiotechnik", description: "d&b ArrayCalc - logiciel de simulation et d'optimisation d'arrays", validityMonths: null, category: "audio", color: "#EC4899", level: "standard", order: ++certOrder },
  );

  // L-Acoustics
  certifications.push(
    { name: "Soundvision Design", issuer: "L-Acoustics", description: "L-Acoustics Soundvision Design - simulation 3D et conception de systemes L-Acoustics", validityMonths: null, category: "audio", color: "#EC4899", level: "standard", order: ++certOrder },
    { name: "System Tech", issuer: "L-Acoustics", description: "L-Acoustics System Tech - deploiement, calibration et exploitation de systemes", validityMonths: null, category: "audio", color: "#EC4899", level: "advanced", order: ++certOrder },
  );

  // Bose Professional
  certifications.push(
    { name: "ControlSpace Certified", issuer: "Bose Professional", description: "Bose ControlSpace Certified - programmation ControlSpace Designer, systemes audio Bose", validityMonths: null, category: "audio", color: "#EC4899", level: "standard", order: ++certOrder },
  );

  // SDVoE
  certifications.push(
    { name: "Design Partner Certified", issuer: "SDVoE Alliance", description: "SDVoE Design Partner - distribution AV 4K sur IP 10G sans compression", validityMonths: null, category: "reseau", color: "#10B981", level: "standard", order: ++certOrder },
  );

  // HDBaseT
  certifications.push(
    { name: "Certified Installer", issuer: "HDBaseT Alliance", description: "HDBaseT Certified Installer - installation et test de liaisons HDBaseT", validityMonths: null, category: "reseau", color: "#10B981", level: "foundation", order: ++certOrder },
    { name: "Certified Designer", issuer: "HDBaseT Alliance", description: "HDBaseT Certified Designer - conception de systemes de distribution HDBaseT", validityMonths: null, category: "reseau", color: "#10B981", level: "standard", order: ++certOrder },
  );

  // AQAV
  certifications.push(
    { name: "Qualification Audiovisuel", issuer: "AQAV", description: "Qualification AQAV - qualification professionnelle audiovisuel francaise", validityMonths: null, category: "general", color: "#10B981", level: "standard", order: ++certOrder },
  );

  // Habilitations electriques
  const habElecColor = "#EF4444";
  certifications.push(
    { name: "BR", issuer: "Habilitations electriques", description: "Habilitation electrique BR - intervention generale d'entretien et depannage", validityMonths: 36, category: "securite", color: habElecColor, level: "standard", order: ++certOrder },
    { name: "B1V", issuer: "Habilitations electriques", description: "Habilitation electrique B1V - executant de travaux d'ordre electrique en BT", validityMonths: 36, category: "securite", color: habElecColor, level: "standard", order: ++certOrder },
    { name: "B2V", issuer: "Habilitations electriques", description: "Habilitation electrique B2V - charge de travaux d'ordre electrique en BT", validityMonths: 36, category: "securite", color: habElecColor, level: "advanced", order: ++certOrder },
    { name: "BC", issuer: "Habilitations electriques", description: "Habilitation electrique BC - charge de consignation en BT", validityMonths: 36, category: "securite", color: habElecColor, level: "advanced", order: ++certOrder },
    { name: "H0-H0V", issuer: "Habilitations electriques", description: "Habilitation electrique H0-H0V - travaux d'ordre non electrique en HT", validityMonths: 36, category: "securite", color: habElecColor, level: "foundation", order: ++certOrder },
  );

  // SSIAP
  certifications.push(
    { name: "SSIAP 1", issuer: "SSIAP", description: "Service de Securite Incendie et d'Assistance a Personnes - Agent de securite incendie", validityMonths: 36, category: "securite", color: "#EF4444", level: "foundation", order: ++certOrder },
    { name: "SSIAP 2", issuer: "SSIAP", description: "Service de Securite Incendie et d'Assistance a Personnes - Chef d'equipe", validityMonths: 36, category: "securite", color: "#EF4444", level: "standard", order: ++certOrder },
    { name: "SSIAP 3", issuer: "SSIAP", description: "Service de Securite Incendie et d'Assistance a Personnes - Chef de service", validityMonths: 36, category: "securite", color: "#EF4444", level: "advanced", order: ++certOrder },
  );

  // CACES
  certifications.push(
    { name: "R486 Cat A", issuer: "CACES", description: "CACES Nacelle R486 Categorie A - PEMP a elevation verticale", validityMonths: 60, category: "securite", color: "#EF4444", level: "foundation", order: ++certOrder },
    { name: "R486 Cat B", issuer: "CACES", description: "CACES Nacelle R486 Categorie B - PEMP a elevation multidirectionnelle", validityMonths: 60, category: "securite", color: "#EF4444", level: "standard", order: ++certOrder },
    { name: "R489", issuer: "CACES", description: "CACES R489 - Chariots automoteurs de manutention a conducteur porte", validityMonths: 60, category: "securite", color: "#EF4444", level: "standard", order: ++certOrder },
  );

  // Travail en hauteur
  certifications.push(
    { name: "Travail en hauteur", issuer: "Formation securite", description: "Formation travail en hauteur - port du harnais, points d'ancrage, securisation", validityMonths: 24, category: "securite", color: "#EF4444", level: "foundation", order: ++certOrder },
  );

  // SST
  certifications.push(
    { name: "SST", issuer: "INRS", description: "Sauveteur Secouriste du Travail - premiers secours et prevention en entreprise", validityMonths: 24, category: "securite", color: "#EF4444", level: "foundation", order: ++certOrder },
  );

  // Microsoft Teams Rooms
  certifications.push(
    { name: "Teams Rooms Certified", issuer: "Microsoft", description: "Microsoft Teams Rooms Certified - deploiement et gestion de salles Teams", validityMonths: null, category: "visioconference", color: "#06B6D4", level: "standard", order: ++certOrder },
  );

  // Zoom
  certifications.push(
    { name: "Certified Integrator", issuer: "Zoom", description: "Zoom Certified Integrator - integration et deploiement de Zoom Rooms", validityMonths: null, category: "visioconference", color: "#06B6D4", level: "standard", order: ++certOrder },
  );

  // Cisco/Webex
  certifications.push(
    { name: "Video Infrastructure", issuer: "Cisco/Webex", description: "Cisco Video Infrastructure - infrastructure de visioconference Webex, codecs, CMS", validityMonths: 36, category: "visioconference", color: "#06B6D4", level: "standard", order: ++certOrder },
  );

  // Poly/HP
  certifications.push(
    { name: "Certified Video Engineer", issuer: "Poly/HP", description: "Poly Certified Video Engineer - systemes de visioconference Poly Studio, G7500", validityMonths: null, category: "visioconference", color: "#06B6D4", level: "standard", order: ++certOrder },
  );

  for (const cert of certifications) {
    await prisma.certification.upsert({
      where: { name_issuer: { name: cert.name, issuer: cert.issuer } },
      update: {
        description: cert.description,
        validityMonths: cert.validityMonths,
        category: cert.category,
        color: cert.color,
        level: cert.level,
        order: cert.order,
      },
      create: cert,
    });
  }
  console.log(`  ${certifications.length} certifications upserted`);

  // ─── Companies ─────────────────────────────────────────────────────
  const companies = [
    {
      name: "AV Concept",
      siret: "12345678900012",
      address: "15 rue de la Paix",
      city: "Paris",
      country: "France",
      postalCode: "75002",
      lat: 48.8566,
      lng: 2.3522,
      phone: "+33 1 42 00 00 00",
      email: "contact@avconcept.fr",
      color: "#3B82F6",
    },
    {
      name: "SonoLight Pro",
      siret: "98765432100034",
      address: "25 avenue Jean Jaures",
      city: "Lyon",
      country: "France",
      postalCode: "69007",
      lat: 45.764,
      lng: 4.8357,
      phone: "+33 4 72 00 00 00",
      email: "contact@sonolightpro.fr",
      color: "#10B981",
    },
  ];

  // Donnees de demonstration (entreprises fictives) : seedees en dev, ou en prod
  // uniquement si SEED_DEMO=1. Une install prod propre ne cree QUE le referentiel.
  const seedDemo =
    process.env.SEED_DEMO === "1" || process.env.NODE_ENV !== "production";

  const companyMap: Record<string, string> = {};

  if (seedDemo) {
    for (const company of companies) {
      // Company has no unique constraint on name, so find by name first
      const existing = await prisma.company.findFirst({
        where: { name: company.name },
      });
      let record;
      if (existing) {
        record = await prisma.company.update({
          where: { id: existing.id },
          data: company,
        });
      } else {
        record = await prisma.company.create({ data: company });
      }
      companyMap[company.name] = record.id;
    }
    console.log(`  ${companies.length} demo companies upserted`);
  } else {
    console.log("  (prod) demo companies skipped — set SEED_DEMO=1 to include");
  }

  // ─── Admin user ────────────────────────────────────────────────────
  // Credentials are env-driven so production never ships the dev default.
  const adminEmail = process.env.ADMIN_EMAIL || "admin@avpool.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin123!";
  const adminName = process.env.ADMIN_NAME || "Administrateur";

  if (process.env.NODE_ENV === "production" && !process.env.ADMIN_PASSWORD) {
    throw new Error(
      "ADMIN_PASSWORD doit etre defini pour seeder en production (refus du defaut Admin123!)."
    );
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      passwordHash,
      role: "admin",
      isActive: true,
    },
    create: {
      email: adminEmail,
      passwordHash,
      name: adminName,
      role: "admin",
      isActive: true,
    },
  });
  console.log(`  Admin user upserted (${adminEmail})`);

  // ─── Settings ──────────────────────────────────────────────────────
  const settings = [
    { key: "retention_months", value: "12" },
    { key: "cert_reminder_days", value: "30,60,90" },
    { key: "app_name", value: "AV Pool" },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log(`  ${settings.length} settings upserted`);

  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
