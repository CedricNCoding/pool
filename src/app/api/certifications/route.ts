import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";

export async function GET() {
  await requireSession();
  const certs = await prisma.certification.findMany({ orderBy: [{ category: "asc" }, { order: "asc" }] });
  return NextResponse.json(certs);
}
