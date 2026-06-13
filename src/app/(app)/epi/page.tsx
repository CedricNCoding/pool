"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { HardHat, Plus, Loader2, Trash2, FileDown, UserCheck, ShieldCheck, Search } from "lucide-react";

interface Equip {
  id: string; category: string; name: string; brand: string | null; model: string | null; serialNumber: string | null;
  size: string | null; purchaseDate: string | null; expiryDate: string | null; nextCheckDate: string | null; status: string; notes: string | null;
  currentAssignment: { technician: { id: string; firstName: string; lastName: string } } | null;
}
interface Tech { id: string; firstName: string; lastName: string }

const CATEGORIES = [["epi", "EPI"], ["electroportatif", "Électroportatif"], ["instrument", "Instrument"], ["vehicule", "Véhicule"], ["autre", "Autre"]] as const;
const CAT_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map(([v, l]) => [v, l]));
const STATUS: Record<string, { label: string; color: string }> = {
  disponible: { label: "Disponible", color: "#10B981" }, attribue: { label: "Attribué", color: "#3B82F6" },
  maintenance: { label: "Maintenance", color: "#E89B2C" }, reforme: { label: "Réformé", color: "#94A3B8" },
};
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");
function dateClass(d: string | null) {
  if (!d) return "text-ink-400";
  const t = new Date(d).getTime(), now = Date.now();
  if (t < now) return "text-red-600 font-medium";
  if (t < now + 60 * 86400000) return "text-amber-600";
  return "text-ink-600";
}

