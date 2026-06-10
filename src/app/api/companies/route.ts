import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { auditLog } from "@/lib/audit";

export async function GET() {
  const session = await requireSession();
  setTenantContext(session.tenantId);

  const where =
    session.role === "admin"
      ? {}
      : session.companyId
        ? { id: session.companyId }
        : {};

  const companies = await prisma.company.findMany({
    where,
    include: {
      agencies: true,
      _count: { select: { technicians: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(companies);
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const body = await req.json();

  const company = await prisma.company.create({
    data: {
      name: body.name,
      siret: body.siret || null,
      address: body.address || null,
      city: body.city || null,
      country: body.country || "France",
      postalCode: body.postalCode || null,
      lat: body.lat || null,
      lng: body.lng || null,
      phone: body.phone || null,
      email: body.email || null,
      color: body.color || "#3B82F6",
    },
  });

  await auditLog({
    userId: session.id,
    action: "create",
    entityType: "company",
    entityId: company.id,
    details: company.name,
  });

  return NextResponse.json(company, { status: 201 });
}
