import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";
import { recordSessionEvent } from "@/lib/training";
import { auditLog } from "@/lib/audit";
import { UPLOAD_DIR, MAX_UPLOAD_BYTES, ALLOWED_MIME } from "@/lib/uploads";

// Accès à une session : admin, ou gestionnaire ayant un participant dans la session.
async function accessibleSession(sessionId: string, s: { role: string; companyId: string | null }) {
  const sess = await prisma.trainingSession.findFirst({
    where: { id: sessionId },
    include: { participants: { select: { technician: { select: { companyId: true } } } } },
  });
  if (!sess) return { ok: false as const, status: 404 };
  const isAdmin = s.role === "admin" || s.role === "superadmin";
  if (!isAdmin && !sess.participants.some((p) => p.technician.companyId === s.companyId)) {
    return { ok: false as const, status: 403 };
  }
  return { ok: true as const, sess };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const acc = await accessibleSession(id, session);
  if (!acc.ok) return NextResponse.json({ error: "Acces refuse" }, { status: acc.status });

  const docs = await prisma.trainingSessionDocument.findMany({
    where: { sessionId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(docs);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;
  const acc = await accessibleSession(id, session);
  if (!acc.ok) return NextResponse.json({ error: "Acces refuse" }, { status: acc.status });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
  }
  const ext = ALLOWED_MIME[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Type de fichier non autorise (PDF, image, Word)" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `${crypto.randomUUID()}${ext}`;
  // Sous-dossier dédié aux sessions, distinct des documents techniciens.
  const dir = path.join(UPLOAD_DIR, "sessions", id);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, fileName), buffer);

  const title = (form.get("title")?.toString() || file.name).trim();
  const category = form.get("category")?.toString() || "autre";

  const doc = await prisma.trainingSessionDocument.create({
    data: {
      sessionId: id,
      category,
      title,
      fileName,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      uploadedById: session.id,
    },
  });

  await recordSessionEvent({
    sessionId: id,
    kind: "document",
    label: `Document ajouté : ${title}`,
    actorId: session.id,
    actorName: session.name,
  });
  await auditLog({ userId: session.id, action: "create", entityType: "training_session_document", entityId: doc.id, details: title });

  return NextResponse.json(doc, { status: 201 });
}
