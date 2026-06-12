import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";

// Nombre de demandes de renfort « en attente » — pour le badge de la sidebar.
// Admin : à arbitrer dans le tenant. Gestionnaire : ses propres demandes en attente.
export async function GET() {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const isAdmin = session.role === "admin" || session.role === "superadmin";
  const where = isAdmin
    ? { status: "pending" }
    : { status: "pending", requesterUserId: session.id };
  const pending = await prisma.assistanceRequest.count({ where });
  return NextResponse.json({ pending });
}
