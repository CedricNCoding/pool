"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ShieldAlert, Plus, Loader2, Trash2, Pencil, FileDown } from "lucide-react";

interface Item {
  id: string; danger: string; exposure: string | null; gravity: number; probability: number;
  existingMeasures: string | null; plannedMeasures: string | null; dueDate: string | null; responsible: string | null; status: string;
}
interface Unit { id: string; name: string; description: string | null; items: Item[] }

const STATUS: Record<string, { label: string; color: string }> = {
  a_traiter: { label: "À traiter", color: "#EF4444" }, en_cours: { label: "En cours", color: "#E89B2C" }, maitrise: { label: "Maîtrisé", color: "#10B981" },
};
function critColor(c: number) { return c > 12 ? "#EF4444" : c > 8 ? "#F97316" : c > 4 ? "#E89B2C" : "#10B981"; }
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

export default function DuerpPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => { setLoading(true); fetch("/api/duerp/units").then((r) => r.json()).then((d) => setUnits(Array.isArray(d) ? d : [])).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);

  const [unitOpen, setUnitOpen] = useState(false);
  const [unitForm, setUnitForm] = useState({ name: "", description: "" });
  async function saveUnit() {
    if (!unitForm.name.trim()) return;
    await fetch("/api/duerp/units", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(unitForm) });
    setUnitOpen(false); setUnitForm({ name: "", description: "" }); load();
  }
  async function delUnit(id: string) { if (!confirm("Supprimer cette unité et ses risques ?")) return; await fetch(`/api/duerp/units/${id}`, { method: "DELETE" }); load(); }

  const emptyItem = { id: "", riskUnitId: "", danger: "", exposure: "", gravity: 2, probability: 2, existingMeasures: "", plannedMeasures: "", dueDate: "", responsible: "", status: "a_traiter" };
  const [item, setItem] = useState<typeof emptyItem>(emptyItem);
  const [itemOpen, setItemOpen] = useState(false);
  function openNewItem(unitId: string) { setItem({ ...emptyItem, riskUnitId: unitId }); setItemOpen(true); }
  function openEditItem(u: Unit, it: Item) { setItem({ id: it.id, riskUnitId: u.id, danger: it.danger, exposure: it.exposure || "", gravity: it.gravity, probability: it.probability, existingMeasures: it.existingMeasures || "", plannedMeasures: it.plannedMeasures || "", dueDate: it.dueDate ? it.dueDate.slice(0, 10) : "", responsible: it.responsible || "", status: it.status }); setItemOpen(true); }
  async function saveItem() {
    if (!item.danger.trim()) return;
    const url = item.id ? `/api/duerp/items/${item.id}` : "/api/duerp/items";
    await fetch(url, { method: item.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item) });
    setItemOpen(false); load();
  }
  async function delItem(id: string) { if (!confirm("Supprimer ce risque ?")) return; await fetch(`/api/duerp/items/${id}`, { method: "DELETE" }); load(); }

  async function exportPdf() {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
    doc.setFontSize(15); doc.text("DUERP — Document unique d'évaluation des risques", 14, 16);
    doc.setFontSize(9); doc.text(`Édité le ${new Date().toLocaleDateString("fr-FR")}`, 14, 22);
    let y = 28;
    for (const u of units) {
      doc.setFontSize(11); doc.setTextColor(20); doc.text(u.name, 14, y); y += 2;
      autoTable(doc, {
        startY: y + 2,
        head: [["Danger", "Exposition", "G", "P", "Crit.", "Mesures existantes", "Mesures prévues", "Échéance", "Statut"]],
        body: u.items.map((it) => [it.danger, it.exposure || "-", it.gravity, it.probability, it.gravity * it.probability, it.existingMeasures || "-", it.plannedMeasures || "-", fmt(it.dueDate), STATUS[it.status]?.label ?? it.status]),
        headStyles: { fillColor: [11, 18, 32], fontSize: 7 }, bodyStyles: { fontSize: 7 }, margin: { left: 14, right: 14 },
      });
      // @ts-expect-error lastAutoTable
      y = doc.lastAutoTable.finalY + 8;
      if (y > 180) { doc.addPage(); y = 20; }
    }
    doc.save("duerp.pdf");
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3"><ShieldAlert className="w-6 h-6 text-ink-600" /><h1 className="text-2xl font-bold">DUERP</h1></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportPdf} disabled={units.length === 0}><FileDown className="w-4 h-4 mr-2" /> Exporter</Button>
          <Button onClick={() => setUnitOpen(true)}><Plus className="w-4 h-4 mr-2" /> Unité de travail</Button>
        </div>
      </div>
      <p className="text-sm text-ink-500 mb-4">Évaluation des risques par unité de travail. Criticité = gravité × probabilité (1-16).</p>

      <div className="space-y-5">
        {units.map((u) => (
          <Card key={u.id}>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">{u.name}</CardTitle>
                {u.description && <p className="text-xs text-ink-500 mt-0.5">{u.description}</p>}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => openNewItem(u.id)}><Plus className="w-3.5 h-3.5 mr-1" />Risque</Button>
                <button onClick={() => delUnit(u.id)} className="text-ink-400 hover:text-red-500 px-1"><Trash2 className="w-4 h-4" /></button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="text-xs text-ink-500 border-y border-ink-900/10">
                  <tr><th className="text-left py-1.5 px-3">Danger</th><th className="py-1.5 px-2">Crit.</th><th className="text-left py-1.5 px-2">Mesures prévues</th><th className="py-1.5 px-2">Échéance</th><th className="py-1.5 px-2">Statut</th><th></th></tr>
                </thead>
                <tbody>
                  {u.items.map((it) => {
                    const crit = it.gravity * it.probability; const st = STATUS[it.status] ?? STATUS.a_traiter;
                    return (
                      <tr key={it.id} className="border-b border-ink-900/10">
                        <td className="py-1.5 px-3"><div className="font-medium text-ink-900">{it.danger}</div>{it.exposure && <div className="text-xs text-ink-400">{it.exposure}</div>}</td>
                        <td className="py-1.5 px-2 text-center"><span className="inline-block w-7 h-7 leading-7 rounded text-white text-xs font-bold" style={{ backgroundColor: critColor(crit) }}>{crit}</span></td>
                        <td className="py-1.5 px-2 text-ink-600 text-xs max-w-[260px]">{it.plannedMeasures || "—"}{it.responsible ? ` · ${it.responsible}` : ""}</td>
                        <td className="py-1.5 px-2 text-center text-xs text-ink-500">{fmt(it.dueDate)}</td>
                        <td className="py-1.5 px-2 text-center"><Badge variant="outline" style={{ color: st.color, borderColor: st.color + "55" }}>{st.label}</Badge></td>
                        <td className="py-1.5 px-2 text-right whitespace-nowrap">
                          <button onClick={() => openEditItem(u, it)} className="text-ink-400 hover:text-signal-600 px-1"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => delItem(it.id)} className="text-ink-400 hover:text-red-500 px-1"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    );
                  })}
                  {u.items.length === 0 && <tr><td colSpan={6} className="text-center py-4 text-ink-400 text-xs">Aucun risque évalué.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
        {units.length === 0 && <p className="text-ink-400 text-sm">{loading ? "Chargement…" : "Aucune unité de travail. Commencez par en créer une (ex. Montage scénique, Travail en hauteur, Régie)."}</p>}
      </div>

      <Dialog open={unitOpen} onOpenChange={setUnitOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Unité de travail</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Nom *</Label><Input value={unitForm.name} onChange={(e) => setUnitForm((f) => ({ ...f, name: e.target.value }))} placeholder="ex: Travail en hauteur" /></div>
            <div><Label>Description</Label><Input value={unitForm.description} onChange={(e) => setUnitForm((f) => ({ ...f, description: e.target.value }))} /></div>
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose><Button onClick={saveUnit} disabled={!unitForm.name.trim()}>Créer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={itemOpen} onOpenChange={setItemOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{item.id ? "Modifier le risque" : "Nouveau risque"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Danger *</Label><Input value={item.danger} onChange={(e) => setItem((i) => ({ ...i, danger: e.target.value }))} placeholder="ex: Chute de hauteur" /></div>
            <div><Label>Exposition</Label><Input value={item.exposure} onChange={(e) => setItem((i) => ({ ...i, exposure: e.target.value }))} placeholder="ex: Montage de structures > 2 m" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Gravité (1-4)</Label><Input type="number" min={1} max={4} value={item.gravity} onChange={(e) => setItem((i) => ({ ...i, gravity: Number(e.target.value) }))} /></div>
              <div><Label>Probabilité (1-4)</Label><Input type="number" min={1} max={4} value={item.probability} onChange={(e) => setItem((i) => ({ ...i, probability: Number(e.target.value) }))} /></div>
            </div>
            <div><Label>Mesures existantes</Label><Textarea rows={2} value={item.existingMeasures} onChange={(e) => setItem((i) => ({ ...i, existingMeasures: e.target.value }))} /></div>
            <div><Label>Mesures prévues (plan d&apos;action)</Label><Textarea rows={2} value={item.plannedMeasures} onChange={(e) => setItem((i) => ({ ...i, plannedMeasures: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Échéance</Label><Input type="date" value={item.dueDate} onChange={(e) => setItem((i) => ({ ...i, dueDate: e.target.value }))} /></div>
              <div><Label>Responsable</Label><Input value={item.responsible} onChange={(e) => setItem((i) => ({ ...i, responsible: e.target.value }))} /></div>
              <div><Label>Statut</Label>
                <select className="w-full px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm h-10" value={item.status} onChange={(e) => setItem((i) => ({ ...i, status: e.target.value }))}>
                  <option value="a_traiter">À traiter</option><option value="en_cours">En cours</option><option value="maitrise">Maîtrisé</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose><Button onClick={saveItem} disabled={!item.danger.trim()}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
