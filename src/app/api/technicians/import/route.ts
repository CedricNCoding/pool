import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const body = await req.json();

  let company = await prisma.company.findFirst({
    where: { name: body.companyName },
  });

  if (!company) {
    if (session.role !== "admin") {
      return NextResponse.json(
        { error: `Entreprise "${body.companyName}" introuvable` },
        { status: 400 }
      );
    }
    company = await prisma.company.create({
      data: { name: body.companyName },
    });
  }

  if (session.role !== "admin" && session.companyId !== company.id) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const technician = await prisma.technician.create({
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone || null,
      companyId: company.id,
      service: body.service || "tech",
      contractType: body.contractType || "CDI",
      contractStart: body.contractStart ? new Date(body.contractStart) : null,
      contractEnd: body.contractEnd ? new Date(body.contractEnd) : null,
      interventionCenterLat: company.lat,
      interventionCenterLng: company.lng,
    },
  });

  await auditLog({
    userId: session.id,
    action: "import",
    entityType: "technician",
    entityId: technician.id,
    details: `Import CSV: ${technician.firstName} ${technician.lastName}`,
  });

  return NextResponse.json(technician, { status: 201 });
}
