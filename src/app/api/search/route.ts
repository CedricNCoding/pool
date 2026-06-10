import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";

  if (q.length < 2) {
    return NextResponse.json({ technicians: [], companies: [], skills: [] });
  }

  const companyFilter =
    session.role !== "admin" && session.companyId
      ? { companyId: session.companyId }
      : {};

  const [technicians, companies, skills, certifications] = await Promise.all([
    prisma.technician.findMany({
      where: {
        ...companyFilter,
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { email: { contains: q } },
        ],
      },
      include: { company: { select: { name: true, color: true } } },
      take: 10,
    }),
    prisma.company.findMany({
      where: { name: { contains: q } },
      take: 5,
    }),
    prisma.skill.findMany({
      where: { name: { contains: q } },
      include: { category: true },
      take: 10,
    }),
    prisma.certification.findMany({
      where: { name: { contains: q } },
      take: 10,
    }),
  ]);

  return NextResponse.json({ technicians, companies, skills, certifications });
}
