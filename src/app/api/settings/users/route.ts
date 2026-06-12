import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { hashPassword } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

export async function GET() {
  setTenantContext((await requireAdmin()).tenantId);
  const users = await prisma.user.findMany({
    include: { company: { select: { name: true, color: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(
    users.map((u) => ({ ...u, passwordHash: undefined }))
  );
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  setTenantContext(session.tenantId);
  const body = await req.json();

  if (!body.email || !body.name?.trim()) {
    return NextResponse.json({ error: "Nom et email requis" }, { status: 400 });
  }
  if (!body.password || String(body.password).length < 8) {
    return NextResponse.json({ error: "Mot de passe : 8 caractères minimum" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({ where: { email: body.email } });
  if (existing) {
    return NextResponse.json({ error: "Email deja utilise" }, { status: 400 });
  }

  const passwordHash = await hashPassword(body.password);

  const user = await prisma.user.create({
    data: {
      email: body.email,
      name: body.name,
      passwordHash,
      role: body.role || "manager",
      companyId: body.companyId || null,
    },
  });

  await auditLog({
    userId: session.id,
    action: "create",
    entityType: "user",
    entityId: user.id,
    details: `Utilisateur "${user.name}" cree`,
  });

  return NextResponse.json({ ...user, passwordHash: undefined }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  setTenantContext(session.tenantId);
  const { id } = await req.json();

  if (id === session.id) {
    return NextResponse.json({ error: "Impossible de supprimer votre propre compte" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });

  await auditLog({
    userId: session.id,
    action: "delete",
    entityType: "user",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}
