import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { decryptSecret, testConnection, type OdooConn } from "@/lib/odoo";

export async function POST() {
  const session = await requireAdmin();
  setTenantContext(session.tenantId);
  const c = await prisma.odooConnection.findFirst();
  if (!c) return NextResponse.json({ error: "Aucune connexion configurée" }, { status: 400 });
  const conn: OdooConn = { url: c.url, db: c.db, login: c.login, apiKey: decryptSecret(c.apiKeyEnc), model: c.model, defaultProject: c.defaultProject };
  try {
    const diag = await testConnection(conn);
    await prisma.odooConnection.update({ where: { id: c.id }, data: { lastStatus: "Connexion OK", lastError: null } });
    return NextResponse.json(diag);
  } catch (e) {
    const msg = (e as Error).message;
    await prisma.odooConnection.update({ where: { id: c.id }, data: { lastStatus: "Échec", lastError: msg } });
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
