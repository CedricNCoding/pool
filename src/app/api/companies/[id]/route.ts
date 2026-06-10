import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireAdmin, canAccessCompany } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { auditLog } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const company = await prisma.company.findFirst({
    where: { id },
    include: {
      agencies: { orderBy: { name: "asc" } },
      _count: { select: { technicians: true } },
    },
  });
  if (!company) return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  if (!canAccessCompany(session, company.id)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }
  return NextResponse.json(company);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.company.findFirst({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Non trouve" }, { status: 404 });

  const num = (v: unknown) =>
    v === "" || v === null || v === undefined ? null : parseFloat(String(v));

  const company = await prisma.company.update({
    where: { id },
    data: {
      name: body.name?.trim() || existing.name,
      siret: body.siret !== undefined ? body.siret || null : existing.siret,
      address: body.address !== undefined ? body.address || null : existing.address,
      city: body.city !== undefined ? body.city || null : existing.city,
      country: body.country || existing.country,
      postalCode: body.postalCode !== undefined ? body.postalCode || null : existing.postalCode,
      lat: body.lat !== undefined ? num(body.lat) : existing.lat,
      lng: body.lng !== undefined ? num(body.lng) : existing.lng,
      phone: body.phone !== undefined ? body.phone || null : existing.phone,
      email: body.email !== undefined ? body.email || null : existing.email,
      color: body.color || existing.color,
    },
  });

  await auditLog({
    userId: session.id,
    action: "update",
    entityType: "company",
    entityId: id,
    details: company.name,
  });
  return NextResponse.json(company);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  setTenantContext(session.tenantId);
  const { id } = await params;

  const company = await prisma.company.findFirst({
    where: { id },
    include: { _count: { select: { technicians: true, users: true } } },
  });
  if (!company) return NextResponse.json({ error: "Non trouve" }, { status: 404 });

  if (company._count.technicians > 0 || company._count.users > 0) {
    return NextResponse.json(
      {
        error:
          "Impossible de supprimer : des techniciens ou utilisateurs y sont rattaches. Deplacez-les d'abord.",
      },
      { status: 409 }
    );
  }

  await prisma.company.deleteMany({ where: { id } }); // agences supprimees en cascade

  await auditLog({
    userId: session.id,
    action: "delete",
    entityType: "company",
    entityId: id,
    details: company.name,
  });
  return NextResponse.json({ ok: true });
}
