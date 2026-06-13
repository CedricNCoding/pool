import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { auditLog } from "@/lib/audit";

export async function GET() {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const packs = await prisma.equipmentPack.findMany({ include: { lines: true }, orderBy: { name: "asc" } });
  return NextResponse.json(packs);
}

// Crée un pack (recette catégorie × quantité).
export async function POST(req: NextRequest) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  const lines: { category: string; quantity: number }[] = Array.isArray(body.lines) ? body.lines : [];
  const pack = await prisma.equipmentPack.create({ data: { name: body.name.trim(), notes: body.notes?.trim() || null } });
  if (lines.length) {
    await prisma.equipmentPackLine.createMany({
      data: lines.filter((l) => l.category).map((l) => ({ packId: pack.id, category: l.category, quantity: Math.max(1, Number(l.quantity) || 1) })),
    });
  }
  await auditLog({ userId: session.id, action: "create", entityType: "equipment_pack", entityId: pack.id, details: pack.name });
  return NextResponse.json(pack, { status: 201 });
}
