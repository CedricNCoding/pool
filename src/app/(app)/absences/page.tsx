"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { CalendarOff, Plus, Loader2, Trash2, Check, X } from "lucide-react";

interface Absence {
  id: string; type: string; start: string | null; end: string | null; recurringWeekday: number | null; reason: string | null; status: string;
  technician: { id: string; firstName: string; lastName: string; company: { name: string; color: string } | null };
}
interface Tech { id: string; firstName: string; lastName: string }

const TYPES = [["cp", "Congé payé"], ["rtt", "RTT"], ["maladie", "Arrêt maladie"], ["sans_solde", "Sans solde"], ["indispo", "Indispo perso"], ["autre", "Autre"]] as const;
const TYPE_LABEL: Record<string, string> = Object.fromEntries(TYPES.map(([v, l]) => [v, l]));
const DOW = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const STATUS: Record<string, { label: string; color: string }> = {
  demande: { label: "À valider", color: "#E89B2C" }, valide: { label: "Validée", color: "#10B981" }, refuse: { label: "Refusée", color: "#94A3B8" },
};
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "");

export default function AbsencesPage() {
  const [list, setList] = useState<Absence[]>([]);
  const [techs, setTechs] = useState<Tech[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"dates" | "recurrent">("dates");
  const [form, setForm] = useState({ technicianId: "", type: "cp", start: "", end: "", recurringWeekday: "3", reason: "" });

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/absences").then((r) => r.json()).then((d) => setList(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); fetch("/api/technicians?isActive=true&limit=500").then((r) => r.json()).then((d) => setTechs(Array.isArray(d.data) ? d.data : [])).catch(() => {}); }, [load]);

  async function save() {
    if (!form.technicianId) return;
    setSaving(true);
    const body = mode === "recurrent"
      ? { technicianId: form.technicianId, type: form.type, recurringWeekday: form.recurringWeekday, reason: form.reason }
      : { technicianId: form.technicianId, type: form.type, start: form.start, end: form.end, reason: form.reason };
    const res = await fetch("/api/absences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);
    if (res.ok) { setOpen(false); setForm({ technicianId: "", type: "cp", start: "", end: "", recurringWeekday: "3", reason: "" }); load(); }
  }
  async function setStatus(id: string, status: string) {
    await fetch(`/api/absences/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    load();
  }
  async function remove(id: string) { if (!confirm("Supprimer cette absence ?")) return; await fetch(`/api/absences/${id}`, { method: "DELETE" }); load(); }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><CalendarOff className="w-6 h-6 text-ink-600" /><h1 className="text-2xl font-bold">Absences</h1></div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" /> Nouvelle absence</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-ink-500 border-b border-ink-900/10">
              <tr><th className="text-left py-2 px-4">Technicien</th><th className="text-left py-2 px-4">Type</th><th className="text-left py-2 px-4">Période</th><th className="text-left py-2 px-4">Statut</th><th className="text-right py-2 px-4">Actions</th></tr>
            </thead>
            <tbody>
              {list.map((a) => {
                const st = STATUS[a.status] ?? STATUS.valide;
                return (
                  <tr key={a.id} className="border-b border-ink-900/10">
                    <td className="py-2 px-4"><Link href={`/technicians/${a.technician.id}`} className="font-medium hover:underline">{a.technician.firstName} {a.technician.lastName}</Link></td>
                    <td className="py-2 px-4">{TYPE_LABEL[a.type] ?? a.type}</td>
                    <td className="py-2 px-4 text-ink-600">{a.recurringWeekday != null ? `Tous les ${DOW[a.recurringWeekday].toLowerCase()}` : `${fmt(a.start)} → ${fmt(a.end)}`}{a.reason ? ` · ${a.reason}` : ""}</td>
                    <td className="py-2 px-4"><Badge variant="outline" style={{ color: st.color, borderColor: st.color + "55" }}>{st.label}</Badge></td>
                    <td className="py-2 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {a.status === "demande" && <>
                          <Button size="sm" variant="outline" onClick={() => setStatus(a.id, "valide")}><Check className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="text-ink-400" onClick={() => setStatus(a.id, "refuse")}><X className="w-3.5 h-3.5" /></Button>
                        </>}
                        <button onClick={() => remove(a.id)} className="text-ink-400 hover:text-red-500 ml-1"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-ink-400">{loading ? "Chargement…" : "Aucune absence."}</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle absence</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Technicien *</Label>
              <select className="w-full px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm" value={form.technicianId} onChange={(e) => setForm((f) => ({ ...f, technicianId: e.target.value }))}>
                <option value="">— Choisir —</option>
                {techs.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
              </select>
            </div>
            <div>
              <Label>Type</Label>
              <select className="w-full px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="flex gap-1.5">
              {([["dates", "Période"], ["recurrent", "Récurrent (hebdo)"]] as const).map(([m, l]) => (
                <button key={m} onClick={() => setMode(m)} className={`px-3 py-1.5 text-sm rounded-md border transition ${mode === m ? "bg-signal-500 text-[#0B1220] border-signal-500" : "border-ink-900/15 text-ink-600 hover:bg-paper-2"}`}>{l}</button>
              ))}
            </div>
            {mode === "dates" ? (
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Du</Label><Input type="date" value={form.start} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} /></div>
                <div><Label>Au</Label><Input type="date" value={form.end} onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} /></div>
              </div>
            ) : (
              <div>
                <Label>Jour de la semaine (indispo permanente)</Label>
                <select className="w-full px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm" value={form.recurringWeekday} onChange={(e) => setForm((f) => ({ ...f, recurringWeekday: e.target.value }))}>
                  {DOW.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
            )}
            <div><Label>Motif (optionnel)</Label><Input value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={save} disabled={saving || !form.technicianId || (mode === "dates" && (!form.start || !form.end))}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
