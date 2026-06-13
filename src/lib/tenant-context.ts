import { AsyncLocalStorage } from "node:async_hooks";

// Contexte tenant par requete. Pose par requireSession() apres decodage du JWT.
// tenantId null = super admin (pas d'injection -> acces transverse, role de confiance).
export const tenantALS = new AsyncLocalStorage<{ tenantId: string | null }>();

export function setTenantContext(tenantId: string | null) {
  tenantALS.enterWith({ tenantId });
}
export function currentTenantId(): string | null {
  return tenantALS.getStore()?.tenantId ?? null;
}

// Modeles porteurs d'un tenantId (cloisonnes).
const SCOPED = new Set([
  "Company", "Agency", "Technician", "SkillCategory", "Skill", "Certification",
  "Project", "TrainingModule", "TrainingPath", "TrainingAssignment", "Tag",
  "SkillObjective", "ApiKey", "AuditLog", "Document", "TechnicianEvent", "User",
  "AssistanceRequest", "Webhook", "TrainingAssignmentEvent",
]);
const WHERE_OPS = new Set([
  "findMany", "findFirst", "findFirstOrThrow", "count", "aggregate", "groupBy",
  "updateMany", "deleteMany",
]);

// Extension Prisma : injecte tenantId dans le where (lectures multiples / maj /
// suppressions de masse) et dans data (creations). findUnique/update/delete par id
// ne sont PAS interceptes (where unique) -> les routes par id utilisent findFirst.
export function withTenantScope<T>(client: T): T {
  return (client as { $extends: (e: unknown) => unknown }).$extends({
    query: {
      $allModels: {
        // @ts-expect-error signature dynamique de l'extension
        async $allOperations({ model, operation, args, query }) {
          const tenantId = tenantALS.getStore()?.tenantId;
          if (!tenantId || !SCOPED.has(model)) return query(args);

          if (WHERE_OPS.has(operation)) {
            args.where = { ...(args.where ?? {}), tenantId };
          } else if (operation === "create") {
            args.data = { ...(args.data ?? {}), tenantId };
          } else if (operation === "createMany") {
            const d = args.data;
            args.data = Array.isArray(d)
              ? d.map((x: Record<string, unknown>) => ({ ...x, tenantId }))
              : { ...(d ?? {}), tenantId };
          }
          return query(args);
        },
      },
    },
  }) as unknown as T;
}
