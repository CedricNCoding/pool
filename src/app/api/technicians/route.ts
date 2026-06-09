import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, canAccessCompany } from "@/lib/auth";
import { auditLog } from "@/lib/audit";
import { haversineDistance } from "@/lib/geo";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  const url = new URL(req.url);

  const search = url.searchParams.get("search") || "";
  const companyId = url.searchParams.get("companyId");
  const service = url.searchParams.get("service");
  const skillId = url.searchParams.get("skillId");
  const skillLevel = url.searchParams.get("skillLevel");
  const certificationId = url.searchParams.get("certificationId");
  const contractType = url.searchParams.get("contractType");
  const isActive = url.searchParams.get("isActive");
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);

  const where: Record<string, unknown> = {};

  if (session.role !== "admin" && session.companyId) {
    where.companyId = session.companyId;
  } else if (companyId) {
    where.companyId = companyId;
  }

  if (service) where.service = service;
  if (contractType) where.contractType = contractType;
  if (isActive !== null && isActive !== undefined && isActive !== "") {
    where.isActive = isActive === "true";
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
    ];
  }

  if (skillId) {
    where.skills = {
      some: {
        skillId,
        ...(skillLevel ? { level: { gte: parseInt(skillLevel) } } : {}),
      },
    };
  }

  if (certificationId) {
    where.certifications = {
      some: { certificationId, status: { not: "revoked" } },
    };
  }

  // Recherche d'equipe : plusieurs criteres en ET.
  //   skillsAll = "skillId:minLevel,skillId:minLevel"  (niveau optionnel)
  //   certsAll  = "certId,certId"
  const skillsAll = url.searchParams.get("skillsAll");
  const certsAll = url.searchParams.get("certsAll");
  const andClauses: Record<string, unknown>[] = [];
  if (skillsAll) {
    for (const part of skillsAll.split(",").filter(Boolean)) {
      const [sid, lvl] = part.split(":");
      const lvlNum = parseInt(lvl);
      andClauses.push({
        skills: {
          some: {
            skillId: sid,
            ...(Number.isFinite(lvlNum) && lvlNum > 0
              ? { level: { gte: lvlNum } }
              : {}),
          },
        },
      });
    }
  }
  if (certsAll) {
    for (const cid of certsAll.split(",").filter(Boolean)) {
      andClauses.push({
        certifications: { some: { certificationId: cid, status: { not: "revoked" } } },
      });
    }
  }
  if (andClauses.length > 0) where.AND = andClauses;

  const include = {
    company: { select: { id: true, name: true, color: true } },
    agency: { select: { id: true, name: true, city: true } },
    skills: { include: { skill: { include: { category: true } } } },
    certifications: { include: { certification: true } },
  } as const;

  // --- Recherche par zone geographique --------------------------------------
  // lat/lng = point recherche. geoMode "cover" (defaut) = techniciens dont la
  // zone d'intervention couvre ce point ; "near" = bases a <= geoRadius km.
  const lat = parseFloat(url.searchParams.get("lat") || "");
  const lng = parseFloat(url.searchParams.get("lng") || "");
  const geoRadius = parseFloat(url.searchParams.get("geoRadius") || "50");
  const geoMode = url.searchParams.get("geoMode") === "near" ? "near" : "cover";

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    const all = await prisma.technician.findMany({
      where,
      include,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    const matched = all
      .filter((t) => t.interventionCenterLat != null && t.interventionCenterLng != null)
      .map((t) => ({
        ...t,
        distanceKm:
          Math.round(
            haversineDistance(t.interventionCenterLat!, t.interventionCenterLng!, lat, lng) * 10
          ) / 10,
      }))
      .filter((t) =>
        geoMode === "near"
          ? t.distanceKm <= geoRadius
          : t.distanceKm <= t.interventionRadiusKm
      )
      .sort((a, b) => a.distanceKm - b.distanceKm);

    const total = matched.length;
    const data = matched.slice((page - 1) * limit, (page - 1) * limit + limit);
    return NextResponse.json({
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  }

  const [technicians, total] = await Promise.all([
    prisma.technician.findMany({
      where,
      include,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.technician.count({ where }),
  ]);

  return NextResponse.json({
    data: technicians,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  const body = await req.json();

  if (session.role !== "admin" && session.companyId !== body.companyId) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const technician = await prisma.technician.create({
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone || null,
      companyId: body.companyId,
      agencyId: body.agencyId || null,
      service: body.service || "tech",
      contractType: body.contractType || "CDI",
      contractStart: body.contractStart ? new Date(body.contractStart) : null,
      contractEnd: body.contractEnd ? new Date(body.contractEnd) : null,
      interventionCenterLat: body.interventionCenterLat || null,
      interventionCenterLng: body.interventionCenterLng || null,
      interventionRadiusKm: body.interventionRadiusKm || 50,
      notes: body.notes || null,
    },
    include: {
      company: true,
      agency: true,
    },
  });

  await auditLog({
    userId: session.id,
    action: "create",
    entityType: "technician",
    entityId: technician.id,
    details: `${technician.firstName} ${technician.lastName}`,
  });

  return NextResponse.json(technician, { status: 201 });
}
