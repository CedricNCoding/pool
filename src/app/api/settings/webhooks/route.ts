import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { validateWebhookUrl, WEBHOOK_EVENTS } from "@/lib/webhooks";
import { auditLog } from "@/lib/audit";
import { randomBytes } from "crypto";

const VALID = new Set<string>(WEBHOOK_EVENTS.map((e) => e.value));

export async function GET() {
  setTenantContext((await requireAdmin()).tenantId);
  const hooks = await prisma.webhook.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(hooks);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  setTenantContext(session.tenantId);
  const body = await req.json();

  const check = validateWebhookUrl(String(body.url ?? ""));
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  // events : "all" ou liste validée contre la liste blanche.
  let events = "all";
  if (Array.isArray(body.events) && body.events.length > 0) {
    const filtered = body.events.filter((e: string) => VALID.has(e));
    if (filtered.length === 0) return NextResponse.json({ error: "Aucun évènement valide" }, { status: 400 });
    events = filtered.join(",");
  }

  const secret = `whsec_${randomBytes(24).toString("hex")}`;
  const hook = await prisma.webhook.create({
    data: { url: check.url, events, secret },
  });

  await auditLog({
    userId: session.id,
    action: "create",
    entityType: "webhook",
    entityId: hook.id,
    details: `Webhook ${check.url} (${events})`,
  });

  return NextResponse.json(hook, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  setTenantContext(session.tenantId);
  const { id, isActive } = await req.json();
  // updateMany est filtré par tenant -> pas d'IDOR inter-tenant.
  const r = await prisma.webhook.updateMany({ where: { id }, data: { isActive: !!isActive } });
  if (r.count === 0) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  await auditLog({ userId: session.id, action: "update", entityType: "webhook", entityId: id });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  setTenantContext(session.tenantId);
  const { id } = await req.json();
  const r = await prisma.webhook.deleteMany({ where: { id } });
  if (r.count === 0) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  await auditLog({ userId: session.id, action: "delete", entityType: "webhook", entityId: id });
  return NextResponse.json({ ok: true });
}
