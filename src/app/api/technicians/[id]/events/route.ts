import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, canAccessCompany } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;
  const tech = await prisma.technician.findUnique({ where: { id } });
  if (!tech) return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  if (!canAccessCompany(session, tech.companyId)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }
  const events = await prisma.technicianEvent.findMany({
    where: { technicianId: id },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(events);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;
  const body = await req.json();

  const tech = await prisma.technician.findUnique({ where: { id } });
  if (!tech) return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  if (!canAccessCompany(session, tech.companyId)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const title = (body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Intitule obligatoire" }, { status: 400 });

  const event = await prisma.technicianEvent.create({
    data: {
      technicianId: id,
      type: body.type || "note",
      title,
      body: body.body?.trim() || null,
      date: body.date ? new Date(body.date) : new Date(),
      createdById: session.id,
    },
  });

  await auditLog({
    userId: session.id,
    action: "create",
    entityType: "technician_event",
    entityId: event.id,
    details: title,
  });

  return NextResponse.json(event, { status: 201 });
}
