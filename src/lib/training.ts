import { prisma } from "./db";

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
