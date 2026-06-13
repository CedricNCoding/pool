"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { ShieldCheck, Plus, Loader2, Trash2, Check } from "lucide-react";
import PageHelp from "@/components/PageHelp";

interface Notice { id: string; title: string; content: string | null; publishedAt: string; total: number; acked: number }
interface Tech { id: string; firstName: string; lastName: string }
interface Detail { id: string; title: string; acks: { id: string; ackAt: string | null; technician: { firstName: string; lastName: string } }[] }
const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR");

export default function SecuritePage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [techs, setTechs] = useState<Tech[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/safety/notices").then((r) => r.json()).then((d) => setNotices(Array.isArray(d) ? d : [])).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); fetch("/api/technicians?isActive=true&limit=500").then((r) => r.json()).then((d) => setTechs(Array.isArray(d.data) ? d.data : [])).catch(() => {}); }, [load]);

  // create
  const [open, setOpen] = useState(false);
  const [nf, setNf] = useState({ title: "", content: "" });
  const [sel, setSel] = useState<Set<string>>(new Set());
  function toggleSel(id: string) { setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function openCreate() { setNf({ title: "", content: "" }); setSel(new Set()); setOpen(true); }
  async function save() {
    await fetch("/api/safety/notices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...nf, technicianIds: [...sel] }) });
    setOpen(false); load();
  }
  async function remove(id: string) { if (!confirm("Supprimer cette consigne ?")) return; await fetch(`/api/safety/notices/${id}`, { method: "DELETE" }); load(); }

  // detail (acks)
  const [detail, setDetail] = useState<Detail | null>(null);
  async function openDetail(id: string) { const r = await fetch(`/api/safety/notices/${id}`); if (r.ok) setDetail(await r.json()); }
  async function toggleAck(ackId: string, done: boolean) {
    if (!detail) return;
    await fetch(`/api/safety/notices/${detail.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ackId, ack: !done }) });
    await openDetail(detail.id); load();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><ShieldCheck className="w-6 h-6 text-ink-600" /><h1 className="text-2xl font-bold">Consignes de sécurité</h1></div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Nouvelle consigne</Button>
      </div>

      <PageHelp>
        Diffusez une consigne de sécurité à vos techniciens et suivez leurs <strong>accusés de lecture</strong>. Cliquez une ligne pour marquer qui a pris connaissance — une preuve documentée d&apos;information à la sécurité, utile en cas de contrôle ou d&apos;accident.
      </PageHelp>

      <Card><CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="text-xs text-ink-500 border-b border-ink-900/10"><tr><th className="text-left py-2 px-4">Consigne</th><th className="text-left py-2 px-3">Publiée</th><th className="text-left py-2 px-3">Accusés</th><th></th></tr></thead>
          <tbody>
            {notices.map((n) => (
              <tr key={n.id} className="border-b border-ink-900/10 hover:bg-paper-2 cursor-pointer" onClick={() => openDetail(n.id)}>
                <td className="py-2 px-4 font-medium text-ink-900">{n.title}</td>
                <td className="py-2 px-3 text-ink-600">{fmt(n.publishedAt)}</td>
                <td className="py-2 px-3 text-ink-600">{n.acked}/{n.total} lu(s)</td>
                <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}><button onClick={() => remove(n.id)} className="text-ink-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
            {notices.length === 0 && <tr><td colSpan={4} className="text-center py-10 text-ink-400">{loading ? "Chargement…" : "Aucune consigne."}</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>

      {/* Create */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle consigne</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Titre *</Label><Input value={nf.title} onChange={(e) => setNf((f) => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Contenu</Label><Textarea rows={3} value={nf.content} onChange={(e) => setNf((f) => ({ ...f, content: e.target.value }))} /></div>
            <div>
              <Label>Destinataires ({sel.size})</Label>
              <div className="max-h-48 overflow-y-auto border border-ink-900/10 rounded-lg p-2 mt-1 space-y-0.5">
                {techs.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-sm py-0.5 cursor-pointer">
                    <input type="checkbox" checked={sel.has(t.id)} onChange={() => toggleSel(t.id)} /> {t.firstName} {t.lastName}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={save} disabled={!nf.title.trim()}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail (acks) */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Accusés — {detail?.title}</DialogTitle></DialogHeader>
          <div className="py-2 max-h-80 overflow-y-auto divide-y divide-ink-900/5">
            {detail?.acks.map((row) => {
              const done = !!row.ackAt;
              return (
                <div key={row.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{row.technician.firstName} {row.technician.lastName}</span>
                  <button onClick={() => toggleAck(row.id, done)} className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${done ? "bg-green-500/15 border-green-500/40 text-green-700" : "border-ink-900/15 text-ink-400 hover:bg-paper-2"}`}>
                    <Check className="w-3.5 h-3.5" /> {done ? "Lu" : "Marquer lu"}
                  </button>
                </div>
              );
            })}
            {detail?.acks.length === 0 && <p className="text-sm text-ink-400 py-4 text-center">Aucun destinataire.</p>}
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Fermer</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
