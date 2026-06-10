import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";

// Points carte (techniciens actifs geolocalises) + leurs competences (>=1),
// pour la carte de couverture territoriale par competence.
export async function GET() {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const where =
    session.role !== "admin" && session.companyId
      ? { isActive: true, companyId: session.companyId }
      : { isActive: true };

  const techs = await prisma.technician.findMany({
    where: {
      ...where,
      interventionCenterLat: { not: null },
      interventionCenterLng: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      interventionCenterLat: true,
      interventionCenterLng: true,
      company: { select: { name: true, color: true } },
      skills: { where: { level: { gte: 1 } }, select: { skillId: true } },
    },
  });

  return NextResponse.json(
    techs.map((t) => ({
      id: t.id,
      name: `${t.firstName} ${t.lastName}`,
      lat: t.interventionCenterLat,
      lng: t.interventionCenterLng,
      company: t.company.name,
      color: t.company.color,
      skillIds: t.skills.map((s) => s.skillId),
    }))
  );
}
