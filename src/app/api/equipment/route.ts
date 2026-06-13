import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { auditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const url = new URL(req.url);
  const category = url.searchParams.get("category");
  const q = url.searchParams.get("q");
  const isAdmin = session.role === "admin" || session.role === "superadmin";

  const where: Record<string, unknown> = {};
  if (category) where.category = category;
  if (q) where.OR = [{ name: { contains: q } }, { serialNumber: { contains: q } }, { brand: { contains: q } }];
  if (!isAdmin && session.companyId) where.companyId = session.companyId;

  const items = await prisma.equipment.findMany({
    where,
    include: {
      assignments: {
        where: { returnedAt: null },
        include: { technician: { select: { id: true, firstName: true, lastName: true } } },
        take: 1,
      },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(items.map((e) => ({ ...e, currentAssignment: e.assignments[0] ?? null, assignments: undefined })));
}

export async function POST(req: NextRequest) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const body = await req.json();
  if (!body.name?.trim()) return NextResponse.json({ error: "Nom requis" }, { status: 400 });

  const e = await prisma.equipment.create({
    data: {
      companyId: session.companyId || body.companyId || null,
      category: body.category || "epi",
      name: body.name.trim(),
      brand: body.brand?.trim() || null,
      model: body.model?.trim() || null,
      serialNumber: body.serialNumber?.trim() || null,
      size: body.size?.trim() || null,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      nextCheckDate: body.nextCheckDate ? new Date(body.nextCheckDate) : null,
      notes: body.notes?.trim() || null,
    },
  });
  await auditLog({ userId: session.id, action: "create", entityType: "equipment", entityId: e.id, details: e.name });
  return NextResponse.json(e, { status: 201 });
}
