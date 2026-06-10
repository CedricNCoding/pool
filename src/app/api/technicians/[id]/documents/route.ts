import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { requireSession, canAccessCompany } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { auditLog } from "@/lib/audit";
import { UPLOAD_DIR, MAX_UPLOAD_BYTES, ALLOWED_MIME } from "@/lib/uploads";

export async function GET(
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

  const docs = await prisma.document.findMany({
    where: { technicianId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(docs);
}

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

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  const ext = ALLOWED_MIME[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Type de fichier non autorise (PDF, image, Word)" },
      { status: 400 }
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `${crypto.randomUUID()}${ext}`;
  const dir = path.join(UPLOAD_DIR, id);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fileName), buffer);

  const title = (form.get("title")?.toString() || file.name).trim();
  const category = form.get("category")?.toString() || "autre";
  const expiryRaw = form.get("expiryDate")?.toString();

  const doc = await prisma.document.create({
    data: {
      technicianId: id,
      category,
      title,
      fileName,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      expiryDate: expiryRaw ? new Date(expiryRaw) : null,
      uploadedById: session.id,
    },
  });

  await auditLog({
    userId: session.id,
    action: "create",
    entityType: "document",
    entityId: doc.id,
    details: `${title} (${tech.firstName} ${tech.lastName})`,
  });

  return NextResponse.json(doc, { status: 201 });
}
