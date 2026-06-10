import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";

// Localisations des techniciens pour la carte du dashboard (leger).
export async function GET() {
  const session = await requireSession();
  setTenantContext(session.tenantId);

  const where: Record<string, unknown> = {
    isActive: true,
    interventionCenterLat: { not: null },
    interventionCenterLng: { not: null },
  };
  if (session.role !== "admin" && session.companyId) {
    where.companyId = session.companyId;
  }

  const techs = await prisma.technician.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      service: true,
      interventionCenterLat: true,
      interventionCenterLng: true,
      company: { select: { name: true, color: true } },
    },
  });

  return NextResponse.json(
    techs.map((t) => ({
      id: t.id,
      name: `${t.firstName} ${t.lastName}`,
      service: t.service,
      lat: t.interventionCenterLat,
      lng: t.interventionCenterLng,
      company: t.company.name,
      color: t.company.color,
    }))
  );
}
