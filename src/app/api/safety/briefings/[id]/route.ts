import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const b = await prisma.safetyBriefing.findFirst({
    where: { id },
    include: {
      project: { select: { title: true } },
      attendees: { include: { technician: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!b) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(b);
}

// Émargement : signe/dé-signe un participant.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const body = await req.json();
  if (!body.attendeeId) return NextResponse.json({ error: "attendeeId requis" }, { status: 400 });
  await prisma.safetyBriefingAttendee.updateMany({
    where: { id: body.attendeeId, briefingId: id },
    data: { signedAt: body.signed ? new Date() : null },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const r = await prisma.safetyBriefing.deleteMany({ where: { id } });
  if (r.count === 0) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
