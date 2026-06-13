"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ClipboardCheck, Plus, Loader2, Trash2, Check, X } from "lucide-react";

interface Campaign { id: string; name: string; status: string; createdAt: string; total: number; traites: number }
interface Tech { id: string; firstName: string; lastName: string }
interface Cat { id: string; name: string; color: string; skills: { id: string; name: string }[] }
interface Assess { id: string; technicianId: string; skillId: string; skillName: string; proposedLevel: number; validatedLevel: number | null; status: string; technician: { firstName: string; lastName: string } }

const ASTATUS: Record<string, { label: string; color: string }> = {
  propose: { label: "Proposé", color: "#E89B2C" }, valide: { label: "Validé", color: "#10B981" }, ajuste: { label: "Ajusté", color: "#3B82F6" }, refuse: { label: "Refusé", color: "#94A3B8" },
};

export default function CampagnesPage() {
  const [list, setList] = useState<Campaign[]>([]);
  const [techs, setTechs] = useState<Tech[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => { setLoading(true); fetch("/api/campaigns").then((r) => r.json()).then((d) => setList(Array.isArray(d) ? d : [])).finally(() => setLoading(false)); }, []);
  useEffect(() => {
    load();
    fetch("/api/technicians?isActive=true&limit=500").then((r) => r.json()).then((d) => setTechs(Array.isArray(d.data) ? d.data : [])).catch(() => {});
    fetch("/api/skills/categories").then((r) => r.json()).then((d) => setCats(Array.isArray(d) ? d : [])).catch(() => {});
  }, [load]);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selT, setSelT] = useState<Set<string>>(new Set());
  const [selS, setSelS] = useState<Set<string>>(new Set());
  function tog(set: Set<string>, id: string, fn: (s: Set<string>) => void) { const n = new Set(set); n.has(id) ? n.delete(id) : n.add(id); fn(n); }
  async function create() {
    await fetch("/api/campaigns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, technicianIds: [...selT], skillIds: [...selS] }) });
    setOpen(false); setName(""); setSelT(new Set()); setSelS(new Set()); load();
  }
  async function remove(id: string) { if (!confirm("Supprimer cette campagne ?")) return; await fetch(`/api/campaigns/${id}`, { method: "DELETE" }); load(); }

  // review
  const [review, setReview] = useState<{ c: Campaign; items: Assess[] } | null>(null);
  const openReview = useCallback(async (c: Campaign) => {
    const r = await fetch(`/api/campaigns/${c.id}`); if (r.ok) { const d = await r.json(); setReview({ c, items: d.assessments }); }
  }, []);
  async function judge(a: Assess, status: string, level: number) {
    if (!review) return;
    await fetch(`/api/campaigns/${review.c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assessmentId: a.id, status, validatedLevel: level }) });
    const r = await fetch(`/api/campaigns/${review.c.id}`); if (r.ok) setReview({ c: review.c, items: (await r.json()).assessments });
    load();
  }
  async function close(c: Campaign) { await fetch(`/api/campaigns/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "close" }) }); setReview(null); load(); }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><ClipboardCheck className="w-6 h-6 text-ink-600" /><h1 className="text-2xl font-bold">Campagnes d&apos;évaluation</h1></div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" /> Nouvelle campagne</Button>
      </div>

      <Card><CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="text-xs text-ink-500 border-b border-ink-900/10"><tr><th className="text-left py-2 px-4">Campagne</th><th className="text-left py-2 px-3">Statut</th><th className="text-left py-2 px-3">Avancement</th><th></th></tr></thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="border-b border-ink-900/10 hover:bg-paper-2 cursor-pointer" onClick={() => openReview(c)}>
                <td className="py-2 px-4 font-medium text-ink-900">{c.name}</td>
                <td className="py-2 px-3"><Badge variant="outline" style={c.status === "cloturee" ? { color: "#94A3B8", borderColor: "#94A3B855" } : { color: "#10B981", borderColor: "#10B98155" }}>{c.status === "cloturee" ? "Clôturée" : "Ouverte"}</Badge></td>
                <td className="py-2 px-3 text-ink-600">{c.traites}/{c.total} traité(s)</td>
                <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}><button onClick={() => remove(c.id)} className="text-ink-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={4} className="text-center py-10 text-ink-400">{loading ? "Chargement…" : "Aucune campagne."}</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>

      {/* Create */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle campagne d&apos;évaluation</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Nom *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Revue compétences 2026" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Techniciens ({selT.size})</Label>
                <div className="max-h-44 overflow-y-auto border border-ink-900/10 rounded-lg p-2 mt-1 space-y-0.5">
                  {techs.map((t) => <label key={t.id} className="flex items-center gap-2 text-sm py-0.5 cursor-pointer"><input type="checkbox" checked={selT.has(t.id)} onChange={() => tog(selT, t.id, setSelT)} />{t.firstName} {t.lastName}</label>)}
                </div>
              </div>
              <div>
                <Label>Compétences ({selS.size})</Label>
                <div className="max-h-44 overflow-y-auto border border-ink-900/10 rounded-lg p-2 mt-1 space-y-1">
                  {cats.map((c) => (
                    <div key={c.id}>
                      <p className="text-[11px] font-semibold" style={{ color: c.color }}>{c.name}</p>
                      {c.skills.map((s) => <label key={s.id} className="flex items-center gap-2 text-sm py-0.5 cursor-pointer ml-1"><input type="checkbox" checked={selS.has(s.id)} onChange={() => tog(selS, s.id, setSelS)} />{s.name}</label>)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose><Button onClick={create} disabled={!name.trim() || selT.size === 0 || selS.size === 0}>Lancer ({selT.size * selS.size} évaluations)</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review */}
      <Dialog open={!!review} onOpenChange={(o) => !o && setReview(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{review?.c.name}</DialogTitle></DialogHeader>
          <div className="py-2 max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-ink-500 border-b border-ink-900/10"><tr><th className="text-left py-1.5">Technicien</th><th className="text-left py-1.5">Compétence</th><th className="py-1.5">Proposé</th><th className="py-1.5">Validé</th><th></th></tr></thead>
              <tbody>
                {review?.items.map((a) => <ReviewRow key={a.id} a={a} onJudge={judge} />)}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            {review?.c.status !== "cloturee" && <Button variant="outline" onClick={() => review && close(review.c)} className="mr-auto">Clôturer la campagne</Button>}
            <DialogClose asChild><Button variant="outline">Fermer</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReviewRow({ a, onJudge }: { a: Assess; onJudge: (a: Assess, status: string, level: number) => void }) {
  const [lvl, setLvl] = useState(a.validatedLevel ?? a.proposedLevel);
  const st = ASTATUS[a.status] ?? ASTATUS.propose;
  return (
    <tr className="border-b border-ink-900/5">
      <td className="py-1.5">{a.technician.firstName} {a.technician.lastName}</td>
      <td className="py-1.5 text-ink-600">{a.skillName}</td>
      <td className="py-1.5 text-center">{a.proposedLevel}</td>
      <td className="py-1.5 text-center">
        <input type="number" min={0} max={5} value={lvl} onChange={(e) => setLvl(Number(e.target.value))} className="w-12 px-1 py-0.5 rounded border border-ink-900/15 text-center" />
      </td>
      <td className="py-1.5 text-right whitespace-nowrap">
        {a.status === "propose" ? (
          <>
            <button onClick={() => onJudge(a, lvl === a.proposedLevel ? "valide" : "ajuste", lvl)} className="text-green-600 hover:bg-green-50 rounded px-1" title="Valider"><Check className="w-4 h-4 inline" /></button>
            <button onClick={() => onJudge(a, "refuse", lvl)} className="text-ink-400 hover:text-red-500 rounded px-1" title="Refuser"><X className="w-4 h-4 inline" /></button>
          </>
        ) : <Badge variant="outline" style={{ color: st.color, borderColor: st.color + "55" }}>{st.label}</Badge>}
      </td>
    </tr>
  );
}
