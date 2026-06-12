import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { requireSession, canAccessCompany } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { UPLOAD_DIR, MAX_UPLOAD_BYTES, ALLOWED_MIME } from "@/lib/uploads";

// Multipart : champs de la certification + PDF justificatif optionnel (`file`).
// Le PDF est stocke comme Document (categorie « certificat ») et lie a la cert.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;

  const tech = await prisma.technician.findFirst({ where: { id } });
  if (!tech) return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  if (!canAccessCompany(session, tech.companyId)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const fd = await req.formData();
  const certificationId = String(fd.get("certificationId") || "");
  const obtainedDate = String(fd.get("obtainedDate") || "");
  const expiryDate = String(fd.get("expiryDate") || "");
  const certificateNumber = String(fd.get("certificateNumber") || "");
  const file = fd.get("file");

  if (!certificationId || !obtainedDate) {
    return NextResponse.json({ error: "Certification et date d'obtention requises" }, { status: 400 });
  }

  // Justificatif optionnel -> Document (coffre-fort)
  let documentId: string | null = null;
  if (file instanceof File && file.size > 0) {
    const ext = ALLOWED_MIME[file.type];
    if (!ext) {
      return NextResponse.json({ error: "Type de fichier non autorise (PDF, image, Word)" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 400 });
    }
    const certDef = await prisma.certification.findFirst({ where: { id: certificationId }, select: { name: true } });
    const buf = Buffer.from(await file.arrayBuffer());
    const fileName = `${randomUUID()}${ext}`;
    // Même convention que le coffre-fort : UPLOAD_DIR/{technicianId}/{fileName}
    // (le service /api/documents/[id]/file lit ce chemin).
    const dir = path.join(UPLOAD_DIR, id);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, fileName), buf);
    const doc = await prisma.document.create({
      data: {
        technicianId: id,
        category: "certificat",
        title: certDef?.name ? `Certificat — ${certDef.name}` : "Certificat",
        fileName,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        uploadedById: session.id,
      },
    });
    documentId = doc.id;
  }

  const cert = await prisma.technicianCertification.upsert({
    where: {
      technicianId_certificationId: { technicianId: id, certificationId },
    },
    update: {
      obtainedDate: new Date(obtainedDate),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      certificateNumber: certificateNumber || null,
      status: "active",
      ...(documentId ? { documentId } : {}),
    },
    create: {
      technicianId: id,
      certificationId,
      obtainedDate: new Date(obtainedDate),
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      certificateNumber: certificateNumber || null,
      documentId,
    },
    include: { certification: true, document: { select: { id: true } } },
  });

  return NextResponse.json(cert, { status: 201 });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const { certificationId } = await req.json();

  const tech = await prisma.technician.findFirst({ where: { id } });
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