export default function EpiPage() {
  const [items, setItems] = useState<Equip[]>([]);
  const [techs, setTechs] = useState<Tech[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (cat) p.set("category", cat);
    if (q) p.set("q", q);
    fetch(`/api/equipment?${p}`).then((r) => r.json()).then((d) => setItems(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, [cat, q]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { fetch("/api/technicians?isActive=true&limit=500").then((r) => r.json()).then((d) => setTechs(Array.isArray(d.data) ? d.data : [])).catch(() => {}); }, []);

  // add
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const empty = { category: "epi", name: "", brand: "", model: "", serialNumber: "", size: "", purchaseDate: "", expiryDate: "", nextCheckDate: "", notes: "" };
  const [form, setForm] = useState(empty);
  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/equipment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    if (res.ok) { setOpen(false); setForm(empty); load(); }
  }
  async function remove(id: string) { if (!confirm("Supprimer cet équipement ?")) return; await fetch(`/api/equipment/${id}`, { method: "DELETE" }); load(); }

  // dotation
  const [dotEquip, setDotEquip] = useState<Equip | null>(null);
  const [dotTech, setDotTech] = useState("");
  async function assign() {
    if (!dotEquip) return;
    await fetch(`/api/equipment/${dotEquip.id}/assign`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ technicianId: dotTech }) });
    setDotEquip(null); setDotTech(""); load();
  }
  async function returnEquip(id: string) { await fetch(`/api/equipment/${id}/assign`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ return: true }) }); load(); }

  // VGP
  const [vgpEquip, setVgpEquip] = useState<Equip | null>(null);
  const [vgp, setVgp] = useState({ date: "", result: "conforme", note: "", nextCheckDate: "" });
  async function saveVgp() {
    if (!vgpEquip) return;
    await fetch(`/api/equipment/${vgpEquip.id}/check`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(vgp) });
    setVgpEquip(null); setVgp({ date: "", result: "conforme", note: "", nextCheckDate: "" }); load();
  }

  async function exportPdf() {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
    doc.setFontSize(15); doc.text("Fiche d'inventaire — EPI & matériel", 14, 16);
    doc.setFontSize(9); doc.text(`Édité le ${new Date().toLocaleDateString("fr-FR")} · ${items.length} équipement(s)`, 14, 22);
    autoTable(doc, {
      startY: 27,
      head: [["Catégorie", "Désignation", "Marque/Modèle", "N° série", "Statut", "Attribué à", "Péremption", "Proch. VGP"]],
      body: items.map((e) => [CAT_LABEL[e.category] ?? e.category, e.name, [e.brand, e.model].filter(Boolean).join(" "), e.serialNumber || "-", STATUS[e.status]?.label ?? e.status, e.currentAssignment ? `${e.currentAssignment.technician.firstName} ${e.currentAssignment.technician.lastName}` : "-", fmt(e.expiryDate), fmt(e.nextCheckDate)]),
      headStyles: { fillColor: [11, 18, 32], fontSize: 8 }, bodyStyles: { fontSize: 8 }, margin: { left: 14, right: 14 },
    });
    doc.save("inventaire_epi.pdf");
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3"><HardHat className="w-6 h-6 text-ink-600" /><h1 className="text-2xl font-bold">EPI & matériel</h1></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportPdf}><FileDown className="w-4 h-4 mr-2" /> Fiche d&apos;inventaire</Button>
          <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" /> Nouvel équipement</Button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <Input className="pl-8 w-64" placeholder="Nom, n° série, marque…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Toutes catégories</option>
          {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-ink-400 self-center" />}
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-ink-500 border-b border-ink-900/10">
              <tr><th className="text-left py-2 px-4">Désignation</th><th className="text-left py-2 px-3">N° série</th><th className="text-left py-2 px-3">Statut</th><th className="text-left py-2 px-3">Attribué à</th><th className="text-left py-2 px-3">Péremption</th><th className="text-left py-2 px-3">Proch. VGP</th><th className="text-right py-2 px-4">Actions</th></tr>
            </thead>
            <tbody>
              {items.map((e) => {
                const st = STATUS[e.status] ?? STATUS.disponible;
                return (
                  <tr key={e.id} className="border-b border-ink-900/10">
                    <td className="py-2 px-4">
                      <div className="font-medium text-ink-900">{e.name}</div>
                      <div className="text-xs text-ink-400">{CAT_LABEL[e.category] ?? e.category}{(e.brand || e.model) ? ` · ${[e.brand, e.model].filter(Boolean).join(" ")}` : ""}{e.size ? ` · T.${e.size}` : ""}</div>
                    </td>
                    <td className="py-2 px-3 font-mono text-xs">{e.serialNumber || "—"}</td>
                    <td className="py-2 px-3"><Badge variant="outline" style={{ color: st.color, borderColor: st.color + "55" }}>{st.label}</Badge></td>
                    <td className="py-2 px-3 text-ink-600">{e.currentAssignment ? <Link href={`/technicians/${e.currentAssignment.technician.id}`} className="hover:underline">{e.currentAssignment.technician.firstName} {e.currentAssignment.technician.lastName}</Link> : "—"}</td>
                    <td className={`py-2 px-3 ${dateClass(e.expiryDate)}`}>{fmt(e.expiryDate)}</td>
                    <td className={`py-2 px-3 ${dateClass(e.nextCheckDate)}`}>{fmt(e.nextCheckDate)}</td>
                    <td className="py-2 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {e.currentAssignment ? (
                          <Button size="sm" variant="outline" onClick={() => returnEquip(e.id)}>Restituer</Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => { setDotEquip(e); setDotTech(""); }}><UserCheck className="w-3.5 h-3.5 mr-1" />Doter</Button>
                        )}
                        <Button size="sm" variant="ghost" title="VGP / vérification" onClick={() => { setVgpEquip(e); setVgp({ date: "", result: "conforme", note: "", nextCheckDate: "" }); }}><ShieldCheck className="w-4 h-4" /></Button>
                        <button onClick={() => remove(e.id)} className="text-ink-400 hover:text-red-500 ml-1"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-ink-400">{loading ? "Chargement…" : "Aucun équipement."}</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Add */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvel équipement</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Désignation *</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="ex: Perceuse, harnais…" /></div>
              <div><Label>Catégorie</Label>
                <select className="w-full px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm h-10" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Marque</Label><Input value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} /></div>
              <div><Label>Modèle</Label><Input value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} /></div>
              <div><Label>N° de série</Label><Input value={form.serialNumber} onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Achat</Label><Input type="date" value={form.purchaseDate} onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))} /></div>
              <div><Label>Péremption</Label><Input type="date" value={form.expiryDate} onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))} /></div>
              <div><Label>Prochaine VGP</Label><Input type="date" value={form.nextCheckDate} onChange={(e) => setForm((f) => ({ ...f, nextCheckDate: e.target.value }))} /></div>
            </div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose><Button onClick={save} disabled={saving || !form.name.trim()}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dotation */}
      <Dialog open={!!dotEquip} onOpenChange={(o) => !o && setDotEquip(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Doter — {dotEquip?.name}</DialogTitle></DialogHeader>
          <div className="py-2">
            <Label>Attribuer à</Label>
            <select className="w-full px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm" value={dotTech} onChange={(e) => setDotTech(e.target.value)}>
              <option value="">— Choisir —</option>
              {techs.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
            </select>
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose><Button onClick={assign} disabled={!dotTech}>Doter</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VGP */}
      <Dialog open={!!vgpEquip} onOpenChange={(o) => !o && setVgpEquip(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Vérification (VGP) — {vgpEquip?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Date</Label><Input type="date" value={vgp.date} onChange={(e) => setVgp((v) => ({ ...v, date: e.target.value }))} /></div>
              <div><Label>Résultat</Label>
                <select className="w-full px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm h-10" value={vgp.result} onChange={(e) => setVgp((v) => ({ ...v, result: e.target.value }))}>
                  <option value="conforme">Conforme</option><option value="a_surveiller">À surveiller</option><option value="non_conforme">Non conforme</option>
                </select>
              </div>
            </div>
            <div><Label>Prochaine VGP</Label><Input type="date" value={vgp.nextCheckDate} onChange={(e) => setVgp((v) => ({ ...v, nextCheckDate: e.target.value }))} /></div>
            <div><Label>Note</Label><Input value={vgp.note} onChange={(e) => setVgp((v) => ({ ...v, note: e.target.value }))} /></div>
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose><Button onClick={saveVgp}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
