import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, canAccessCompany } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const event = await prisma.technicianEvent.findFirst({
    where: { id },
    include: { technician: { select: { companyId: true } } },
  });
  if (!event) return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  if (!canAccessCompany(session, event.technician.companyId)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }
  await prisma.technicianEvent.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
