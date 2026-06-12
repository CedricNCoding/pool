import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { blockingTechnicians } from "@/lib/compliance";
import { auditLog } from "@/lib/audit";

// Liste des projets (cloisonnee : admin = tout ; manager = son entreprise)
export async function GET() {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const where =
    session.role === "admin"
      ? {}
      : { companyId: session.companyId ?? "__none__" };

  const projects = await prisma.project.findMany({
    where,
    include: {
      company: { select: { name: true, color: true } },
      _count: { select: { technicians: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const body = await req.json();

  const title = (body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "Titre obligatoire" }, { status: 400 });
  }

  const technicianIds: string[] = Array.isArray(body.technicianIds)
    ? body.technicianIds
    : [];

  // Un manager ne peut composer qu'avec des techniciens de son entreprise
  let allowedIds = technicianIds;
  if (session.role !== "admin") {
    const techs = await prisma.technician.findMany({
      where: { id: { in: technicianIds }, companyId: session.companyId ?? "__none__" },
      select: { id: true },
    });
    allowedIds = techs.map((t) => t.id);
  }

  // Conformité bloquante : un technicien non à jour (visite médicale dépassée,
  // habilitation expirée) ne peut être affecté — sauf override explicite (admin).
  const blocked = await blockingTechnicians(allowedIds, body.force === true && session.role === "admin");
  if (blocked.length > 0) {
    return NextResponse.json(
      { error: "Techniciens non conformes — affectation bloquée", blocked },
      { status: 409 }
    );
  }

  const companyId =
    session.role === "admin" ? body.companyId ?? null : session.companyId ?? null;

  const project = await prisma.project.create({
    data: {
      title,
      description: body.description?.trim() || null,
      status: body.status || "actif",
      companyId,
      createdById: session.id,
      technicians: { connect: allowedIds.map((id) => ({ id })) },
    },
    include: { _count: { select: { technicians: true } } },
  });

  await auditLog({
    userId: session.id,
    action: "create",
    entityType: "project",
    entityId: project.id,
    details: title,
  });

  return NextResponse.json(project, { status: 201 });
}
