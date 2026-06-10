import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";

// Recherche globale (palette Cmd+K) : techniciens, entreprises, projets, modules.
// Cloisonnee : un manager ne voit que son entreprise.
export async function GET(req: NextRequest) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ technicians: [], companies: [], projects: [], modules: [] });
  }

  const scoped = session.role !== "admin" && session.companyId;
  const companyId = session.companyId ?? "__none__";

  const [technicians, companies, projects, modules] = await Promise.all([
    prisma.technician.findMany({
      where: {
        ...(scoped ? { companyId } : {}),
        OR: [
          { firstName: { contains: q } },
          { lastName: { contains: q } },
          { email: { contains: q } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: { select: { name: true } },
      },
      take: 6,
      orderBy: { lastName: "asc" },
    }),
    prisma.company.findMany({
      where: {
        ...(scoped ? { id: companyId } : {}),
        name: { contains: q },
      },
      select: { id: true, name: true, city: true },
      take: 5,
      orderBy: { name: "asc" },
    }),
    prisma.project.findMany({
      where: {
        ...(scoped ? { companyId } : {}),
        title: { contains: q },
      },
      select: { id: true, title: true, status: true },
      take: 5,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.trainingModule.findMany({
      where: { title: { contains: q } },
      select: { id: true, title: true },
      take: 5,
      orderBy: { title: "asc" },
    }),
  ]);

  return NextResponse.json({
    technicians: technicians.map((t) => ({
      id: t.id,
      label: `${t.firstName} ${t.lastName}`,
      sub: t.company?.name ?? "",
      href: `/technicians/${t.id}`,
    })),
    companies: companies.map((c) => ({
      id: c.id,
      label: c.name,
      sub: c.city ?? "",
      href: `/companies/${c.id}`,
    })),
    projects: projects.map((p) => ({
      id: p.id,
      label: p.title,
      sub: p.status,
      href: `/projets/${p.id}`,
    })),
    modules: modules.map((m) => ({
      id: m.id,
      label: m.title,
      sub: "Module de formation",
      href: `/formation`,
    })),
  });
}
