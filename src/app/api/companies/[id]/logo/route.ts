import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { auditLog } from "@/lib/audit";

// Logo entreprise : stocké en data URL (image PNG/JPEG) dans Company.logoUrl,
// pour être embarqué directement dans les exports PDF (jsPDF).
const LOGO_MIME = new Set(["image/png", "image/jpeg"]);
const MAX_LOGO = 1 * 1024 * 1024; // 1 Mo

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  setTenantContext(session.tenantId);
  const { id } = await params;

  const company = await prisma.company.findFirst({ where: { id } });
  if (!company) return NextResponse.json({ error: "Non trouve" }, { status: 404 });

  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  if (!LOGO_MIME.has(file.type)) {
    return NextResponse.json({ error: "Logo : PNG ou JPEG uniquement" }, { status: 400 });
  }
  if (file.size > MAX_LOGO) {
    return NextResponse.json({ error: "Logo trop volumineux (max 1 Mo)" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const dataUrl = `data:${file.type};base64,${buf.toString("base64")}`;

  await prisma.company.update({ where: { id }, data: { logoUrl: dataUrl } });
  await auditLog({
    userId: session.id,
    action: "update",
    entityType: "company",
    entityId: id,
    details: "Logo mis a jour",
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  setTenantContext(session.tenantId);
  const { id } = await params;
  await prisma.company.update({ where: { id }, data: { logoUrl: null } });
  return NextResponse.json({ ok: true });
}
