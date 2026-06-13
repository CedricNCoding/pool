import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";

export async function GET() {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const units = await prisma.riskUnit.findMany({
    include: { items: { orderBy: { createdAt: "asc" } } },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(units);
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });
  const u = await prisma.riskUnit.create({ data: { name: body.name.trim(), description: body.description?.trim() || null, order: Number(body.order) || 0 } });
  return NextResponse.json(u, { status: 201 });
}
