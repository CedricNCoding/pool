import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, type SessionUser } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { anonymizeTechnician } from "@/lib/anon";
import { blockingTechnicians } from "@/lib/compliance";
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
  setTenantContext(session.tenantId);
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id },
    include: {
      company: { select: { id: true, name: true, color: true } },
      requiredCertifications: { select: { id: true, name: true } },
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
  // Défense en profondeur : si un membre vient d'une autre société (ajouté par
  // un admin), un gestionnaire ne doit pas voir son identité.
  if (session.role === "manager" && session.companyId) {
    return NextResponse.json({
      ...project,
      technicians: project.technicians.map((t) =>
        t.companyId !== session.companyId ? anonymizeTechnician(t) : t
      ),
    });
  }
  return NextResponse.json(project);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.project.findFirst({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  if (!canAccess(session, existing.companyId)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = String(body.title).trim();
  if (body.description !== undefined) data.description = body.description?.trim() || null;
  if (body.status !== undefined) data.status = body.status;
  // Dossier, client, planification, exigences.
  if (body.dossierNumber !== undefined) data.dossierNumber = body.dossierNumber?.trim() || null;
  if (body.clientName !== undefined) data.clientName = body.clientName?.trim() || null;
  if (body.clientContact !== undefined) data.clientContact = body.clientContact?.trim() || null;
  if (body.clientPhone !== undefined) data.clientPhone = body.clientPhone?.trim() || null;
  if (body.clientEmail !== undefined) data.clientEmail = body.clientEmail?.trim() || null;
  if (body.site !== undefined) data.site = body.site?.trim() || null;
  if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;
  if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null;
  if (body.requiredEpi !== undefined) data.requiredEpi = Array.isArray(body.requiredEpi) ? body.requiredEpi.join(",") : (body.requiredEpi?.trim() || null);
  if (Array.isArray(body.requiredCertificationIds)) data.requiredCertifications = { set: body.requiredCertificationIds.map((cid: string) => ({ id: cid })) };

  // technicianIds = remplacement complet ; addTechnicianIds = ajout (sans retirer).
  const replaceIds = Array.isArray(body.technicianIds) ? body.technicianIds : null;
  const addIds = Array.isArray(body.addTechnicianIds) ? body.addTechnicianIds : null;
  if (replaceIds || addIds) {
    let allowedIds: string[] = (replaceIds ?? addIds) as string[];
    if (session.role !== "admin") {
      const techs = await prisma.technician.findMany({
        where: { id: { in: allowedIds }, companyId: session.companyId ?? "__none__" },
        select: { id: true },
      });
      allowedIds = techs.map((t) => t.id);
    }
    // Conformité bloquante : médical dépassé / habilitation expirée -> refus (override admin).
    const blocked = await blockingTechnicians(allowedIds, body.force === true && session.role === "admin");
    if (blocked.length > 0) {
      return NextResponse.json(
        { error: "Techniciens non conformes — affectation bloquée", blocked },
        { status: 409 }
      );
    }
    data.technicians = replaceIds
      ? { set: allowedIds.map((tid) => ({ id: tid })) }
      : { connect: allowedIds.map((tid) => ({ id: tid })) };
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
  setTenantContext(session.tenantId);
  const { id } = await params;

  const existing = await prisma.project.findFirst({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  if (!canAccess(session, existing.companyId)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  await prisma.project.deleteMany({ where: { id } });
  await auditLog({
    userId: session.id,
    action: "delete",
    entityType: "project",
    entityId: id,
    details: existing.title,
  });
  return NextResponse.json({ ok: true });
}
