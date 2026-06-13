import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { encryptSecret, validateOdooUrl } from "@/lib/odoo";
import { auditLog } from "@/lib/audit";

// Config Odoo du tenant (la clé API n'est JAMAIS renvoyée).
export async function GET() {
  const session = await requireAdmin();
  setTenantContext(session.tenantId);
  const c = await prisma.odooConnection.findFirst();
  if (!c) return NextResponse.json({ configured: false });
  return NextResponse.json({
    configured: true, id: c.id, url: c.url, db: c.db, login: c.login, model: c.model,
    defaultProject: c.defaultProject, enabled: c.enabled, hasKey: !!c.apiKeyEnc,
    lastSyncAt: c.lastSyncAt, lastStatus: c.lastStatus, lastError: c.lastError,
  });
}

export async function PUT(req: NextRequest) {
  const session = await requireAdmin();
  setTenantContext(session.tenantId);
  const body = await req.json();
  const v = validateOdooUrl(String(body.url ?? ""));
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  if (!body.db?.trim() || !body.login?.trim()) return NextResponse.json({ error: "Base et identifiant requis" }, { status: 400 });

  const existing = await prisma.odooConnection.findFirst();
  const data: Record<string, unknown> = {
    url: v.url, db: body.db.trim(), login: body.login.trim(),
    model: body.model?.trim() || "project.task",
    defaultProject: body.defaultProject?.trim() || null,
    enabled: !!body.enabled,
  };
  // clé API : ne la remplace que si fournie (sinon conserve l'existante).
  if (body.apiKey && String(body.apiKey).trim()) data.apiKeyEnc = encryptSecret(String(body.apiKey).trim());

  if (existing) {
    await prisma.odooConnection.update({ where: { id: existing.id }, data });
  } else {
    if (!data.apiKeyEnc) return NextResponse.json({ error: "Clé API requise" }, { status: 400 });
    await prisma.odooConnection.create({ data: data as { url: string; db: string; login: string; apiKeyEnc: string; model: string; defaultProject: string | null; enabled: boolean } });
  }
  await auditLog({ userId: session.id, action: "update", entityType: "odoo_connection", details: "Config Odoo (Béta)" });
  return NextResponse.json({ ok: true });
}
