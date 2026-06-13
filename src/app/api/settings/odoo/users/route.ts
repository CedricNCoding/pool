import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { decryptSecret, listUsers, type OdooConn } from "@/lib/odoo";

// Liste live des utilisateurs Odoo (pour le rapprochement). Béta.
export async function POST() {
  const session = await requireAdmin();
  setTenantContext(session.tenantId);
  const c = await prisma.odooConnection.findFirst();
  if (!c) return NextResponse.json({ error: "Aucune connexion configurée" }, { status: 400 });
  const conn: OdooConn = { url: c.url, db: c.db, login: c.login, apiKey: decryptSecret(c.apiKeyEnc), model: c.model, defaultProject: c.defaultProject };
  try {
    return NextResponse.json({ users: await listUsers(conn) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
