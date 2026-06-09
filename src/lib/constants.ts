export const SKILL_LEVELS = [
  { value: 1, label: "Debutant", color: "#94A3B8", bgColor: "#F1F5F9" },
  { value: 2, label: "Avance", color: "#3B82F6", bgColor: "#EFF6FF" },
  { value: 3, label: "Senior", color: "#8B5CF6", bgColor: "#F5F3FF" },
  { value: 4, label: "Maitrise", color: "#F59E0B", bgColor: "#FFFBEB" },
] as const;

export const CONTRACT_TYPES = [
  { value: "CDI", label: "CDI", color: "#10B981" },
  { value: "CDD", label: "CDD", color: "#3B82F6" },
  { value: "interim", label: "Interim", color: "#F59E0B" },
  { value: "freelance", label: "Freelance", color: "#8B5CF6" },
] as const;

export const SERVICES = [
  { value: "tech", label: "Technicien AV" },
  { value: "BE", label: "Bureau d'etudes" },
  { value: "electricien", label: "Electricien" },
  { value: "chef_projet", label: "Chef de projet" },
  { value: "regisseur", label: "Regisseur" },
  { value: "pupitreur", label: "Pupitreur" },
  { value: "cadreur", label: "Cadreur" },
  { value: "monteur", label: "Monteur" },
  { value: "ingenieur_son", label: "Ingenieur son" },
  { value: "ingenieur_lumiere", label: "Ingenieur lumiere" },
  { value: "directeur_technique", label: "Directeur technique" },
  { value: "installateur", label: "Installateur" },
  { value: "programmeur", label: "Programmeur (Crestron/AMX)" },
  { value: "support", label: "Support / SAV" },
] as const;

export const CERT_CATEGORIES = [
  { value: "audio", label: "Audio", color: "#EC4899" },
  { value: "video", label: "Video", color: "#3B82F6" },
  { value: "eclairage", label: "Eclairage", color: "#F59E0B" },
  { value: "reseau", label: "Reseau / IT", color: "#10B981" },
  { value: "controle", label: "Controle / Programmation", color: "#8B5CF6" },
  { value: "securite", label: "Securite / Habilitation", color: "#EF4444" },
  { value: "visioconference", label: "Visioconference / UC", color: "#06B6D4" },
  { value: "general", label: "General AV", color: "#6366F1" },
] as const;

export const COUNTRIES = [
  "France",
  "Belgique",
  "Suisse",
  "Luxembourg",
  "Allemagne",
  "Pays-Bas",
  "Royaume-Uni",
  "Espagne",
  "Italie",
  "Portugal",
  "Autriche",
  "Pologne",
  "Republique tcheque",
  "Danemark",
  "Suede",
  "Norvege",
  "Finlande",
  "Irlande",
  "Grece",
  "Roumanie",
] as const;
