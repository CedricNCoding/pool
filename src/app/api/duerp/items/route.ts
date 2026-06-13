import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";

export async function POST(req: NextRequest) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const body = await req.json();
  if (!body.riskUnitId || !body.danger?.trim()) return NextResponse.json({ error: "Unité et danger requis" }, { status: 400 });
  const item = await prisma.riskItem.create({
    data: {
      riskUnitId: body.riskUnitId,
      danger: body.danger.trim(),
      exposure: body.exposure?.trim() || null,
      gravity: Math.min(4, Math.max(1, Number(body.gravity) || 2)),
      probability: Math.min(4, Math.max(1, Number(body.probability) || 2)),
      existingMeasures: body.existingMeasures?.trim() || null,
      plannedMeasures: body.plannedMeasures?.trim() || null,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      responsible: body.responsible?.trim() || null,
      status: body.status || "a_traiter",
    },
  });
  return NextResponse.json(item, { status: 201 });
}
