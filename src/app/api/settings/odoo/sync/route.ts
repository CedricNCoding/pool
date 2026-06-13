import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { decryptSecret, pushBookings, pullTasks, type OdooConn } from "@/lib/odoo";
import { auditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  setTenantContext(session.tenantId);
  const { direction } = await req.json();
  const c = await prisma.odooConnection.findFirst();
  if (!c) return NextResponse.json({ error: "Aucune connexion configurée" }, { status: 400 });
  if (!c.enabled) return NextResponse.json({ error: "Connecteur désactivé" }, { status: 400 });
  const conn: OdooConn = { url: c.url, db: c.db, login: c.login, apiKey: decryptSecret(c.apiKeyEnc), model: c.model, defaultProject: c.defaultProject };

  try {
    let result: Record<string, unknown>;
    if (direction === "pull") {
      const r = await pullTasks(conn);
      result = { ...r };
      await prisma.odooConnection.update({ where: { id: c.id }, data: { lastSyncAt: new Date(), lastStatus: `Import : ${r.pulled} créneau(x), ${r.skipped.length} ignoré(s)`, lastError: null } });
    } else {
      const r = await pushBookings(conn);
      result = { ...r };
      await prisma.odooConnection.update({ where: { id: c.id }, data: { lastSyncAt: new Date(), lastStatus: `Export : ${r.pushed} tâche(s), ${r.errors.length} erreur(s)`, lastError: r.errors[0] ?? null } });
    }
    await auditLog({ userId: session.id, action: "update", entityType: "odoo_sync", details: `Odoo ${direction}` });
    return NextResponse.json(result);
  } catch (e) {
    const msg = (e as Error).message;
    await prisma.odooConnection.update({ where: { id: c.id }, data: { lastStatus: "Échec sync", lastError: msg } });
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
