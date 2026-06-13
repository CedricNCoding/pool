import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const n = await prisma.safetyNotice.findFirst({
    where: { id },
    include: { acks: { include: { technician: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: "asc" } } },
  });
  if (!n) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(n);
}

// Accusé de réception d'un technicien.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const body = await req.json();
  if (!body.ackId) return NextResponse.json({ error: "ackId requis" }, { status: 400 });
  await prisma.safetyNoticeAck.updateMany({ where: { id: body.ackId, noticeId: id }, data: { ackAt: body.ack ? new Date() : null } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const r = await prisma.safetyNotice.deleteMany({ where: { id } });
  if (r.count === 0) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
