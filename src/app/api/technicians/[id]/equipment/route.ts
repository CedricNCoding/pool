import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, canAccessCompany } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";

// Dotation EPI/matériel d'un technicien (en cours + restitué).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;

  const tech = await prisma.technician.findFirst({ where: { id } });
  if (!tech) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!canAccessCompany(session, tech.companyId)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const assignments = await prisma.equipmentAssignment.findMany({
    where: { technicianId: id },
    include: { equipment: { select: { id: true, name: true, category: true, serialNumber: true, brand: true, model: true, expiryDate: true, nextCheckDate: true, status: true } } },
    orderBy: { assignedAt: "desc" },
  });

  return NextResponse.json({
    current: assignments.filter((a) => !a.returnedAt),
    past: assignments.filter((a) => a.returnedAt),
  });
}
