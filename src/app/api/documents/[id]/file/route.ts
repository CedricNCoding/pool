import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { requireSession, canAccessCompany } from "@/lib/auth";
import { UPLOAD_DIR } from "@/lib/uploads";

// Sert le fichier (authentifie + cloisonne). Jamais accessible sans session.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const { id } = await params;

  const doc = await prisma.document.findUnique({
    where: { id },
    include: { technician: { select: { companyId: true } } },
  });
  if (!doc) return NextResponse.json({ error: "Non trouve" }, { status: 404 });
  if (!canAccessCompany(session, doc.technician.companyId)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const download = new URL(req.url).searchParams.get("download") === "1";

  let buffer: Buffer;
  try {
    buffer = await fs.readFile(path.join(UPLOAD_DIR, doc.technicianId, doc.fileName));
  } catch {
    return NextResponse.json({ error: "Fichier introuvable sur le disque" }, { status: 404 });
  }

  const safeName = doc.originalName.replace(/[^\w.\- ]+/g, "_");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store",
    },
  });
}
