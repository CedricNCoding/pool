"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { FileText, Plus, Loader2, Trash2, Pencil, FileDown } from "lucide-react";
import { SERVICES } from "@/lib/constants";

interface Stats {
  effectif: number; ancienneteMoyenne: number | null; medicalOk: number; medicalTotal: number;
  byService: Record<string, number>; habilitations: { name: string; n: number }[];
  equip: number; equipOverdue: number; riskUnits: number; riskItems: number; riskOpen: number; sessions: number;
}
interface Section { id: string; title: string; content: string; order: number }
const serviceLabel = (v: string) => SERVICES.find((s) => s.value === v)?.label ?? v;

export default function MemoirePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/memo").then((r) => r.json()).then((d) => { setStats(d.stats); setSections(d.sections || []); }).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const [edit, setEdit] = useState<Section | null>(null);
  const [form, setForm] = useState({ title: "", content: "" });
  function openNew() { setEdit({ id: "", title: "", content: "", order: sections.length }); setForm({ title: "", content: "" }); }
  function openEdit(s: Section) { setEdit(s); setForm({ title: s.title, content: s.content }); }
  async function save() {
    if (!form.title.trim() || !edit) return;
    const url = edit.id ? `/api/memo/${edit.id}` : "/api/memo";
    await fetch(url, { method: edit.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, order: edit.order }) });
    setEdit(null); load();
  }
  async function remove(id: string) { if (!confirm("Supprimer ce chapitre ?")) return; await fetch(`/api/memo/${id}`, { method: "DELETE" }); load(); }

  async function exportPdf() {
    if (!stats) return;
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(11, 18, 32); doc.rect(0, 0, W, 24, "F");
    doc.setTextColor(255); doc.setFontSize(16); doc.setFont("helvetica", "bold");
    doc.text("Mémoire technique — Moyens humains", 14, 15);
    doc.setTextColor(20); doc.setFont("helvetica", "normal");
    let y = 34;
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("1. Capacités et effectif", 14, y); y += 2;
    autoTable(doc, {
      startY: y + 2,
      body: [
        ["Effectif technique", `${stats.effectif} technicien(s)`],
        ["Ancienneté moyenne", stats.ancienneteMoyenne != null ? `${stats.ancienneteMoyenne} an(s)` : "n/c"],
        ["Aptitude médicale à jour", `${stats.medicalOk}/${stats.medicalTotal}`],
        ["Sessions de formation", String(stats.sessions)],
        ["Parc EPI / matériel", `${stats.equip} équipement(s)${stats.equipOverdue ? ` (${stats.equipOverdue} VGP en retard)` : ""}`],
        ["DUERP", `${stats.riskUnits} unité(s), ${stats.riskItems} risque(s) évalué(s), ${stats.riskOpen} en cours`],
      ],
      theme: "plain", bodyStyles: { fontSize: 9 }, margin: { left: 14, right: 14 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 70 } },
    });
    // @ts-expect-error lastAutoTable
    y = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("2. Répartition par métier", 14, y);
    autoTable(doc, { startY: y + 2, head: [["Métier", "Effectif"]], body: Object.entries(stats.byService).map(([s, n]) => [serviceLabel(s), String(n)]), headStyles: { fillColor: [11, 18, 32], fontSize: 9 }, bodyStyles: { fontSize: 9 }, margin: { left: 14, right: 14 } });
    // @ts-expect-error lastAutoTable
    y = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("3. Habilitations sécurité valides", 14, y);
    autoTable(doc, { startY: y + 2, head: [["Habilitation", "Titulaires"]], body: stats.habilitations.map((h) => [h.name, String(h.n)]), headStyles: { fillColor: [11, 18, 32], fontSize: 9 }, bodyStyles: { fontSize: 9 }, margin: { left: 14, right: 14 } });
    // @ts-expect-error lastAutoTable
    y = doc.lastAutoTable.finalY + 8;
    for (const s of sections) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text(s.title, 14, y); y += 6;
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(s.content || "", W - 28);
      doc.text(lines, 14, y); y += lines.length * 5 + 8;
    }
    doc.save("memoire_technique.pdf");
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3"><FileText className="w-6 h-6 text-ink-600" /><h1 className="text-2xl font-bold">Mémoire technique</h1></div>
        <Button onClick={exportPdf} disabled={!stats}><FileDown className="w-4 h-4 mr-2" /> Générer le PDF</Button>
      </div>
      <p className="text-sm text-ink-500 mb-6">Volet « moyens humains » d&apos;un dossier de candidature marché public : chiffres calculés en direct + chapitres rédigés réutilisables.</p>

      {loading || !stats ? <div className="flex items-center gap-2 text-ink-400"><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</div> : (
        <>
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-base">Chiffres-clés (automatiques)</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <Stat label="Effectif technique" value={`${stats.effectif}`} />
              <Stat label="Ancienneté moyenne" value={stats.ancienneteMoyenne != null ? `${stats.ancienneteMoyenne} ans` : "n/c"} />
              <Stat label="Aptitude médicale à jour" value={`${stats.medicalOk}/${stats.medicalTotal}`} />
              <Stat label="Habilitations sécu (types)" value={`${stats.habilitations.length}`} />
              <Stat label="Parc EPI / matériel" value={`${stats.equip}`} />
              <Stat label="DUERP — risques évalués" value={`${stats.riskItems}`} />
            </CardContent>
          </Card>

          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Chapitres rédigés</h2>
            <Button size="sm" variant="outline" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> Chapitre</Button>
          </div>
          <div className="space-y-3">
            {sections.map((s) => (
              <Card key={s.id}><CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-medium text-ink-900">{s.title}</h3>
                    <p className="text-sm text-ink-500 mt-1 whitespace-pre-wrap line-clamp-3">{s.content}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(s)} className="text-ink-400 hover:text-signal-600"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(s.id)} className="text-ink-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </CardContent></Card>
            ))}
            {sections.length === 0 && <p className="text-ink-400 text-sm">Aucun chapitre. Ajoutez-en (ex. « Organisation et encadrement », « Démarche qualité-sécurité »).</p>}
          </div>
        </>
      )}

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{edit?.id ? "Modifier le chapitre" : "Nouveau chapitre"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Titre *</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Contenu</Label><Textarea rows={8} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} /></div>
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose><Button onClick={save} disabled={!form.title.trim()}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-paper-2 p-3"><div className="text-2xl font-bold text-ink-900">{value}</div><div className="text-xs text-ink-500">{label}</div></div>;
}
