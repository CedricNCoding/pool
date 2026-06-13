import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const body = await req.json();
  const pack = await prisma.equipmentPack.findFirst({ where: { id } });
  if (!pack) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = body.name.trim();
  if (body.notes !== undefined) data.notes = body.notes?.trim() || null;
  if (Object.keys(data).length) await prisma.equipmentPack.update({ where: { id }, data });
  // Remplacement complet des lignes si fournies.
  if (Array.isArray(body.lines)) {
    await prisma.equipmentPackLine.deleteMany({ where: { packId: id } });
    await prisma.equipmentPackLine.createMany({
      data: body.lines.filter((l: { category: string }) => l.category).map((l: { category: string; quantity: number }) => ({ packId: id, category: l.category, quantity: Math.max(1, Number(l.quantity) || 1) })),
    });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const r = await prisma.equipmentPack.deleteMany({ where: { id } });
  if (r.count === 0) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
