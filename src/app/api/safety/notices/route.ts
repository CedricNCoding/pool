import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { auditLog } from "@/lib/audit";

export async function GET() {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const list = await prisma.safetyNotice.findMany({
    include: { acks: { select: { ackAt: true } } },
    orderBy: { publishedAt: "desc" },
  });
  return NextResponse.json(list.map((n) => ({
    id: n.id, title: n.title, content: n.content, publishedAt: n.publishedAt,
    total: n.acks.length, acked: n.acks.filter((a) => a.ackAt).length,
  })));
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const body = await req.json();
  if (!body.title?.trim()) return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  const ids: string[] = Array.isArray(body.technicianIds) ? body.technicianIds : [];
  const n = await prisma.safetyNotice.create({ data: { title: body.title.trim(), content: body.content?.trim() || null } });
  if (ids.length) await prisma.safetyNoticeAck.createMany({ data: ids.map((technicianId) => ({ noticeId: n.id, technicianId })) });
  await auditLog({ userId: session.id, action: "create", entityType: "safety_notice", entityId: n.id, details: n.title });
  return NextResponse.json(n, { status: 201 });
}
