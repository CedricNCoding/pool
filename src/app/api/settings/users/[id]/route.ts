import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { auditLog } from "@/lib/audit";

// Edition d'un utilisateur par un administrateur.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.user.findFirst({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Non trouve" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.email !== undefined) {
    const email = String(body.email).trim().toLowerCase();
    if (email && email !== existing.email) {
      const dup = await prisma.user.findFirst({ where: { email } });
      if (dup) return NextResponse.json({ error: "Email deja utilise" }, { status: 400 });
      data.email = email;
    }
  }
  if (body.role === "admin" || body.role === "manager") {
    data.role = body.role;
    // Un admin n'est pas restreint a une entreprise ; un gestionnaire l'est.
    data.companyId = body.role === "manager" ? body.companyId || null : null;
  } else if (body.companyId !== undefined) {
    data.companyId = body.companyId || null;
  }
  if (body.isActive !== undefined) data.isActive = !!body.isActive;
  if (body.password) {
    if (String(body.password).length < 8) {
      return NextResponse.json({ error: "Mot de passe : 8 caracteres minimum" }, { status: 400 });
    }
    data.passwordHash = await hashPassword(String(body.password));
  }

  const user = await prisma.user.update({ where: { id }, data });
  await auditLog({
    userId: session.id,
    action: "update",
    entityType: "user",
    entityId: id,
    details: `Utilisateur "${user.name}" modifie`,
  });
  return NextResponse.json({ ...user, passwordHash: undefined });
}
