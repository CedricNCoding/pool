import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { withTenantScope } from "./tenant-context";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL || "file:./prisma/dev.db",
  });
  // Cloisonnement multi-tenant : injection auto de tenantId selon le contexte de
  // la requete (pose par requireSession). Voir tenant-context.ts.
  return withTenantScope(new PrismaClient({ adapter }));
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
