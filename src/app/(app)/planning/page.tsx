"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Loader2, Trash2, Gauge } from "lucide-react";

interface Booking {
  id: string; start: string; end: string; role: string | null; status: string;
  project: { id: string; title: string };
  technician: { id: string; firstName: string; lastName: string; company: { name: string; color: string } | null };
}
interface Absence {
  id: string; type: string; start: string | null; end: string | null; recurringWeekday: number | null; status: string;
  technician: { id: string; firstName: string; lastName: string };
}
interface Tech { id: string; firstName: string; lastName: string; company: { name: string; color: string } | null }
interface Proj { id: string; title: string }

const STATUS_COLOR: Record<string, string> = { pressenti: "#E89B2C", confirme: "#10B981", decline: "#94A3B8" };
const ABS_LABEL: Record<string, string> = { cp: "CP", rtt: "RTT", maladie: "Arrêt", sans_solde: "Sans solde", indispo: "Indispo", autre: "Absence" };
const DOW = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function mondayOf(d: Date) { const x = new Date(d); const dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); x.setHours(0, 0, 0, 0); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function ymd(d: Date) { return d.toISOString().slice(0, 10); }
function sameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString(); }

export default function PlanningPage() {
  const [tab, setTab] = useState<"calendrier" | "charge">("calendrier");
  const [view, setView] = useState<"tech" | "projet" | "equipe">("tech");
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [techs, setTechs] = useState<Tech[]>([]);
  const [projects, setProjects] = useState<Proj[]>([]);
  const [equipeProject, setEquipeProject] = useState("");
  const [loading, setLoading] = useState(true);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekEnd = addDays(weekStart, 7);

  const load = useCallback(() => {
    setLoading(true);
    const qs = `from=${ymd(weekStart)}&to=${ymd(weekEnd)}`;
    Promise.all([
      fetch(`/api/bookings?${qs}`).then((r) => r.json()),
      fetch(`/api/absences`).then((r) => r.json()),
    ]).then(([b, a]) => {
      setBookings(Array.isArray(b) ? b : []);
      setAbsences(Array.isArray(a) ? a : []);
    }).finally(() => setLoading(false));
  }, [weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/technicians?isActive=true&limit=500").then((r) => r.json()).then((d) => setTechs(Array.isArray(d.data) ? d.data : [])).catch(() => {});
    fetch("/api/projects").then((r) => r.json()).then((d) => setProjects(Array.isArray(d) ? d : (d.data ?? []))).catch(() => {});
  }, []);

  // index bookings par technicien+jour et par projet+jour
  function bookingsFor(techId: string, day: Date) {
    return bookings.filter((b) => b.technician.id === techId && new Date(b.start) < addDays(day, 1) && new Date(b.end) > day);
  }
  function absencesFor(techId: string, day: Date) {
    return absences.filter((a) => {
      if (a.technician.id !== techId || a.status === "refuse") return false;
      if (a.recurringWeekday != null) return day.getDay() === a.recurringWeekday;
      return a.start && a.end && new Date(a.start) < addDays(day, 1) && new Date(a.end) > day;
    });
  }

  // lignes selon la vue
  const rows: Tech[] = useMemo(() => {
    if (view === "equipe") {
      if (!equipeProject) return [];
      const ids = new Set(bookings.filter((b) => b.project.id === equipeProject).map((b) => b.technician.id));
      return techs.filter((t) => ids.has(t.id));
    }
    // tech : techniciens ayant une affectation/absence cette semaine, sinon tous (plafonné)
    const active = new Set([...bookings.map((b) => b.technician.id)]);
    const withRows = techs.filter((t) => active.has(t.id));
    return withRows.length > 0 ? [...withRows, ...techs.filter((t) => !active.has(t.id))].slice(0, 60) : techs.slice(0, 60);
  }, [view, equipeProject, bookings, techs]);

  const projectRows = useMemo(() => {
    const ids = [...new Set(bookings.map((b) => b.project.id))];
    return ids.map((id) => bookings.find((b) => b.project.id === id)!.project);
  }, [bookings]);

  // --- dialog nouvelle affectation ---
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState<{ conflicts: string[]; warnings: string[] } | null>(null);
  const [form, setForm] = useState({ technicianId: "", projectId: "", date: ymd(new Date()), startTime: "09:00", endTime: "17:00", role: "", force: false });
  function openNew(day?: Date, techId?: string) {
    setConflict(null);
    setForm({ technicianId: techId || "", projectId: equipeProject || "", date: ymd(day || weekStart), startTime: "09:00", endTime: "17:00", role: "", force: false });
    setOpen(true);
  }
  async function save() {
    if (!form.technicianId || !form.projectId) return;
    setSaving(true); setConflict(null);
    const start = new Date(`${form.date}T${form.startTime}`).toISOString();
    const end = new Date(`${form.date}T${form.endTime}`).toISOString();
    const res = await fetch("/api/bookings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, start, end }),
    });
    setSaving(false);
    if (res.status === 409) { setConflict(await res.json()); return; }
    if (res.ok) { setOpen(false); load(); }
  }
  async function removeBooking(id: string) {
    if (!confirm("Retirer cette affectation ?")) return;
    await fetch(`/api/bookings/${id}`, { method: "DELETE" });
    load();
  }
  async function cycleStatus(b: Booking) {
    const next = b.status === "pressenti" ? "confirme" : b.status === "confirme" ? "decline" : "pressenti";
    await fetch(`/api/bookings/${b.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
    load();
  }

  // --- charge (sur la semaine affichée) ---
  const charge = useMemo(() => {
    const map = new Map<string, { tech: Tech; days: Set<string> }>();
    for (const t of techs) map.set(t.id, { tech: t, days: new Set() });
    for (const b of bookings) {
      const e = map.get(b.technician.id); if (!e) continue;
      for (let d = new Date(b.start); d < new Date(b.end); d = addDays(d, 1)) {
        if (d >= weekStart && d < weekEnd && d.getDay() !== 0 && d.getDay() !== 6) e.days.add(d.toDateString());
      }
    }
    return [...map.values()].map((e) => ({ tech: e.tech, jours: e.days.size, taux: Math.round((e.days.size / 5) * 100) }))
      .filter((e) => e.jours > 0 || true).sort((a, b) => b.taux - a.taux);
  }, [bookings, techs, weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <CalendarDays className="w-6 h-6 text-ink-600" />
          <h1 className="text-2xl font-bold">Planning</h1>
        </div>
        <Button onClick={() => openNew()}><Plus className="w-4 h-4 mr-2" /> Nouvelle affectation</Button>
      </div>

      <div className="flex gap-1 mb-4 border-b border-ink-900/10">
        {([["calendrier", "Calendrier"], ["charge", "Charge & équilibrage"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 text-sm border-b-2 -mb-px transition ${tab === k ? "border-signal-500 text-ink-900" : "border-transparent text-ink-500 hover:text-ink-800"}`}>{l}</button>
        ))}
      </div>

      {/* navigation semaine */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(mondayOf(new Date()))}>Cette semaine</Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}><ChevronRight className="w-4 h-4" /></Button>
          <span className="text-sm text-ink-500 ml-2">{weekStart.toLocaleDateString("fr-FR")} – {addDays(weekStart, 6).toLocaleDateString("fr-FR")}</span>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-ink-400" />}
        </div>
        {tab === "calendrier" && (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {([["tech", "Par technicien"], ["projet", "Par projet"], ["equipe", "Par équipe"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setView(k)} className={`px-3 py-1.5 text-sm rounded-md border transition ${view === k ? "bg-signal-500 text-[#0B1220] border-signal-500" : "border-ink-900/15 text-ink-600 hover:bg-paper-2"}`}>{l}</button>
              ))}
            </div>
            {view === "equipe" && (
              <select className="px-3 py-1.5 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm" value={equipeProject} onChange={(e) => setEquipeProject(e.target.value)}>
                <option value="">— Choisir un projet —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            )}
          </div>
        )}
      </div>

      {tab === "calendrier" && (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-xs text-ink-500 border-b border-ink-900/10">
                  <th className="text-left py-2 px-3 sticky left-0 bg-paper-bone min-w-[160px]">{view === "projet" ? "Projet" : "Technicien"}</th>
                  {days.map((d, i) => (
                    <th key={i} className={`text-center py-2 px-2 min-w-[120px] ${[5, 6].includes(i) ? "bg-paper-2/50" : ""}`}>
                      {DOW[i]} <span className="text-ink-400">{d.getDate()}/{d.getMonth() + 1}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {view === "projet" ? (
                  projectRows.map((p) => (
                    <tr key={p.id} className="border-b border-ink-900/10 align-top">
                      <td className="py-2 px-3 sticky left-0 bg-paper-bone font-medium"><Link href={`/projets/${p.id}`} className="hover:underline">{p.title}</Link></td>
                      {days.map((d, i) => {
                        const items = bookings.filter((b) => b.project.id === p.id && new Date(b.start) < addDays(d, 1) && new Date(b.end) > d);
                        return <td key={i} className={`py-1.5 px-1.5 align-top ${[5, 6].includes(i) ? "bg-paper-2/40" : ""}`}>
                          {items.map((b) => <Chip key={b.id} label={`${b.technician.firstName} ${b.technician.lastName[0]}.`} color={STATUS_COLOR[b.status]} role={b.role} onClick={() => cycleStatus(b)} onDel={() => removeBooking(b.id)} />)}
                        </td>;
                      })}
                    </tr>
                  ))
                ) : (
                  rows.map((t) => (
                    <tr key={t.id} className="border-b border-ink-900/10 align-top">
                      <td className="py-2 px-3 sticky left-0 bg-paper-bone">
                        <Link href={`/technicians/${t.id}`} className="font-medium hover:underline">{t.firstName} {t.lastName}</Link>
                        {t.company && <div className="flex items-center gap-1 text-[11px] text-ink-400"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.company.color }} />{t.company.name}</div>}
                      </td>
                      {days.map((d, i) => {
                        const bk = bookingsFor(t.id, d);
                        const ab = absencesFor(t.id, d);
                        return <td key={i} className={`py-1.5 px-1.5 align-top group ${[5, 6].includes(i) ? "bg-paper-2/40" : ""}`} onDoubleClick={() => openNew(d, t.id)}>
                          {ab.map((a) => <span key={a.id} className="block text-[11px] px-1.5 py-0.5 mb-1 rounded bg-ink-900/10 text-ink-500">{ABS_LABEL[a.type] ?? "Abs."}</span>)}
                          {bk.map((b) => <Chip key={b.id} label={b.project.title} color={STATUS_COLOR[b.status]} role={b.role} onClick={() => cycleStatus(b)} onDel={() => removeBooking(b.id)} />)}
                        </td>;
                      })}
                    </tr>
                  ))
                )}
                {((view === "equipe" && rows.length === 0) || (view === "projet" && projectRows.length === 0)) && (
                  <tr><td colSpan={8} className="text-center py-10 text-ink-400">{view === "equipe" ? "Choisissez un projet pour voir le planning de son équipe." : "Aucune affectation cette semaine."}</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {tab === "charge" && (
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 text-xs text-ink-500 border-b border-ink-900/10 flex items-center gap-2"><Gauge className="w-4 h-4" /> Taux d&apos;occupation sur la semaine affichée (jours affectés ÷ 5 jours ouvrés)</div>
            <table className="w-full text-sm">
              <tbody>
                {charge.map((c) => (
                  <tr key={c.tech.id} className="border-b border-ink-900/10">
                    <td className="py-2 px-4 w-1/4"><Link href={`/technicians/${c.tech.id}`} className="hover:underline">{c.tech.firstName} {c.tech.lastName}</Link></td>
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2.5 rounded-full bg-ink-900/10 overflow-hidden max-w-md">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(100, c.taux)}%`, backgroundColor: c.taux > 100 ? "#EF4444" : c.taux >= 80 ? "#10B981" : c.taux >= 40 ? "#E89B2C" : "#94A3B8" }} />
                        </div>
                        <span className="text-xs text-ink-500 w-24">{c.jours} j · {c.taux}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Dialog nouvelle affectation */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle affectation</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Technicien *</Label>
              <select className="w-full px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm" value={form.technicianId} onChange={(e) => setForm((f) => ({ ...f, technicianId: e.target.value }))}>
                <option value="">— Choisir —</option>
                {techs.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}{t.company ? ` (${t.company.name})` : ""}</option>)}
              </select>
            </div>
            <div>
              <Label>Projet / mission *</Label>
              <select className="w-full px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm" value={form.projectId} onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}>
                <option value="">— Choisir —</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
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
                <p className="font-medium text-red-700">Conflit de planning :</p>
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

function Chip({ label, color, role, onClick, onDel }: { label: string; color: string; role: string | null; onClick: () => void; onDel: () => void }) {
  return (
    <span className="group/chip relative flex items-center gap-1 text-[11px] px-1.5 py-0.5 mb-1 rounded text-white cursor-pointer" style={{ backgroundColor: color }} onClick={onClick} title="Cliquer : changer le statut">
      <span className="truncate max-w-[110px]">{label}{role ? ` · ${role}` : ""}</span>
      <button onClick={(e) => { e.stopPropagation(); onDel(); }} className="opacity-0 group-hover/chip:opacity-100 shrink-0"><Trash2 className="w-3 h-3" /></button>
    </span>
  );
}
