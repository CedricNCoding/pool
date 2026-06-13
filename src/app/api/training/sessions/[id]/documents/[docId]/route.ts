import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { recordSessionEvent } from "@/lib/training";
import { auditLog } from "@/lib/audit";
import { UPLOAD_DIR } from "@/lib/uploads";

// Vérifie l'accès à la session (admin, ou gestionnaire avec un participant) et
// que le document appartient bien à cette session.
async function load(sessionId: string, docId: string, s: { role: string; companyId: string | null }) {
  const doc = await prisma.trainingSessionDocument.findFirst({
    where: { id: docId, sessionId },
    include: { session: { include: { participants: { select: { technician: { select: { companyId: true } } } } } } },
  });
  if (!doc) return { ok: false as const, status: 404 };
  const isAdmin = s.role === "admin" || s.role === "superadmin";
  if (!isAdmin && !doc.session.participants.some((p) => p.technician.companyId === s.companyId)) {
    return { ok: false as const, status: 403 };
  }
  return { ok: true as const, doc };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id, docId } = await params;
  const r = await load(id, docId, session);
  if (!r.ok) return NextResponse.json({ error: "Acces refuse" }, { status: r.status });

  const download = new URL(req.url).searchParams.get("download") === "1";
  let buffer: Buffer;
  try {
    buffer = await fs.readFile(path.join(UPLOAD_DIR, "sessions", id, r.doc.fileName));
  } catch {
    return NextResponse.json({ error: "Fichier introuvable sur le disque" }, { status: 404 });
  }
  const safeName = r.doc.originalName.replace(/[^\w.\- ]+/g, "_");
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": r.doc.mimeType,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store",
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id, docId } = await params;
  const r = await load(id, docId, session);
  if (!r.ok) return NextResponse.json({ error: "Acces refuse" }, { status: r.status });

  await prisma.trainingSessionDocument.deleteMany({ where: { id: docId } });
  try {
    await fs.unlink(path.join(UPLOAD_DIR, "sessions", id, r.doc.fileName));
  } catch {
    /* le fichier peut déjà être absent */
  }
  await recordSessionEvent({
    sessionId: id,
    kind: "document",
    label: `Document retiré : ${r.doc.title}`,
    actorId: session.id,
    actorName: session.name,
  });
  await auditLog({ userId: session.id, action: "delete", entityType: "training_session_document", entityId: docId });
  return NextResponse.json({ ok: true });
}
