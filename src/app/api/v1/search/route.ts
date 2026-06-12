import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateApiKey } from "@/lib/api-key";
import { setTenantContext } from "@/lib/tenant-context";
import { haversineDistance } from "@/lib/geo";
import { auditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Cle API requise (Authorization: Bearer avp_...)" },
      { status: 401 }
    );
  }

  const apiKey = await validateApiKey(authHeader.substring(7));
  if (!apiKey) {
    return NextResponse.json(
      { error: "Cle API invalide ou expiree" },
      { status: 401 }
    );
  }
  // Cloisonnement : la clé est rattachée à un tenant -> toutes les requêtes
  // Prisma de cette requête sont filtrées par ce tenant.
  setTenantContext(apiKey.tenantId);

  const url = new URL(req.url);
  const skillName = url.searchParams.get("skill");
  const certName = url.searchParams.get("certification");
  const lat = parseFloat(url.searchParams.get("lat") || "");
  const lng = parseFloat(url.searchParams.get("lng") || "");
  const radiusKm = parseInt(url.searchParams.get("radius") || "100");
  const minLevel = parseInt(url.searchParams.get("minLevel") || "1");

  const where: Record<string, unknown> = { isActive: true };

  if (apiKey.companyId) {
    where.companyId = apiKey.companyId;
  }

  if (skillName) {
    where.skills = {
      some: {
        skill: { name: { contains: skillName } },
        level: { gte: minLevel },
      },
    };
  }

  if (certName) {
    where.certifications = {
      some: {
        certification: { name: { contains: certName } },
        status: { not: "revoked" },
      },
    };
  }

  let technicians = await prisma.technician.findMany({
    where,
    include: {
      company: { select: { name: true, city: true } },
      skills: { include: { skill: { include: { category: true } } } },
      certifications: {
        include: { certification: true },
        where: { status: { not: "revoked" } },
      },
    },
  });

  if (!isNaN(lat) && !isNaN(lng)) {
    technicians = technicians.filter((t) => {
      if (!t.interventionCenterLat || !t.interventionCenterLng) return false;
      const distance = haversineDistance(
        lat,
        lng,
        t.interventionCenterLat,
        t.interventionCenterLng
      );
      return distance <= Math.min(radiusKm, t.interventionRadiusKm);
    });
  }

  await auditLog({
    action: "api_access",
    entityType: "search",
    details: JSON.stringify({
      apiKeyId: apiKey.id,
      params: { skillName, certName, lat, lng, radiusKm },
    }),
  });

  const results = technicians.map((t) => ({
    id: t.id,
    name: `${t.firstName} ${t.lastName}`,
    email: t.email,
    company: t.company.name,
    companyCity: t.company.city,
    service: t.service,
    skills: t.skills.map((s) => ({
      name: s.skill.name,
      category: s.skill.category.name,
      level: s.level,
    })),
    certifications: t.certifications.map((c) => ({
      name: c.certification.name,
      issuer: c.certification.issuer,
      expiryDate: c.expiryDate,
      status: c.status,
    })),
    interventionRadius: t.interventionRadiusKm,
    ...(t.interventionCenterLat && {
      location: {
        lat: t.interventionCenterLat,
        lng: t.interventionCenterLng,
      },
    }),
  }));

  return NextResponse.json({
    count: results.length,
    results,
  });
}
