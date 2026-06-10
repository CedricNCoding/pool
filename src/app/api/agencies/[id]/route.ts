import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { auditLog } from "@/lib/audit";

const num = (v: unknown) =>
  v === "" || v === null || v === undefined ? null : parseFloat(String(v));

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.agency.findFirst({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Non trouve" }, { status: 404 });

  const agency = await prisma.agency.update({
    where: { id },
    data: {
      name: body.name?.trim() || existing.name,
      address: body.address !== undefined ? body.address || null : existing.address,
      city: body.city !== undefined ? body.city || null : existing.city,
      postalCode: body.postalCode !== undefined ? body.postalCode || null : existing.postalCode,
      lat: body.lat !== undefined ? num(body.lat) : existing.lat,
      lng: body.lng !== undefined ? num(body.lng) : existing.lng,
      phone: body.phone !== undefined ? body.phone || null : existing.phone,
    },
  });

  await auditLog({
    userId: session.id,
    action: "update",
    entityType: "agency",
    entityId: id,
    details: agency.name,
  });
  return NextResponse.json(agency);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  setTenantContext(session.tenantId);
  const { id } = await params;

  const existing = await prisma.agency.findFirst({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Non trouve" }, { status: 404 });

  // Les techniciens de cette agence repassent au siege (agencyId = null)
  await prisma.technician.updateMany({
    where: { agencyId: id },
    data: { agencyId: null },
  });
  await prisma.agency.deleteMany({ where: { id } });

  await auditLog({
    userId: session.id,
    action: "delete",
    entityType: "agency",
    entityId: id,
    details: existing.name,
  });
  return NextResponse.json({ ok: true });
}
