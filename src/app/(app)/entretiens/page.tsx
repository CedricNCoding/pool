"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { MessagesSquare, Plus, Loader2, Trash2, FileDown, FileSignature, Settings2 } from "lucide-react";

interface Interview { id: string; date: string; status: string; signedAt: string | null; technician: { id: string; firstName: string; lastName: string; company: { name: string } | null } }
interface Tech { id: string; firstName: string; lastName: string }
interface Template { id: string; name: string; sections: string }
interface Detail {
  id: string; date: string; status: string; managerNotes: string | null; employeeNotes: string | null; objectives: string | null; answers: string; signedAt: string | null;
  technician: { firstName: string; lastName: string; service: string; company: { name: string } | null };
  template: Template | null;
}
const ST: Record<string, { label: string; color: string }> = { planifie: { label: "Planifié", color: "#E89B2C" }, tenu: { label: "Tenu", color: "#3B82F6" }, signe: { label: "Signé", color: "#10B981" } };
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

export default function EntretiensPage() {
  const [list, setList] = useState<Interview[]>([]);
  const [techs, setTechs] = useState<Tech[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/interviews").then((r) => r.json()).then((d) => setList(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
    fetch("/api/interview-templates").then((r) => r.json()).then((d) => setTemplates(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);
  useEffect(() => { load(); fetch("/api/technicians?isActive=true&limit=500").then((r) => r.json()).then((d) => setTechs(Array.isArray(d.data) ? d.data : [])).catch(() => {}); }, [load]);

  // create
  const [open, setOpen] = useState(false);
  const [cf, setCf] = useState({ technicianId: "", date: "", templateId: "" });
  async function create() {
    await fetch("/api/interviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cf) });
    setOpen(false); setCf({ technicianId: "", date: "", templateId: "" }); load();
  }
  async function remove(id: string) { if (!confirm("Supprimer cet entretien ?")) return; await fetch(`/api/interviews/${id}`, { method: "DELETE" }); load(); }

  // template create
  const [tplOpen, setTplOpen] = useState(false);
  const [tpl, setTpl] = useState({ name: "", questions: "" });
  async function saveTpl() {
    await fetch("/api/interview-templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: tpl.name, questions: tpl.questions.split("\n").map((q) => q.trim()).filter(Boolean) }) });
    setTplOpen(false); setTpl({ name: "", questions: "" }); load();
  }

  // detail
  const [d, setD] = useState<Detail | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [mNotes, setMNotes] = useState(""); const [eNotes, setENotes] = useState(""); const [obj, setObj] = useState("");
  async function openDetail(id: string) {
    const r = await fetch(`/api/interviews/${id}`); if (!r.ok) return;
    const data: Detail = await r.json();
    setD(data); setAnswers(JSON.parse(data.answers || "{}")); setMNotes(data.managerNotes || ""); setENotes(data.employeeNotes || ""); setObj(data.objectives || "");
  }
  function tplQuestions(t: Template | null): string[] { if (!t) return []; try { return (JSON.parse(t.sections) as { questions: string[] }[]).flatMap((s) => s.questions); } catch { return []; } }
  async function saveDetail(status?: string) {
    if (!d) return;
    await fetch(`/api/interviews/${d.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers, managerNotes: mNotes, employeeNotes: eNotes, objectives: obj, ...(status ? { status } : {}) }) });
    setD(null); load();
  }
  async function exportPdf() {
    if (!d) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(11, 18, 32); doc.rect(0, 0, W, 22, "F");
    doc.setTextColor(255); doc.setFontSize(15); doc.setFont("helvetica", "bold"); doc.text("Compte rendu d'entretien", 14, 14);
    doc.setTextColor(20); doc.setFont("helvetica", "normal"); let y = 32;
    doc.setFontSize(11); doc.text(`${d.technician.firstName} ${d.technician.lastName} — ${d.technician.service}`, 14, y); y += 6;
    doc.setFontSize(9); doc.setTextColor(90); doc.text(`Date : ${fmt(d.date)}${d.signedAt ? ` · Signé le ${fmt(d.signedAt)}` : ""}`, 14, y); y += 8;
    doc.setTextColor(20);
    const qs = tplQuestions(d.template);
    for (let i = 0; i < qs.length; i++) {
      if (y > 260) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); const ql = doc.splitTextToSize(qs[i], W - 28); doc.text(ql, 14, y); y += ql.length * 5;
      doc.setFont("helvetica", "normal"); const al = doc.splitTextToSize(answers[i] || "—", W - 28); doc.text(al, 14, y); y += al.length * 5 + 4;
    }
    for (const [title, val] of [["Bilan manager", mNotes], ["Souhaits du salarié", eNotes], ["Objectifs", obj]] as const) {
      if (!val) continue; if (y > 255) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text(title, 14, y); y += 5;
      doc.setFont("helvetica", "normal"); const l = doc.splitTextToSize(val, W - 28); doc.text(l, 14, y); y += l.length * 5 + 4;
    }
    const sy = Math.max(y + 10, 250);
    doc.setDrawColor(180); doc.setFontSize(9); doc.text("Signature salarié", 14, sy); doc.rect(14, sy + 2, 70, 20);
    doc.text("Signature responsable", W - 84, sy); doc.rect(W - 84, sy + 2, 70, 20);
    doc.save(`entretien_${d.technician.lastName}.pdf`);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3"><MessagesSquare className="w-6 h-6 text-ink-600" /><h1 className="text-2xl font-bold">Entretiens</h1></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTplOpen(true)}><Settings2 className="w-4 h-4 mr-2" /> Modèles ({templates.length})</Button>
          <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" /> Nouvel entretien</Button>
        </div>
      </div>

      <Card><CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="text-xs text-ink-500 border-b border-ink-900/10"><tr><th className="text-left py-2 px-4">Technicien</th><th className="text-left py-2 px-3">Date</th><th className="text-left py-2 px-3">Statut</th><th></th></tr></thead>
          <tbody>
            {list.map((iv) => {
              const st = ST[iv.status] ?? ST.planifie;
              return (
                <tr key={iv.id} className="border-b border-ink-900/10 hover:bg-paper-2 cursor-pointer" onClick={() => openDetail(iv.id)}>
                  <td className="py-2 px-4"><span className="font-medium text-ink-900">{iv.technician.firstName} {iv.technician.lastName}</span>{iv.technician.company && <span className="text-xs text-ink-400"> · {iv.technician.company.name}</span>}</td>
                  <td className="py-2 px-3 text-ink-600">{fmt(iv.date)}</td>
                  <td className="py-2 px-3"><Badge variant="outline" style={{ color: st.color, borderColor: st.color + "55" }}>{st.label}</Badge></td>
                  <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}><button onClick={() => remove(iv.id)} className="text-ink-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              );
            })}
            {list.length === 0 && <tr><td colSpan={4} className="text-center py-10 text-ink-400">{loading ? "Chargement…" : "Aucun entretien."}</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>

      {/* Create */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvel entretien</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Technicien *</Label>
              <select className="w-full px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm" value={cf.technicianId} onChange={(e) => setCf((f) => ({ ...f, technicianId: e.target.value }))}>
                <option value="">— Choisir —</option>{techs.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date *</Label><Input type="date" value={cf.date} onChange={(e) => setCf((f) => ({ ...f, date: e.target.value }))} /></div>
              <div><Label>Trame</Label>
                <select className="w-full px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm h-10" value={cf.templateId} onChange={(e) => setCf((f) => ({ ...f, templateId: e.target.value }))}>
                  <option value="">Aucune</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose><Button onClick={create} disabled={!cf.technicianId || !cf.date}>Créer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template */}
      <Dialog open={tplOpen} onOpenChange={setTplOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle trame d&apos;entretien</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Nom *</Label><Input value={tpl.name} onChange={(e) => setTpl((f) => ({ ...f, name: e.target.value }))} placeholder="ex: Entretien professionnel" /></div>
            <div><Label>Questions (une par ligne)</Label><Textarea rows={6} value={tpl.questions} onChange={(e) => setTpl((f) => ({ ...f, questions: e.target.value }))} placeholder={"Bilan de la période écoulée\nCompétences à développer\nSouhaits d'évolution\nBesoins de formation"} /></div>
            {templates.length > 0 && <p className="text-xs text-ink-400">{templates.length} trame(s) existante(s).</p>}
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Fermer</Button></DialogClose><Button onClick={saveTpl} disabled={!tpl.name.trim()}>Créer la trame</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail */}
      <Dialog open={!!d} onOpenChange={(o) => !o && setD(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Entretien — {d?.technician.firstName} {d?.technician.lastName}</DialogTitle></DialogHeader>
          <div className="py-2 space-y-3 max-h-[60vh] overflow-y-auto">
            {tplQuestions(d?.template ?? null).map((q, i) => (
              <div key={i}><Label className="text-sm">{q}</Label><Textarea rows={2} value={answers[i] || ""} onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))} disabled={d?.status === "signe"} /></div>
            ))}
            <div><Label>Bilan manager</Label><Textarea rows={2} value={mNotes} onChange={(e) => setMNotes(e.target.value)} disabled={d?.status === "signe"} /></div>
            <div><Label>Souhaits du salarié</Label><Textarea rows={2} value={eNotes} onChange={(e) => setENotes(e.target.value)} disabled={d?.status === "signe"} /></div>
            <div><Label>Objectifs</Label><Textarea rows={2} value={obj} onChange={(e) => setObj(e.target.value)} disabled={d?.status === "signe"} /></div>
          </div>
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={exportPdf} className="mr-auto"><FileDown className="w-4 h-4 mr-1" /> CR PDF</Button>
            {d?.status !== "signe" && <Button variant="outline" onClick={() => saveDetail()}>Enregistrer</Button>}
            {d?.status === "planifie" && <Button variant="outline" onClick={() => saveDetail("tenu")}>Marquer tenu</Button>}
            {d?.status !== "signe" && <Button onClick={() => saveDetail("signe")}><FileSignature className="w-4 h-4 mr-1" /> Signer</Button>}
            {d?.status === "signe" && <Badge variant="outline" style={{ color: "#10B981", borderColor: "#10B98155" }}>Signé le {fmt(d?.signedAt ?? null)}</Badge>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
