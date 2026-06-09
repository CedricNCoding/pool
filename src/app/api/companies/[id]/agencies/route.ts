import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  const { id } = await params;
  const body = await req.json();

  const name = (body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Nom obligatoire" }, { status: 400 });

  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) return NextResponse.json({ error: "Entreprise introuvable" }, { status: 404 });

  const num = (v: unknown) =>
    v === "" || v === null || v === undefined ? null : parseFloat(String(v));

  const agency = await prisma.agency.create({
    data: {
      companyId: id,
      name,
      address: body.address || null,
      city: body.city || null,
      country: body.country || "France",
      postalCode: body.postalCode || null,
      lat: num(body.lat),
      lng: num(body.lng),
      phone: body.phone || null,
    },
  });

  await auditLog({
    userId: session.id,
    action: "create",
    entityType: "agency",
    entityId: agency.id,
    details: `${name} (${company.name})`,
  });
  return NextResponse.json(agency, { status: 201 });
}
