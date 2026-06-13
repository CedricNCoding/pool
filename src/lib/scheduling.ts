import { prisma } from "./db";

// Détection de conflits + garde-fou temps de travail pour une affectation datée.
// conflicts = bloquants (chevauchement booking/absence/formation) ; warnings =
// garde-fou non bloquant (repos < 11 h, semaine > 48 h). Le booking accepte un
// override admin (force=true) qui ignore les conflits.

const H = 60 * 60 * 1000;
const REST_MIN_MS = 11 * H; // repos quotidien minimum
const WEEK_MAX_H = 48; // durée hebdo max

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export interface ScheduleCheck {
  conflicts: string[];
  warnings: string[];
}

export async function checkBooking(opts: {
  technicianId: string;
  start: Date;
  end: Date;
  excludeBookingId?: string;
  projectId?: string;
}): Promise<ScheduleCheck> {
  const { technicianId, start, end, excludeBookingId, projectId } = opts;
  const conflicts: string[] = [];
  const warnings: string[] = [];

  // Fenêtre élargie d'1 semaine de part et d'autre pour le calcul du repos/charge.
  const from = new Date(start.getTime() - 8 * 24 * H);
  const to = new Date(end.getTime() + 8 * 24 * H);

  const bookings = await prisma.booking.findMany({
    where: {
      technicianId,
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      start: { lt: to },
      end: { gt: from },
      status: { not: "decline" },
    },
    include: { project: { select: { title: true } } },
    orderBy: { start: "asc" },
  });

  // 1) Chevauchement avec d'autres affectations.
  for (const b of bookings) {
    if (overlaps(start, end, b.start, b.end)) {
      conflicts.push(`Déjà affecté à « ${b.project.title} » sur ce créneau`);
    }
  }

  // 2) Chevauchement avec une absence (datée ou récurrence hebdo).
  const absences = await prisma.absence.findMany({
    where: { technicianId, status: { not: "refuse" } },
  });
  for (const a of absences) {
    if (a.recurringWeekday != null) {
      // indispo hebdomadaire : un jour de la plage tombe-t-il sur ce jour ?
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === a.recurringWeekday) { conflicts.push("Indisponibilité récurrente sur ce jour"); break; }
      }
    } else if (a.start && a.end && overlaps(start, end, new Date(a.start), new Date(a.end))) {
      conflicts.push(`Absence (${a.type}) sur ce créneau`);
    }
  }

  // 3) Chevauchement avec une session de formation où il est participant.
  const sessions = await prisma.trainingSession.findMany({
    where: {
      startDate: { not: null },
      participants: { some: { technicianId } },
    },
    select: { title: true, startDate: true, endDate: true },
  });
  for (const s of sessions) {
    if (!s.startDate) continue;
    const sEnd = s.endDate ? new Date(s.endDate) : new Date(new Date(s.startDate).getTime() + 24 * H);
    if (overlaps(start, end, new Date(s.startDate), sEnd)) {
      conflicts.push(`En formation « ${s.title} » sur ce créneau`);
    }
  }

  // 4) Garde-fou repos quotidien (11 h entre deux créneaux consécutifs).
  for (const b of bookings) {
    const gapAfter = b.start.getTime() - end.getTime();
    const gapBefore = start.getTime() - b.end.getTime();
    if (gapAfter > 0 && gapAfter < REST_MIN_MS) warnings.push("Repos quotidien < 11 h avant le créneau suivant");
    if (gapBefore > 0 && gapBefore < REST_MIN_MS) warnings.push("Repos quotidien < 11 h après le créneau précédent");
  }

  // 5) Garde-fou durée hebdomadaire (lundi-dimanche de la semaine du créneau).
  const weekStart = new Date(start);
  const dow = (weekStart.getDay() + 6) % 7; // lundi=0
  weekStart.setDate(weekStart.getDate() - dow);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * H);
  let weekMs = end.getTime() - start.getTime();
  for (const b of bookings) {
    if (b.start >= weekStart && b.start < weekEnd) weekMs += b.end.getTime() - b.start.getTime();
  }
  if (weekMs / H > WEEK_MAX_H) warnings.push(`Durée hebdomadaire > ${WEEK_MAX_H} h`);

  // 6) Exigences de la mission : habilitation requise = BLOQUANT, EPI requis = avertissement.
  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId },
      select: {
        requiredEpi: true,
        requiredCertifications: { select: { id: true, name: true } },
        requiredTrainingModules: { select: { id: true, title: true } },
      },
    });
    if (project) {
      const reqCerts = project.requiredCertifications;
      const reqEpi = (project.requiredEpi ?? "").split(",").map((s) => s.trim()).filter(Boolean);

      // Prérequis formation : module requis non validé pour ce technicien = avertissement.
      if (project.requiredTrainingModules.length > 0) {
        const done = await prisma.trainingAssignment.findMany({
          where: { technicianId, status: "valide", moduleId: { in: project.requiredTrainingModules.map((m) => m.id) } },
          select: { moduleId: true },
        });
        const doneIds = new Set(done.map((d) => d.moduleId));
        for (const m of project.requiredTrainingModules) {
          if (!doneIds.has(m.id)) warnings.push(`Formation requise non suivie : ${m.title}`);
        }
      }

      if (reqCerts.length > 0) {
        const held = await prisma.technicianCertification.findMany({
          where: { technicianId, status: "active", certificationId: { in: reqCerts.map((c) => c.id) } },
          select: { certificationId: true, expiryDate: true },
        });
        const validIds = new Set(held.filter((h) => !h.expiryDate || new Date(h.expiryDate) >= start).map((h) => h.certificationId));
        for (const c of reqCerts) {
          if (!validIds.has(c.id)) conflicts.push(`Habilitation requise manquante/expirée : ${c.name}`);
        }
      }

      if (reqEpi.length > 0) {
        const dotation = await prisma.equipmentAssignment.findMany({
          where: { technicianId, returnedAt: null },
          select: { equipment: { select: { category: true } } },
        });
        const cats = new Set(dotation.map((d) => d.equipment.category));
        for (const e of reqEpi) {
          if (!cats.has(e)) warnings.push(`EPI requis non doté : ${e}`);
        }
      }
    }
  }

  return { conflicts: [...new Set(conflicts)], warnings: [...new Set(warnings)] };
}
