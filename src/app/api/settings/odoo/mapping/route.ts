import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { auditLog } from "@/lib/audit";

// Rapprochement technicien Praxis <-> utilisateur Odoo (Béta).
export async function GET() {
  const session = await requireAdmin();
  setTenantContext(session.tenantId);
  const techs = await prisma.technician.findMany({
    where: { isActive: true },
    select: { id: true, firstName: true, lastName: true, email: true, odooUserId: true, odooUserName: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  return NextResponse.json(techs);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  setTenantContext(session.tenantId);
  const { mappings } = await req.json();
  if (!Array.isArray(mappings)) return NextResponse.json({ error: "mappings requis" }, { status: 400 });
  let saved = 0;
  for (const m of mappings) {
    if (!m.technicianId) continue;
    // updateMany = filtré par tenant (pas d'IDOR inter-tenant).
    const r = await prisma.technician.updateMany({
      where: { id: m.technicianId },
      data: { odooUserId: m.odooUserId != null && m.odooUserId !== "" ? Number(m.odooUserId) : null, odooUserName: m.odooUserName?.trim() || null },
    });
    saved += r.count;
  }
  await auditLog({ userId: session.id, action: "update", entityType: "odoo_mapping", details: `${saved} rapprochement(s)` });
  return NextResponse.json({ saved });
}
