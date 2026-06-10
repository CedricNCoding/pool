/* =============================================================================
 * AV Pool — bascule multi-tenant
 *
 *   npx tsx prisma/seed-tenants.ts
 *
 * Cree le tenant « Demo », rattache toutes les donnees existantes (tenant_id NULL
 * -> Demo), et cree un compte super admin (hors tenant). Idempotent.
 *
 * Env : SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD (defauts de demo sinon).
 * ===========================================================================*/
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcryptjs from "bcryptjs";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

const TENANT_TABLES = [
  "companies", "agencies", "technicians", "skill_categories", "skills",
  "certifications", "projects", "training_modules", "training_paths",
  "training_assignments", "tags", "skill_objectives", "api_keys",
  "audit_logs", "documents", "technician_events", "users",
];

async function main() {
  console.log("== Bascule multi-tenant ==");

  // 1) Tenant Demo
  let demo = await prisma.tenant.findUnique({ where: { slug: "demo" } });
  if (!demo) {
    demo = await prisma.tenant.create({ data: { name: "Demo", slug: "demo", status: "active" } });
    console.log(`  Tenant « Demo » cree (${demo.id})`);
  } else {
    console.log(`  Tenant « Demo » existe deja (${demo.id})`);
  }

  // 2) Rattacher toutes les lignes orphelines a Demo
  let total = 0;
  for (const table of TENANT_TABLES) {
    // users superadmin doivent rester hors tenant -> on ne touche pas role='superadmin'
    const where = table === "users" ? "tenant_id IS NULL AND role != 'superadmin'" : "tenant_id IS NULL";
    const n = await prisma.$executeRawUnsafe(
      `UPDATE ${table} SET tenant_id = ? WHERE ${where}`,
      demo.id
    );
    if (n > 0) console.log(`  ${table}: ${n} lignes rattachees`);
    total += n;
  }
  console.log(`  ${total} lignes rattachees au tenant Demo`);

  // 3) Super admin (hors tenant)
  const email = process.env.SUPERADMIN_EMAIL || "superadmin@spektalis.net";
  const password = process.env.SUPERADMIN_PASSWORD || "Super123!";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({
      data: {
        email,
        name: "Super Admin",
        passwordHash: await bcryptjs.hash(password, 12),
        role: "superadmin",
        tenantId: null,
        companyId: null,
        isActive: true,
      },
    });
    console.log(`  Super admin cree : ${email}`);
  } else {
    await prisma.user.update({ where: { email }, data: { role: "superadmin", tenantId: null } });
    console.log(`  Super admin mis a jour : ${email}`);
  }

  console.log("Termine.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Erreur seed-tenants:", e);
    process.exit(1);
  });
