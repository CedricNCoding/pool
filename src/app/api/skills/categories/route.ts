import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET() {
  await requireSession();
  const categories = await prisma.skillCategory.findMany({
    include: { skills: true },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(categories);
}
