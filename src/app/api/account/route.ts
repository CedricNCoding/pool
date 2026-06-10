import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, hashPassword, verifyPassword } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { auditLog } from "@/lib/audit";

// Espace « Mon compte » : l'utilisateur connecte modifie son email / mot de passe.
// Toute modification exige le mot de passe actuel.
export async function PATCH(req: NextRequest) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const body = await req.json();

  const user = await prisma.user.findFirst({ where: { id: session.id } });
  if (!user) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });

  const currentPassword = String(body.currentPassword ?? "");
  if (!currentPassword || !(await verifyPassword(currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 403 });
  }

  const data: Record<string, unknown> = {};

  if (body.email !== undefined) {
    const email = String(body.email).trim().toLowerCase();
    if (email && email !== user.email) {
      const dup = await prisma.user.findFirst({ where: { email } });
      if (dup) return NextResponse.json({ error: "Email deja utilise" }, { status: 400 });
      data.email = email;
    }
  }

  if (body.newPassword) {
    if (String(body.newPassword).length < 8) {
      return NextResponse.json({ error: "Nouveau mot de passe : 8 caracteres minimum" }, { status: 400 });
    }
    data.passwordHash = await hashPassword(String(body.newPassword));
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Aucune modification" }, { status: 400 });
  }

  await prisma.user.update({ where: { id: user.id }, data });
  await auditLog({
    userId: user.id,
    action: "update",
    entityType: "user",
    entityId: user.id,
    details: "Compte personnel mis a jour",
  });

  // Si l'email change, le token (qui porte l'email) devient obsolete -> on
  // signale au client de se reconnecter.
  return NextResponse.json({ ok: true, emailChanged: !!data.email });
}
