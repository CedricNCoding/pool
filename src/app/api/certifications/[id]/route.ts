import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

const VALID_CATEGORIES = [
  "audio", "video", "eclairage", "reseau", "controle",
  "securite", "visioconference", "general",
];
const VALID_LEVELS = ["foundation", "standard", "advanced", "expert"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.certification.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Non trouvee" }, { status: 404 });

  const name = body.name !== undefined ? String(body.name).trim() : existing.name;
  const issuer = body.issuer !== undefined ? String(body.issuer).trim() : existing.issuer;
  if (!name || !issuer) {
    return NextResponse.json({ error: "Nom et organisme sont obligatoires" }, { status: 400 });
  }

  // Refus des doublons (name+issuer) sur une AUTRE certification
  const dup = await prisma.certification.findFirst({
    where: { name, issuer, id: { not: id } },
  });
  if (dup) {
    return NextResponse.json(
      { error: "Une autre certification porte deja ce nom + organisme" },
      { status: 409 }
    );
  }

  let validityMonths = existing.validityMonths;
  if (body.validityMonths !== undefined) {
    if (body.validityMonths === null || body.validityMonths === "") {
      validityMonths = null;
    } else {
      const v = parseInt(String(body.validityMonths), 10);
      validityMonths = Number.isFinite(v) && v > 0 ? v : null;
    }
  }

  const cert = await prisma.certification.update({
    where: { id },
    data: {
      name,
      issuer,
      description: body.description !== undefined ? body.description?.trim() || null : existing.description,
      category: VALID_CATEGORIES.includes(body.category) ? body.category : existing.category,
      level: VALID_LEVELS.includes(body.level) ? body.level : existing.level,
      validityMonths,
      color: typeof body.color === "string" && body.color ? body.color : existing.color,
    },
  });

  await auditLog({
    userId: session.id,
    action: "update",
    entityType: "certification",
    entityId: cert.id,
    details: `${cert.name} (${cert.issuer})`,
  });

  return NextResponse.json(cert);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin();
  const { id } = await params;

  const inUse = await prisma.technicianCertification.count({ where: { certificationId: id } });
  if (inUse > 0) {
    return NextResponse.json(
      { error: `Impossible : ${inUse} technicien(s) detiennent cette certification.` },
      { status: 409 }
    );
  }

  await prisma.certification.delete({ where: { id } }).catch(() => {});
  await auditLog({ userId: session.id, action: "delete", entityType: "certification", entityId: id });
  return NextResponse.json({ ok: true });
}
