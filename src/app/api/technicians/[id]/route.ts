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

  const technician = await prisma.technician.findUnique({
    where: { id },
    include: {
      company: true,
      agency: true,
      skills: {
        include: { skill: { include: { category: true } } },
        orderBy: { skill: { category: { order: "asc" } } },
      },
      certifications: {
        include: { certification: true },
        orderBy: { certification: { category: "asc" } },
      },
      tags: { orderBy: { name: "asc" } },
    },
  });

  if (!technician) {
    return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  }

  if (!canAccessCompany(session, technician.companyId)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  return NextResponse.json(technician);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.technician.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  }
  if (!canAccessCompany(session, existing.companyId)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const updated = await prisma.technician.update({
    where: { id },
    data: {
      firstName: body.firstName ?? existing.firstName,
      lastName: body.lastName ?? existing.lastName,
      email: body.email ?? existing.email,
      phone: body.phone !== undefined ? body.phone : existing.phone,
      agencyId: body.agencyId !== undefined ? body.agencyId : existing.agencyId,
      service: body.service ?? existing.service,
      contractType: body.contractType ?? existing.contractType,
      contractStart: body.contractStart
        ? new Date(body.contractStart)
        : existing.contractStart,
      contractEnd: body.contractEnd
        ? new Date(body.contractEnd)
        : body.contractEnd === null
          ? null
          : existing.contractEnd,
      interventionCenterLat:
        body.interventionCenterLat ?? existing.interventionCenterLat,
      interventionCenterLng:
        body.interventionCenterLng ?? existing.interventionCenterLng,
      interventionRadiusKm:
        body.interventionRadiusKm ?? existing.interventionRadiusKm,
      isActive: body.isActive ?? existing.isActive,
      availabilityStatus: body.availabilityStatus ?? existing.availabilityStatus,
      availableUntil:
        body.availableUntil !== undefined
          ? body.availableUntil
            ? new Date(body.availableUntil)
            : null
          : existing.availableUntil,
      departureDate: body.departureDate
        ? new Date(body.departureDate)
        : existing.departureDate,
      notes: body.notes !== undefined ? body.notes : existing.notes,
      // Etiquettes : remplace l'ensemble par les noms fournis (cree les manquants)
      ...(Array.isArray(body.tags)
        ? {
            tags: {
              set: [],
              connectOrCreate: [
                ...new Set(
                  (body.tags as string[])
                    .map((t) => String(t).trim())
                    .filter(Boolean)
                ),
              ].map((name) => ({ where: { name }, create: { name } })),
            },
          }
        : {}),
    },
    include: { company: true, agency: true },
  });

  if (body.isActive === false && !existing.departureDate) {
    const deletionDate = new Date();
    deletionDate.setMonth(deletionDate.getMonth() + 12);
    await prisma.technician.update({
      where: { id },
      data: {
        departureDate: new Date(),
        scheduledDeletionDate: deletionDate,
      },
    });
  }

  await auditLog({
    userId: session.id,
    action: "update",
    entityType: "technician",
    entityId: id,
    details: JSON.stringify(body),
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;

  const existing = await prisma.technician.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  }
  if (!canAccessCompany(session, existing.companyId)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  await prisma.technician.delete({ where: { id } });

  await auditLog({
    userId: session.id,
    action: "delete",
    entityType: "technician",
    entityId: id,
    details: `${existing.firstName} ${existing.lastName}`,
  });

  return NextResponse.json({ ok: true });
}
