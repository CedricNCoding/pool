import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireAdmin } from "@/lib/auth";
import { auditLog } from "@/lib/audit";

export async function GET() {
  await requireSession();
  const categories = await prisma.skillCategory.findMany({
    include: { skills: { orderBy: { order: "asc" } } },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(categories);
}

const PALETTE = [
  "#EC4899", "#3B82F6", "#F59E0B", "#10B981",
  "#F97316", "#8B5CF6", "#06B6D4", "#6366F1",
];

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  const body = await req.json();
  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Nom de famille obligatoire" }, { status: 400 });
  }

  const existing = await prisma.skillCategory.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: "Cette famille existe deja" }, { status: 409 });
  }

  const last = await prisma.skillCategory.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  });
  const order = (last?.order ?? 0) + 1;
  const color =
    typeof body.color === "string" && body.color
      ? body.color
      : PALETTE[order % PALETTE.length];

  const category = await prisma.skillCategory.create({
    data: { name, color, icon: body.icon || "Wrench", order },
  });

  await auditLog({
    userId: session.id,
    action: "create",
    entityType: "skill_category",
    entityId: category.id,
    details: name,
  });

  return NextResponse.json(category, { status: 201 });
}
