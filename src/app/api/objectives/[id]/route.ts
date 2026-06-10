import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  setTenantContext((await requireAdmin()).tenantId);
  const { id } = await params;
  await prisma.skillObjective.deleteMany({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
