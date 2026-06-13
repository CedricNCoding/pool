import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, canAccessCompany } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { auditLog } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const iv = await prisma.interview.findFirst({
    where: { id },
    include: { technician: { select: { id: true, firstName: true, lastName: true, service: true, companyId: true, company: { select: { name: true } } } } },
  });
  if (!iv) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!canAccessCompany(session, iv.technician.companyId)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  let template = null;
  if (iv.templateId) template = await prisma.interviewTemplate.findFirst({ where: { id: iv.templateId } });
  return NextResponse.json({ ...iv, template });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const body = await req.json();
  const iv = await prisma.interview.findFirst({ where: { id }, include: { technician: { select: { companyId: true } } } });
  if (!iv) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!canAccessCompany(session, iv.technician.companyId)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const data: Record<string, unknown> = {};
  if (body.managerNotes !== undefined) data.managerNotes = body.managerNotes;
  if (body.employeeNotes !== undefined) data.employeeNotes = body.employeeNotes;
  if (body.objectives !== undefined) data.objectives = body.objectives;
  if (body.answers !== undefined) data.answers = typeof body.answers === "string" ? body.answers : JSON.stringify(body.answers);
  if (body.date !== undefined) data.date = new Date(body.date);
  if (body.status !== undefined) data.status = body.status;
  if (body.status === "signe") data.signedAt = new Date();
  await prisma.interview.update({ where: { id }, data });
  await auditLog({ userId: session.id, action: "update", entityType: "interview", entityId: id, details: body.status || "" });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const iv = await prisma.interview.findFirst({ where: { id }, include: { technician: { select: { companyId: true } } } });
  if (!iv) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  if (!canAccessCompany(session, iv.technician.companyId)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  await prisma.interview.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
