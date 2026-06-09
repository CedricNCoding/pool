import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { generateApiKey } from "@/lib/api-key";
import { auditLog } from "@/lib/audit";

export async function GET() {
  await requireAdmin();
  const keys = await prisma.apiKey.findMany({
    include: { company: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(keys);
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  const body = await req.json();

  const { key, hash, prefix } = generateApiKey();

  const expiresAt = body.expiresInDays
    ? new Date(Date.now() + parseInt(body.expiresInDays) * 86400000)
    : null;

  await prisma.apiKey.create({
    data: {
      name: body.name,
      keyHash: hash,
      keyPrefix: prefix,
      permissions: body.permissions || "read",
      companyId: body.companyId || null,
      expiresAt,
    },
  });

  await auditLog({
    userId: session.id,
    action: "create",
    entityType: "api_key",
    details: `Cle API "${body.name}" creee`,
  });

  return NextResponse.json({ key }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  const { id } = await req.json();

  await prisma.apiKey.update({
    where: { id },
    data: { isActive: false },
  });

  await auditLog({
    userId: session.id,
    action: "delete",
    entityType: "api_key",
    entityId: id,
  });

  return NextResponse.json({ ok: true });
}
