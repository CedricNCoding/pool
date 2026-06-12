import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateApiKey } from "@/lib/api-key";
import { setTenantContext } from "@/lib/tenant-context";
import { nextMedicalVisit } from "@/lib/compliance";

// Export iCal des échéances (visite médicale, certifications, documents) du
// périmètre de la clé. Abonnable depuis un agenda via ?key=avp_... (les apps
// de calendrier ne savent pas envoyer d'en-tête Authorization).
function icsDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}`;
}
function icsStamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}
const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const header = req.headers.get("authorization");
  const raw = header?.startsWith("Bearer ") ? header.substring(7) : url.searchParams.get("key");
  if (!raw) return NextResponse.json({ error: "Cle API requise" }, { status: 401 });
  const apiKey = await validateApiKey(raw);
  if (!apiKey) return NextResponse.json({ error: "Cle API invalide ou expiree" }, { status: 401 });
  setTenantContext(apiKey.tenantId);

  const where: Record<string, unknown> = { isActive: true };
  if (apiKey.companyId) where.companyId = apiKey.companyId;

  const techs = await prisma.technician.findMany({
    where,
    select: {
      firstName: true,
      lastName: true,
      medicalVisitDate: true,
      medicalVisitPeriodicityMonths: true,
      certifications: {
        where: { status: { not: "revoked" }, expiryDate: { not: null } },
        select: { expiryDate: true, certification: { select: { name: true } } },
      },
      documents: {
        where: { expiryDate: { not: null } },
        select: { expiryDate: true, title: true },
      },
    },
  });

  const now = new Date();
  const events: { date: Date; summary: string; uid: string }[] = [];
  let n = 0;
  for (const t of techs) {
    const who = `${t.firstName} ${t.lastName}`;
    const med = nextMedicalVisit(t);
    if (med) events.push({ date: med, summary: `Visite medicale — ${who}`, uid: `med-${n++}` });
    for (const c of t.certifications) {
      if (c.expiryDate) events.push({ date: new Date(c.expiryDate), summary: `Echeance ${c.certification.name} — ${who}`, uid: `cert-${n++}` });
    }
    for (const d of t.documents) {
      if (d.expiryDate) events.push({ date: new Date(d.expiryDate), summary: `Echeance ${d.title} — ${who}`, uid: `doc-${n++}` });
    }
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Praxis//Echeances//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Praxis — Echeances",
  ];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}-${icsDate(e.date)}@praxis.spektalis`,
      `DTSTAMP:${icsStamp(now)}`,
      `DTSTART;VALUE=DATE:${icsDate(e.date)}`,
      `SUMMARY:${esc(e.summary)}`,
      `STATUS:${e.date < now ? "CONFIRMED" : "TENTATIVE"}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="praxis-echeances.ics"',
      "Cache-Control": "private, max-age=3600",
    },
  });
}
