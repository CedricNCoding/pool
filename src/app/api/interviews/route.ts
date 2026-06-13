import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, canAccessCompany } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { auditLog } from "@/lib/audit";

export async function GET() {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const isAdmin = session.role === "admin" || session.role === "superadmin";
  const list = await prisma.interview.findMany({
    where: isAdmin ? {} : { technician: { companyId: session.companyId ?? "__none__" } },
    include: { technician: { select: { id: true, firstName: true, lastName: true, company: { select: { name: true } } } } },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const body = await req.json();
  const technicianId = String(body.technicianId ?? "");
  if (!technicianId || !body.date) return NextResponse.json({ error: "Technicien et date requis" }, { status: 400 });
  const tech = await prisma.technician.findFirst({ where: { id: technicianId } });
  if (!tech) return NextResponse.json({ error: "Technicien introuvable" }, { status: 404 });
  if (!canAccessCompany(session, tech.companyId)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const iv = await prisma.interview.create({
    data: { technicianId, date: new Date(body.date), templateId: body.templateId || null, createdById: session.id },
  });
  await auditLog({ userId: session.id, action: "create", entityType: "interview", entityId: iv.id, details: `${tech.firstName} ${tech.lastName}` });
  return NextResponse.json(iv, { status: 201 });
}
