import { createHash } from "node:crypto";

// Code technicien stable, dérivé de l'id — sert d'identifiant unique anonyme
// (affiché aux gestionnaires d'une autre société pour demander un renfort).
export function technicianCode(id: string): string {
  const h = createHash("sha1").update(id).digest("hex");
  return "TEC-" + h.slice(0, 6).toUpperCase();
}

// Champs personnels retirés lors de l'anonymisation inter-sociétés.
type Personal = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  [k: string]: unknown;
};

// Retire l'identité et les coordonnées d'un technicien tout en conservant les
// données métier (compétences, certifs, dispo, zone, société) pour le matching.
// Ajoute `code` (identifiant anonyme) et `anon: true`.
export function anonymizeTechnician<T extends Personal>(t: T) {
  // On ne laisse fuiter NI le nom NI les coordonnées.
  const { email: _e, phone: _p, notes: _n, ...rest } = t;
  void _e; void _p; void _n;
  return {
    ...rest,
    firstName: null,
    lastName: null,
    email: null,
    phone: null,
    notes: null,
    agency: null, // l'agence peut être identifiante
    anon: true as const,
    code: technicianCode(t.id),
  };
}
