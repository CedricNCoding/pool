import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";

// Journal d'audit pour une entite donnee (technicien, projet...).
// GET ?entityType=technician&entityId=...  -> dernieres modifications.
export async function GET(req: NextRequest) {
  setTenantContext((await requireSession()).tenantId);
  const url = new URL(req.url);
  const entityType = url.searchParams.get("entityType");
  const entityId = url.searchParams.get("entityId");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "15"), 50);

  if (!entityType || !entityId) {
    return NextResponse.json({ error: "entityType et entityId requis" }, { status: 400 });
  }

  const logs = await prisma.auditLog.findMany({
    where: { entityType, entityId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(
    logs.map((l) => ({
      id: l.id,
      action: l.action,
      details: l.details,
      user: l.user?.name ?? "Systeme",
      createdAt: l.createdAt,
    }))
  );
}
