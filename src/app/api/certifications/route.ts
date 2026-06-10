import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireAdmin } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { auditLog } from "@/lib/audit";

export async function GET() {
  setTenantContext((await requireSession()).tenantId);
  const certs = await prisma.certification.findMany({
    orderBy: [{ category: "asc" }, { order: "asc" }],
  });
  return NextResponse.json(certs);
}

const VALID_CATEGORIES = [
  "audio", "video", "eclairage", "reseau", "controle",
  "securite", "visioconference", "general",
];
const VALID_LEVELS = ["foundation", "standard", "advanced", "expert"];

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  setTenantContext(session.tenantId);
  const body = await req.json();

  const name = (body.name ?? "").trim();
  const issuer = (body.issuer ?? "").trim();
  if (!name || !issuer) {
    return NextResponse.json(
      { error: "Nom et organisme sont obligatoires" },
      { status: 400 }
    );
  }

  const category = VALID_CATEGORIES.includes(body.category)
    ? body.category
    : "general";
  const level = VALID_LEVELS.includes(body.level) ? body.level : "standard";

  let validityMonths: number | null = null;
  if (body.validityMonths !== undefined && body.validityMonths !== null && body.validityMonths !== "") {
    const v = parseInt(String(body.validityMonths), 10);
    validityMonths = Number.isFinite(v) && v > 0 ? v : null;
  }

  // Refus des doublons (contrainte unique name+issuer)
  const existing = await prisma.certification.findFirst({
    where: { name, issuer },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Cette certification existe deja (meme nom + organisme)" },
      { status: 409 }
    );
  }

  // order = max + 1 dans la categorie
  const last = await prisma.certification.findFirst({
    where: { category },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const cert = await prisma.certification.create({
    data: {
      name,
      issuer,
      description: body.description?.trim() || null,
      category,
      level,
      validityMonths,
      color: typeof body.color === "string" && body.color ? body.color : "#6366F1",
      order: (last?.order ?? 0) + 1,
    },
  });

  await auditLog({
    userId: session.id,
    action: "create",
    entityType: "certification",
    entityId: cert.id,
    details: `${cert.name} (${cert.issuer})`,
  });

  return NextResponse.json(cert, { status: 201 });
}
