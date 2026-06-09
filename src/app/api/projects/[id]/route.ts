import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, type SessionUser } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

function canAccess(session: SessionUser, companyId: string | null): boolean {
  if (session.role === "admin") return true;
  return !!companyId && companyId === session.companyId;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true, color: true } },
      technicians: {
        include: {
          company: { select: { name: true, color: true } },
          agency: { select: { name: true, city: true } },
          skills: { include: { skill: { include: { category: true } } } },
          certifications: { include: { certification: true } },
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      },
    },
  });

  if (!project) return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  if (!canAccess(session, project.companyId)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }
  return NextResponse.json(project);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  if (!canAccess(session, existing.companyId)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.status !== undefined) data.status = body.status;

  if (Array.isArray(body.technicianIds)) {
    let allowedIds: string[] = body.technicianIds;
    if (session.role !== "admin") {
      const techs = await prisma.technician.findMany({
        where: { id: { in: body.technicianIds }, companyId: session.companyId ?? "__none__" },
        select: { id: true },
      });
      allowedIds = techs.map((t) => t.id);
    }
    data.technicians = { set: allowedIds.map((tid) => ({ id: tid })) };
  }

  const updated = await prisma.project.update({
    where: { id },
    data,
    include: { _count: { select: { technicians: true } } },
  });

  await auditLog({
    userId: session.id,
    action: "update",
    entityType: "project",
    entityId: id,
    details: updated.title,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  if (!canAccess(session, existing.companyId)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  await prisma.project.delete({ where: { id } });
  await auditLog({
    userId: session.id,
    action: "delete",
    entityType: "project",
    entityId: id,
    details: existing.title,
  });
  return NextResponse.json({ ok: true });
}
