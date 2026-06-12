import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateApiKey } from "@/lib/api-key";
import { setTenantContext } from "@/lib/tenant-context";

// API publique v1 — liste des techniciens (cloisonnée par la clé).
// Auth : header `Authorization: Bearer avp_...` (ou ?key=avp_... pour les
// intégrations sans en-têtes). La clé porte un tenant (+ éventuellement une
// société) : la réponse est limitée à ce périmètre.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const header = req.headers.get("authorization");
  const raw = header?.startsWith("Bearer ") ? header.substring(7) : url.searchParams.get("key");
  if (!raw) return NextResponse.json({ error: "Cle API requise" }, { status: 401 });

  const apiKey = await validateApiKey(raw);
  if (!apiKey) return NextResponse.json({ error: "Cle API invalide ou expiree" }, { status: 401 });
  setTenantContext(apiKey.tenantId);

  const where: Record<string, unknown> = { isActive: true };
  if (apiKey.companyId) where.companyId = apiKey.companyId;

  const techs = await prisma.technician.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      service: true,
      availabilityStatus: true,
      company: { select: { name: true } },
      skills: { select: { level: true, skill: { select: { name: true } } } },
      certifications: {
        where: { status: { not: "revoked" } },
        select: { expiryDate: true, certification: { select: { name: true } } },
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  return NextResponse.json({
    data: techs.map((t) => ({
      id: t.id,
      firstName: t.firstName,
      lastName: t.lastName,
      email: t.email,
      service: t.service,
      availability: t.availabilityStatus,
      company: t.company.name,
      skills: t.skills.map((s) => ({ name: s.skill.name, level: s.level })),
      certifications: t.certifications.map((c) => ({ name: c.certification.name, expiryDate: c.expiryDate })),
    })),
  });
}
