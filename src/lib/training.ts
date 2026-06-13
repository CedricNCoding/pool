import { prisma } from "./db";

// Sources de financement d'une formation (financement par participant).
export const FUNDING_SOURCES = [
  { value: "opco", label: "OPCO" },
  { value: "cpf", label: "CPF" },
  { value: "interne", label: "Interne (employeur)" },
  { value: "client", label: "Client / refacturé" },
  { value: "autre", label: "Autre" },
] as const;

// Cycle de vie d'une session de formation.
export const SESSION_STATUS: Record<string, { label: string; color: string }> = {
  planifiee: { label: "Planifiee", color: "#F59E0B" },
  en_cours: { label: "En cours", color: "#3B82F6" },
  terminee: { label: "Terminee", color: "#10B981" },
  annulee: { label: "Annulee", color: "#64748B" },
};

// Trace un évènement d'historique d'une session (statut, participant, document…).
// tenantId injecté par l'extension Prisma ; actorName est un instantané du nom.
export async function recordSessionEvent(opts: {
  sessionId: string;
  kind?: string;
  label: string;
  actorId?: string | null;
  actorName?: string | null;
}): Promise<void> {
  await prisma.trainingSessionEvent.create({
    data: {
      sessionId: opts.sessionId,
      kind: opts.kind || "info",
      label: opts.label,
      actorId: opts.actorId ?? null,
      actorName: opts.actorName ?? null,
    },
  });
}

// Trace une transition de statut d'une affectation de formation. Le tenantId est
// injecté par l'extension Prisma (modèle scopé). actorName est un instantané du
// nom de l'auteur pour rester lisible si l'utilisateur est renommé/supprimé.
export async function recordAssignmentEvent(opts: {
  assignmentId: string;
  status: string;
  note?: string | null;
  actorId?: string | null;
  actorName?: string | null;
}): Promise<void> {
  await prisma.trainingAssignmentEvent.create({
    data: {
      assignmentId: opts.assignmentId,
      status: opts.status,
      note: opts.note?.trim() || null,
      actorId: opts.actorId ?? null,
      actorName: opts.actorName ?? null,
    },
  });
}
