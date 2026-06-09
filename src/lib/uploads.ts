import path from "node:path";

// Repertoire de stockage des documents. Sur la VM : /opt/avpool/data/uploads
// (le dossier data/ est en ReadWritePaths systemd et gitignore).
export const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(process.cwd(), "data", "uploads");

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 Mo

export const ALLOWED_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

export const DOC_CATEGORIES = [
  { value: "contrat", label: "Contrat" },
  { value: "identite", label: "Piece d'identite" },
  { value: "medical", label: "Visite medicale" },
  { value: "habilitation", label: "Habilitation" },
  { value: "certificat", label: "Certificat" },
  { value: "diplome", label: "Diplome" },
  { value: "autre", label: "Autre" },
] as const;
