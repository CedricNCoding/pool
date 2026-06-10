import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperadmin } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireSuperadmin();
  setTenantContext(null);
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.status === "active" || body.status === "suspended") data.status = body.status;

  const tenant = await prisma.tenant.update({ where: { id }, data });
  return NextResponse.json(tenant);
}
