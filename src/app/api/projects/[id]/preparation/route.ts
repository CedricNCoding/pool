import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { setTenantContext } from "@/lib/tenant-context";

// Préparation d'une mission : pour chaque technicien booké, ce qui manque vs les
// exigences (habilitations requises = bloquant, EPI requis = avertissement).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  setTenantContext(session.tenantId);
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id },
    select: { id: true, title: true, requiredEpi: true, requiredCertifications: { select: { id: true, name: true } }, requiredTrainingModules: { select: { id: true, title: true } } },
  });
  if (!project) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const reqEpi = (project.requiredEpi ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const bookings = await prisma.booking.findMany({
    where: { projectId: id },
    select: { technicianId: true, technician: { select: { id: true, firstName: true, lastName: true } } },
  });
  const techMap = new Map(bookings.map((b) => [b.technicianId, b.technician]));
  const techIds = [...techMap.keys()];

  const now = Date.now();
  const certs = techIds.length ? await prisma.technicianCertification.findMany({
    where: { technicianId: { in: techIds }, status: "active", certificationId: { in: project.requiredCertifications.map((c) => c.id) } },
    select: { technicianId: true, certificationId: true, expiryDate: true },
  }) : [];
  const equips = techIds.length && reqEpi.length ? await prisma.equipmentAssignment.findMany({
    where: { technicianId: { in: techIds }, returnedAt: null },
    select: { technicianId: true, equipment: { select: { category: true } } },
  }) : [];
  const trainings = techIds.length && project.requiredTrainingModules.length ? await prisma.trainingAssignment.findMany({
    where: { technicianId: { in: techIds }, status: "valide", moduleId: { in: project.requiredTrainingModules.map((m) => m.id) } },
    select: { technicianId: true, moduleId: true },
  }) : [];
  const trainByTech = new Map<string, Set<string>>();
  for (const t of trainings) { if (t.moduleId) { if (!trainByTech.has(t.technicianId)) trainByTech.set(t.technicianId, new Set()); trainByTech.get(t.technicianId)!.add(t.moduleId); } }

  const heldByTech = new Map<string, Set<string>>();
  for (const c of certs) {
    if (c.expiryDate && new Date(c.expiryDate).getTime() < now) continue;
    if (!heldByTech.has(c.technicianId)) heldByTech.set(c.technicianId, new Set());
    heldByTech.get(c.technicianId)!.add(c.certificationId);
  }
  const catByTech = new Map<string, Set<string>>();
  for (const e of equips) {
    if (!catByTech.has(e.technicianId)) catByTech.set(e.technicianId, new Set());
    catByTech.get(e.technicianId)!.add(e.equipment.category);
  }

  const crew = techIds.map((tid) => {
    const held = heldByTech.get(tid) ?? new Set();
    const cats = catByTech.get(tid) ?? new Set();
    const doneTrain = trainByTech.get(tid) ?? new Set();
    const missingCerts = project.requiredCertifications.filter((c) => !held.has(c.id)).map((c) => c.name);
    const missingEpi = reqEpi.filter((e) => !cats.has(e));
    const missingTraining = project.requiredTrainingModules.filter((m) => !doneTrain.has(m.id)).map((m) => m.title);
    return { technician: techMap.get(tid), missingCerts, missingEpi, missingTraining, ok: missingCerts.length === 0 && missingEpi.length === 0 && missingTraining.length === 0 };
  });

  return NextResponse.json({
    project: { id: project.id, title: project.title },
    requiredCertifications: project.requiredCertifications,
    requiredEpi: reqEpi,
    requiredTrainingModules: project.requiredTrainingModules,
    crew,
    hasGaps: crew.some((c) => !c.ok),
  });
}
