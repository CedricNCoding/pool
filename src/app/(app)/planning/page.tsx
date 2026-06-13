"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Loader2, Trash2, Gauge, AlertTriangle } from "lucide-react";
import PageHelp from "@/components/PageHelp";

interface Booking {
  id: string; start: string; end: string; role: string | null; status: string;
  project: { id: string; title: string };
  technician: { id: string; firstName: string; lastName: string; company: { name: string; color: string } | null };
  missingCerts: string[]; missingEpi: string[]; missingTraining: string[];
}
interface Absence { id: string; type: string; start: string | null; end: string | null; recurringWeekday: number | null; status: string; technician: { id: string } }
interface Tech { id: string; firstName: string; lastName: string; company: { name: string; color: string } | null }
interface Proj { id: string; title: string }

const STATUS_COLOR: Record<string, string> = { pressenti: "#E89B2C", confirme: "#10B981", decline: "#94A3B8" };
const ABS_LABEL: Record<string, string> = { cp: "CP", rtt: "RTT", maladie: "Arrêt", sans_solde: "Sans solde", indispo: "Indispo", autre: "Absence" };
const DOW = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const HOUR_START = 6, HOUR_END = 22;

function mondayOf(d: Date) { const x = new Date(d); const dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); x.setHours(0, 0, 0, 0); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function ymd(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function hm(s: string) { const d = new Date(s); const m = d.getMinutes(); return `${d.getHours()}h${m ? String(m).padStart(2, "0") : ""}`; }
function overlapsDay(b: { start: string; end: string }, day: Date) { return new Date(b.start) < addDays(day, 1) && new Date(b.end) > day; }
function gapTone(b: Booking) { return b.missingCerts.length ? "block" : (b.missingEpi.length || b.missingTraining.length) ? "warn" : null; }

export default function PlanningPage() {
  const [tab, setTab] = useState<"calendrier" | "charge">("calendrier");
  const [period, setPeriod] = useState<"jour" | "semaine" | "mois" | "annee">("semaine");
  const [view, setView] = useState<"tech" | "projet" | "equipe">("tech");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [techs, setTechs] = useState<Tech[]>([]);
  const [projects, setProjects] = useState<Proj[]>([]);
  const [equipeProject, setEquipeProject] = useState("");
  const [loading, setLoading] = useState(true);

  // Fenêtre temporelle selon la période.
  const win = useMemo(() => {
    if (period === "jour") return { start: startOfDay(anchor), end: addDays(startOfDay(anchor), 1) };
    if (period === "semaine") { const s = mondayOf(anchor); return { start: s, end: addDays(s, 7) }; }
    if (period === "mois") { const s = new Date(anchor.getFullYear(), anchor.getMonth(), 1); return { start: s, end: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1) }; }
    const s = new Date(anchor.getFullYear(), 0, 1); return { start: s, end: new Date(anchor.getFullYear() + 1, 0, 1) };
  }, [period, anchor]);

  const load = useCallback(() => {
    setLoading(true);
    const qs = `from=${ymd(win.start)}&to=${ymd(win.end)}`;
    Promise.all([
      fetch(`/api/bookings?${qs}`).then((r) => r.json()),
      fetch(`/api/absences`).then((r) => r.json()),
    ]).then(([b, a]) => {
      setBookings(Array.isArray(b) ? b : []);
      setAbsences(Array.isArray(a) ? a : []);
    }).finally(() => setLoading(false));
  }, [win.start, win.end]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/technicians?isActive=true&limit=500").then((r) => r.json()).then((d) => setTechs(Array.isArray(d.data) ? d.data : [])).catch(() => {});
    fetch("/api/projects").then((r) => r.json()).then((d) => setProjects(Array.isArray(d) ? d : (d.data ?? []))).catch(() => {});
  }, []);

  function nav(delta: number) {
    if (period === "jour") setAnchor((a) => addDays(a, delta));
    else if (period === "semaine") setAnchor((a) => addDays(a, delta * 7));
    else if (period === "mois") setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + delta, 1));
    else setAnchor((a) => new Date(a.getFullYear() + delta, a.getMonth(), 1));
  }
  const periodLabel = period === "jour" ? anchor.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    : period === "semaine" ? `${win.start.toLocaleDateString("fr-FR")} – ${addDays(win.start, 6).toLocaleDateString("fr-FR")}`
    : period === "mois" ? `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}` : String(anchor.getFullYear());

  function bookingsFor(techId: string, day: Date) { return bookings.filter((b) => b.technician.id === techId && overlapsDay(b, day)); }
  function absencesFor(techId: string, day: Date) {
    return absences.filter((a) => {
      if (a.technician.id !== techId || a.status === "refuse") return false;
      if (a.recurringWeekday != null) return day.getDay() === a.recurringWeekday;
      return a.start && a.end && new Date(a.start) < addDays(day, 1) && new Date(a.end) > day;
    });
  }

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(mondayOf(anchor), i)), [anchor]);
  const techRows: Tech[] = useMemo(() => {
    if (view === "equipe") {
      if (!equipeProject) return [];
      const ids = new Set(bookings.filter((b) => b.project.id === equipeProject).map((b) => b.technician.id));
      return techs.filter((t) => ids.has(t.id));
    }
    const active = new Set(bookings.map((b) => b.technician.id));
    const withRows = techs.filter((t) => active.has(t.id));
    return withRows.length > 0 ? [...withRows, ...techs.filter((t) => !active.has(t.id))].slice(0, 60) : techs.slice(0, 60);
  }, [view, equipeProject, bookings, techs]);
  const projectRows = useMemo(() => [...new Set(bookings.map((b) => b.project.id))].map((id) => bookings.find((b) => b.project.id === id)!.project), [bookings]);

  // --- dialog ---
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<{ conflicts: string[]; warnings: string[] } | null>(null);
  const [form, setForm] = useState({ technicianId: "", projectId: "", date: ymd(new Date()), startTime: "09:00", endTime: "17:00", role: "", force: false });
  function openNew(day?: Date, techId?: string) {
    setConflict(null);
    setForm({ technicianId: techId || "", projectId: equipeProject || "", date: ymd(day || anchor), startTime: "09:00", endTime: "17:00", role: "", force: false });
    setOpen(true);
  }
  async function save() {
    if (!form.technicianId || !form.projectId) return;
    setSaving(true); setConflict(null);
    const start = new Date(`${form.date}T${form.startTime}`).toISOString();
    const end = new Date(`${form.date}T${form.endTime}`).toISOString();
    const res = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, start, end }) });
    setSaving(false);
    if (res.status === 409) { setConflict(await res.json()); return; }
    if (res.ok) { setOpen(false); load(); }
  }
  async function removeBooking(id: string) { if (!confirm("Retirer cette affectation ?")) return; await fetch(`/api/bookings/${id}`, { method: "DELETE" }); load(); }
  async function cycleStatus(b: Booking) {
    const next = b.status === "pressenti" ? "confirme" : b.status === "confirme" ? "decline" : "pressenti";
    await fetch(`/api/bookings/${b.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
    load();
  }

  // --- charge (fenêtre visible, jours ouvrés) ---
  const charge = useMemo(() => {
    const map = new Map<string, { tech: Tech; days: Set<string> }>();
    for (const t of techs) map.set(t.id, { tech: t, days: new Set() });
    for (const b of bookings) {
      const e = map.get(b.technician.id); if (!e) continue;
      for (let d = new Date(b.start); d < new Date(b.end); d = addDays(d, 1)) {
        if (d >= win.start && d < win.end && d.getDay() !== 0 && d.getDay() !== 6) e.days.add(d.toDateString());
      }
    }
    let openDays = 0;
    for (let d = new Date(win.start); d < win.end; d = addDays(d, 1)) if (d.getDay() !== 0 && d.getDay() !== 6) openDays++;
    return [...map.values()].map((e) => ({ tech: e.tech, jours: e.days.size, taux: openDays ? Math.round((e.days.size / openDays) * 100) : 0 }))
      .filter((e) => e.jours > 0).sort((a, b) => b.taux - a.taux);
  }, [bookings, techs, win.start, win.end]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3"><CalendarDays className="w-6 h-6 text-ink-600" /><h1 className="text-2xl font-bold">Planning</h1></div>
        <Button onClick={() => openNew()}><Plus className="w-4 h-4 mr-2" /> Nouvelle affectation</Button>
      </div>

      <PageHelp>
        Affectez vos techniciens aux missions par <strong>créneau daté</strong> et visualisez en <strong>jour / semaine / mois / année</strong>. Les horaires s&apos;affichent sur les cases ; une <strong>pastille rouge</strong> signale qu&apos;un technicien n&apos;a pas une habilitation requise (bloquant) et une <strong>pastille orange</strong> un EPI requis non doté. Cliquez une affectation pour faire évoluer son statut (pressenti → confirmé → décliné).
      </PageHelp>

      <div className="flex gap-1 mb-4 border-b border-ink-900/10">
        {([["calendrier", "Calendrier"], ["charge", "Charge & équilibrage"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 text-sm border-b-2 -mb-px transition ${tab === k ? "border-signal-500 text-ink-900" : "border-transparent text-ink-500 hover:text-ink-800"}`}>{l}</button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => nav(-1)}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(startOfDay(new Date()))}>Aujourd&apos;hui</Button>
          <Button variant="outline" size="icon" onClick={() => nav(1)}><ChevronRight className="w-4 h-4" /></Button>
          <span className="text-sm text-ink-600 ml-2 capitalize">{periodLabel}</span>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-ink-400" />}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {([["jour", "Jour"], ["semaine", "Semaine"], ["mois", "Mois"], ["annee", "Année"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setPeriod(k)} className={`px-3 py-1.5 text-sm rounded-md border transition ${period === k ? "bg-signal-500 text-[#0B1220] border-signal-500" : "border-ink-900/15 text-ink-600 hover:bg-paper-2"}`}>{l}</button>
            ))}
          </div>
          {tab === "calendrier" && period === "semaine" && (
            <div className="flex gap-1 ml-2">
              {([["tech", "Par technicien"], ["projet", "Par projet"], ["equipe", "Par équipe"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setView(k)} className={`px-2.5 py-1.5 text-xs rounded-md border transition ${view === k ? "bg-ink-900 text-paper border-ink-900" : "border-ink-900/15 text-ink-500 hover:bg-paper-2"}`}>{l}</button>
              ))}
            </div>
          )}
          {tab === "calendrier" && period === "semaine" && view === "equipe" && (
            <select className="px-2 py-1.5 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm" value={equipeProject} onChange={(e) => setEquipeProject(e.target.value)}>
              <option value="">— Projet —</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          )}
        </div>
      </div>

      {tab === "charge" ? (
        <Card><CardContent className="p-0">
          <div className="px-4 py-3 text-xs text-ink-500 border-b border-ink-900/10 flex items-center gap-2"><Gauge className="w-4 h-4" /> Taux d&apos;occupation sur la période affichée (jours affectés ÷ jours ouvrés)</div>
          <table className="w-full text-sm"><tbody>
            {charge.map((c) => (
              <tr key={c.tech.id} className="border-b border-ink-900/10">
                <td className="py-2 px-4 w-1/4"><Link href={`/technicians/${c.tech.id}`} className="hover:underline">{c.tech.firstName} {c.tech.lastName}</Link></td>
                <td className="py-2 px-4"><div className="flex items-center gap-2"><div className="flex-1 h-2.5 rounded-full bg-ink-900/10 overflow-hidden max-w-md"><div className="h-full rounded-full" style={{ width: `${Math.min(100, c.taux)}%`, backgroundColor: c.taux > 100 ? "#EF4444" : c.taux >= 80 ? "#10B981" : c.taux >= 40 ? "#E89B2C" : "#94A3B8" }} /></div><span className="text-xs text-ink-500 w-24">{c.jours} j · {c.taux}%</span></div></td>
              </tr>
            ))}
            {charge.length === 0 && <tr><td className="text-center py-10 text-ink-400">Aucune affectation sur la période.</td></tr>}
          </tbody></table>
        </CardContent></Card>
      ) : period === "jour" ? (
        <DayView techs={techRows} bookingsFor={bookingsFor} day={anchor} onAdd={openNew} onCycle={cycleStatus} onDel={removeBooking} />
      ) : period === "mois" ? (
        <MonthView anchor={anchor} bookings={bookings} onDay={(d) => { setAnchor(startOfDay(d)); setPeriod("jour"); }} />
      ) : period === "annee" ? (
        <YearView year={anchor.getFullYear()} bookings={bookings} onMonth={(m) => { setAnchor(new Date(anchor.getFullYear(), m, 1)); setPeriod("mois"); }} />
      ) : (
        // SEMAINE
        <Card><CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead><tr className="text-xs text-ink-500 border-b border-ink-900/10">
              <th className="text-left py-2 px-3 sticky left-0 bg-paper-bone min-w-[160px]">{view === "projet" ? "Projet" : "Technicien"}</th>
              {weekDays.map((d, i) => <th key={i} className={`text-center py-2 px-2 min-w-[120px] ${[5, 6].includes(i) ? "bg-paper-2/50" : ""}`}>{DOW[i]} <span className="text-ink-400">{d.getDate()}/{d.getMonth() + 1}</span></th>)}
            </tr></thead>
            <tbody>
              {view === "projet" ? projectRows.map((p) => (
                <tr key={p.id} className="border-b border-ink-900/10 align-top">
                  <td className="py-2 px-3 sticky left-0 bg-paper-bone font-medium"><Link href={`/projets/${p.id}`} className="hover:underline">{p.title}</Link></td>
                  {weekDays.map((d, i) => (
                    <td key={i} className={`py-1.5 px-1.5 align-top ${[5, 6].includes(i) ? "bg-paper-2/40" : ""}`}>
                      {bookings.filter((b) => b.project.id === p.id && overlapsDay(b, d)).map((b) => <Chip key={b.id} label={`${hm(b.start)}–${hm(b.end)} ${b.technician.lastName}`} color={STATUS_COLOR[b.status]} gap={gapTone(b)} onClick={() => cycleStatus(b)} onDel={() => removeBooking(b.id)} />)}
                    </td>
                  ))}
                </tr>
              )) : techRows.map((t) => (
                <tr key={t.id} className="border-b border-ink-900/10 align-top">
                  <td className="py-2 px-3 sticky left-0 bg-paper-bone">
                    <Link href={`/technicians/${t.id}`} className="font-medium hover:underline">{t.firstName} {t.lastName}</Link>
                    {t.company && <div className="flex items-center gap-1 text-[11px] text-ink-400"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.company.color }} />{t.company.name}</div>}
                  </td>
                  {weekDays.map((d, i) => (
                    <td key={i} className={`py-1.5 px-1.5 align-top ${[5, 6].includes(i) ? "bg-paper-2/40" : ""}`} onDoubleClick={() => openNew(d, t.id)}>
                      {absencesFor(t.id, d).map((a) => <span key={a.id} className="block text-[11px] px-1.5 py-0.5 mb-1 rounded bg-ink-900/10 text-ink-500">{ABS_LABEL[a.type] ?? "Abs."}</span>)}
                      {bookingsFor(t.id, d).map((b) => <Chip key={b.id} label={`${hm(b.start)}–${hm(b.end)} ${b.project.title}`} color={STATUS_COLOR[b.status]} gap={gapTone(b)} onClick={() => cycleStatus(b)} onDel={() => removeBooking(b.id)} />)}
                    </td>
                  ))}
                </tr>
              ))}
              {((view === "equipe" && techRows.length === 0) || (view === "projet" && projectRows.length === 0)) && (
                <tr><td colSpan={8} className="text-center py-10 text-ink-400">{view === "equipe" ? "Choisissez un projet pour voir le planning de son équipe." : "Aucune affectation cette semaine."}</td></tr>
              )}
            </tbody>
          </table>
        </CardContent></Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle affectation</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Technicien *</Label>
              <select className="w-full px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm" value={form.technicianId} onChange={(e) => setForm((f) => ({ ...f, technicianId: e.target.value }))}>
                <option value="">— Choisir —</option>{techs.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}{t.company ? ` (${t.company.name})` : ""}</option>)}
              </select>
            </div>
            <div><Label>Projet / mission *</Label>
              <select className="w-full px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm" value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}>
                <option value="">— Choisir —</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></div>
              <div><Label>Début</Label><Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} /></div>
              <div><Label>Fin</Label><Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} /></div>
            </div>
            <div><Label>Rôle (optionnel)</Label><Input value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} placeholder="ex: Régie, montage…" /></div>
            {conflict && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm">
                <p className="font-medium text-red-700">Conflit / manque :</p>
                <ul className="list-disc ml-5 text-red-600">{conflict.conflicts.map((c, i) => <li key={i}>{c}</li>)}</ul>
                {conflict.warnings.length > 0 && <ul className="list-disc ml-5 text-amber-600 mt-1">{conflict.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>}
                <label className="flex items-center gap-2 mt-2 text-xs text-ink-600"><input type="checkbox" checked={form.force} onChange={(e) => setForm((f) => ({ ...f, force: e.target.checked }))} /> Forcer malgré le conflit (admin)</label>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={save} disabled={saving || !form.technicianId || !form.projectId}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Affecter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Chip({ label, color, gap, onClick, onDel }: { label: string; color: string; gap: "block" | "warn" | null; onClick: () => void; onDel: () => void }) {
  return (
    <span className="group/chip relative flex items-center gap-1 text-[11px] px-1.5 py-0.5 mb-1 rounded text-white cursor-pointer" style={{ backgroundColor: color }} onClick={onClick} title="Cliquer : changer le statut">
      {gap && <span className={`w-2 h-2 rounded-full shrink-0 ${gap === "block" ? "bg-red-600" : "bg-amber-300"}`} title={gap === "block" ? "Habilitation requise manquante" : "EPI requis non doté"} />}
      <span className="truncate max-w-[120px]">{label}</span>
      <button onClick={(e) => { e.stopPropagation(); onDel(); }} className="opacity-0 group-hover/chip:opacity-100 shrink-0"><Trash2 className="w-3 h-3" /></button>
    </span>
  );
}

// --- Vue JOUR : timeline horaire par technicien ---
function DayView({ techs, bookingsFor, day, onAdd, onCycle, onDel }: {
  techs: Tech[]; bookingsFor: (t: string, d: Date) => Booking[]; day: Date; onAdd: (d: Date, t: string) => void; onCycle: (b: Booking) => void; onDel: (id: string) => void;
}) {
  const hours = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);
  const span = HOUR_END - HOUR_START;
  const rows = techs.filter((t) => bookingsFor(t.id, day).length > 0);
  function pos(s: string) { const d = new Date(s); return ((d.getHours() + d.getMinutes() / 60) - HOUR_START) / span * 100; }
  return (
    <Card><CardContent className="p-0 overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="flex border-b border-ink-900/10 text-[10px] text-ink-400 pl-[160px]">
          {hours.map((h) => <div key={h} className="flex-1 py-1 border-l border-ink-900/5">{h}h</div>)}
        </div>
        {rows.map((t) => (
          <div key={t.id} className="flex items-stretch border-b border-ink-900/10">
            <div className="w-[160px] shrink-0 py-2 px-3"><Link href={`/technicians/${t.id}`} className="text-sm font-medium hover:underline">{t.firstName} {t.lastName}</Link></div>
            <div className="relative flex-1 h-11 cursor-copy" onDoubleClick={() => onAdd(day, t.id)}>
              {hours.map((h) => <div key={h} className="absolute top-0 bottom-0 border-l border-ink-900/5" style={{ left: `${(h - HOUR_START) / span * 100}%` }} />)}
              {bookingsFor(t.id, day).map((b) => {
                const left = Math.max(0, pos(b.start)); const right = Math.min(100, pos(b.end));
                const tone = gapTone(b);
                return (
                  <span key={b.id} onClick={() => onCycle(b)} title={`${hm(b.start)}–${hm(b.end)} · ${b.project.title}`}
                    className="absolute top-1 bottom-1 rounded text-[11px] text-white px-1.5 flex items-center gap-1 overflow-hidden cursor-pointer"
                    style={{ left: `${left}%`, width: `${Math.max(4, right - left)}%`, backgroundColor: STATUS_COLOR[b.status] }}>
                    {tone && <span className={`w-2 h-2 rounded-full shrink-0 ${tone === "block" ? "bg-red-600" : "bg-amber-300"}`} />}
                    <span className="truncate">{hm(b.start)} {b.project.title}</span>
                    <button onClick={(e) => { e.stopPropagation(); onDel(b.id); }} className="ml-auto opacity-70 hover:opacity-100"><Trash2 className="w-3 h-3" /></button>
                  </span>
                );
              })}
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-center py-10 text-ink-400 text-sm">Aucune affectation ce jour. Double-cliquez une ligne (vue semaine) ou « Nouvelle affectation ».</p>}
      </div>
    </CardContent></Card>
  );
}

// --- Vue MOIS : grille de jours ---
function MonthView({ anchor, bookings, onDay }: { anchor: Date; bookings: Booking[]; onDay: (d: Date) => void }) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = addDays(first, -startOffset);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  function dayBookings(d: Date) { return bookings.filter((b) => overlapsDay(b, d)); }
  return (
    <Card><CardContent className="p-3">
      <div className="grid grid-cols-7 gap-1 text-[11px] text-ink-400 mb-1">{DOW.map((d) => <div key={d} className="px-1">{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === anchor.getMonth();
          const items = dayBookings(d);
          const hasGap = items.some((b) => gapTone(b));
          return (
            <button key={i} onClick={() => onDay(d)} className={`text-left rounded-lg border p-1.5 min-h-[84px] align-top transition ${inMonth ? "border-ink-900/10 bg-white hover:border-signal-500/40" : "border-transparent bg-paper-2/40 text-ink-300"}`}>
              <div className="flex items-center justify-between"><span className={`text-xs ${inMonth ? "text-ink-700" : ""}`}>{d.getDate()}</span>{hasGap && <AlertTriangle className="w-3 h-3 text-red-500" />}</div>
              <div className="mt-0.5 space-y-0.5">
                {items.slice(0, 3).map((b) => <div key={b.id} className="text-[10px] truncate rounded px-1 text-white" style={{ backgroundColor: STATUS_COLOR[b.status] }}>{hm(b.start)} {b.project.title}</div>)}
                {items.length > 3 && <div className="text-[10px] text-ink-400">+{items.length - 3}</div>}
              </div>
            </button>
          );
        })}
      </div>
    </CardContent></Card>
  );
}

// --- Vue ANNÉE : 12 mini-mois, heatmap de charge ---
function YearView({ year, bookings, onMonth }: { year: number; bookings: Booking[]; onMonth: (m: number) => void }) {
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bookings) for (let d = new Date(b.start); d < new Date(b.end); d = addDays(d, 1)) { const k = ymd(d); map.set(k, (map.get(k) ?? 0) + 1); }
    return map;
  }, [bookings]);
  function tone(n: number) { return n === 0 ? "#Eceae3" : n < 2 ? "#Fbd38d" : n < 4 ? "#F6ad55" : n < 7 ? "#ED8936" : "#D97706"; }
  return (
    <Card><CardContent className="p-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }, (_, m) => {
          const first = new Date(year, m, 1); const off = (first.getDay() + 6) % 7; const gs = addDays(first, -off);
          return (
            <button key={m} onClick={() => onMonth(m)} className="text-left rounded-lg border border-ink-900/10 p-2 hover:border-signal-500/40 transition">
              <div className="text-xs font-medium text-ink-700 mb-1">{MONTHS[m]}</div>
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: 42 }, (_, i) => { const d = addDays(gs, i); const inM = d.getMonth() === m; const n = counts.get(ymd(d)) ?? 0; return <span key={i} className="w-3 h-3 rounded-[2px]" style={{ backgroundColor: inM ? tone(n) : "transparent" }} title={inM ? `${d.getDate()}/${m + 1} : ${n} affectation(s)` : ""} />; })}
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-ink-400 mt-3">Heatmap de charge (nb d&apos;affectations/jour). Cliquez un mois pour zoomer.</p>
    </CardContent></Card>
  );
}
