import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";

// Liste des etiquettes (pour autocompletion + filtre)
export async function GET() {
  await requireSession();
  const tags = await prisma.tag.findMany({
    include: { _count: { select: { technicians: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(tags);
}
