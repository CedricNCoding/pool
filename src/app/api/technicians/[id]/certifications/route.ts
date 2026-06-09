import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, canAccessCompany } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;
  const body = await req.json();

  const tech = await prisma.technician.findUnique({ where: { id } });
  if (!tech) return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  if (!canAccessCompany(session, tech.companyId)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const cert = await prisma.technicianCertification.upsert({
    where: {
      technicianId_certificationId: {
        technicianId: id,
        certificationId: body.certificationId,
      },
    },
    update: {
      obtainedDate: new Date(body.obtainedDate),
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      certificateNumber: body.certificateNumber || null,
      status: "active",
    },
    create: {
      technicianId: id,
      certificationId: body.certificationId,
      obtainedDate: new Date(body.obtainedDate),
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      certificateNumber: body.certificateNumber || null,
    },
    include: { certification: true },
  });

  return NextResponse.json(cert, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;
  const { certificationId } = await req.json();

  const tech = await prisma.technician.findUnique({ where: { id } });
  if (!tech) return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  if (!canAccessCompany(session, tech.companyId)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  await prisma.technicianCertification.delete({
    where: {
      technicianId_certificationId: {
        technicianId: id,
        certificationId,
      },
    },
  });

  return NextResponse.json({ ok: true });
}
