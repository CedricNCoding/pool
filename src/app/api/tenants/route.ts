import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperadmin, hashPassword } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";

// Super admin uniquement. Liste / creation de tenants (clients).
export async function GET() {
  await requireSuperadmin();
  setTenantContext(null); // acces transverse
  const tenants = await prisma.tenant.findMany({
    include: { _count: { select: { users: true, companies: true, technicians: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(tenants);
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

// Clone le referentiel (categories + competences + certifications) d'un tenant
// modele vers un nouveau tenant.
async function cloneCatalog(fromTenantId: string, toTenantId: string) {
  const cats = await prisma.skillCategory.findMany({ where: { tenantId: fromTenantId } });
  const catMap = new Map<string, string>();
  for (const c of cats) {
    const nc = await prisma.skillCategory.create({
      data: { name: c.name, color: c.color, icon: c.icon, order: c.order, tenantId: toTenantId },
    });
    catMap.set(c.id, nc.id);
  }
  const skills = await prisma.skill.findMany({ where: { tenantId: fromTenantId } });
  for (const s of skills) {
    const newCat = catMap.get(s.categoryId);
    if (!newCat) continue;
    await prisma.skill.create({
      data: { name: s.name, description: s.description, order: s.order, categoryId: newCat, tenantId: toTenantId },
    });
  }
  const certs = await prisma.certification.findMany({ where: { tenantId: fromTenantId } });
  if (certs.length) {
    await prisma.certification.createMany({
      data: certs.map((c) => ({
        name: c.name, issuer: c.issuer, description: c.description, validityMonths: c.validityMonths,
        category: c.category, color: c.color, level: c.level, order: c.order, tenantId: toTenantId,
      })),
    });
  }
  return { categories: cats.length, skills: skills.length, certifications: certs.length };
}

export async function POST(req: NextRequest) {
  await requireSuperadmin();
  setTenantContext(null);
  const body = await req.json();

  const name = (body.name ?? "").trim();
  const adminEmail = (body.adminEmail ?? "").trim().toLowerCase();
  const adminPassword = body.adminPassword ?? "";
  if (!name || !adminEmail || !adminPassword) {
    return NextResponse.json({ error: "Nom, email et mot de passe admin requis" }, { status: 400 });
  }
  if (adminPassword.length < 8) {
    return NextResponse.json({ error: "Mot de passe : 8 caracteres minimum" }, { status: 400 });
  }

  // Email global unique
  const dupUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (dupUser) return NextResponse.json({ error: "Cet email est deja utilise" }, { status: 409 });

  let slug = slugify(name) || "tenant";
  if (await prisma.tenant.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

  const tenant = await prisma.tenant.create({ data: { name, slug, status: "active" } });

  // Clonage du referentiel depuis le tenant modele (Demo si present, sinon aucun)
  const template = body.cloneFromSlug
    ? await prisma.tenant.findUnique({ where: { slug: String(body.cloneFromSlug) } })
    : await prisma.tenant.findUnique({ where: { slug: "demo" } });
  let cloned = { categories: 0, skills: 0, certifications: 0 };
  if (template) cloned = await cloneCatalog(template.id, tenant.id);

  // Admin du tenant
  await prisma.user.create({
    data: {
      email: adminEmail,
      name: body.adminName?.trim() || "Administrateur",
      passwordHash: await hashPassword(adminPassword),
      role: "admin",
      tenantId: tenant.id,
      isActive: true,
    },
  });

  return NextResponse.json({ tenant, cloned }, { status: 201 });
}
