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

interface Briefing { id: string; date: string; theme: string; animator: string | null; project: { title: string } | null; total: number; signed: number }
interface Notice { id: string; title: string; content: string | null; publishedAt: string; total: number; acked: number }
interface Tech { id: string; firstName: string; lastName: string }
const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR");

export default function SecuritePage() {
  const [tab, setTab] = useState<"causeries" | "consignes">("causeries");
  const [briefings, setBriefings] = useState<Briefing[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [techs, setTechs] = useState<Tech[]>([]);
  const load = useCallback(() => {
    fetch("/api/safety/briefings").then((r) => r.json()).then((d) => setBriefings(Array.isArray(d) ? d : [])).catch(() => {});
    fetch("/api/safety/notices").then((r) => r.json()).then((d) => setNotices(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);
  useEffect(() => { load(); fetch("/api/technicians?isActive=true&limit=500").then((r) => r.json()).then((d) => setTechs(Array.isArray(d.data) ? d.data : [])).catch(() => {}); }, [load]);

  // create briefing / notice
  const [open, setOpen] = useState<"" | "briefing" | "notice">("");
  const [bf, setBf] = useState({ date: "", theme: "", animator: "" });
  const [nf, setNf] = useState({ title: "", content: "" });
  const [sel, setSel] = useState<Set<string>>(new Set());
  function toggleSel(id: string) { setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function openCreate(kind: "briefing" | "notice") { setBf({ date: "", theme: "", animator: "" }); setNf({ title: "", content: "" }); setSel(new Set()); setOpen(kind); }
  async function saveBriefing() {
    await fetch("/api/safety/briefings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...bf, technicianIds: [...sel] }) });
    setOpen(""); load();
  }
  async function saveNotice() {
    await fetch("/api/safety/notices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...nf, technicianIds: [...sel] }) });
    setOpen(""); load();
  }

  // detail (émargement / acks)
  const [detail, setDetail] = useState<{ kind: "briefing" | "notice"; data: { id: string; title?: string; theme?: string; attendees?: { id: string; signedAt: string | null; technician: { firstName: string; lastName: string } }[]; acks?: { id: string; ackAt: string | null; technician: { firstName: string; lastName: string } }[] } } | null>(null);
  async function openDetail(kind: "briefing" | "notice", id: string) {
    const r = await fetch(`/api/safety/${kind === "briefing" ? "briefings" : "notices"}/${id}`);
    if (r.ok) setDetail({ kind, data: await r.json() });
  }
  async function toggleSign(rowId: string) {
    if (!detail) return;
    const isB = detail.kind === "briefing";
    const list = isB ? detail.data.attendees! : detail.data.acks!;
    const row = list.find((x) => x.id === rowId)!;
    const signed = !(isB ? (row as { signedAt: string | null }).signedAt : (row as { ackAt: string | null }).ackAt);
    await fetch(`/api/safety/${isB ? "briefings" : "notices"}/${detail.data.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isB ? { attendeeId: rowId, signed } : { ackId: rowId, ack: signed }),
    });
    await openDetail(detail.kind, detail.data.id);
    load();
  }
  async function remove(kind: "briefing" | "notice", id: string) {
    if (!confirm("Supprimer ?")) return;
    await fetch(`/api/safety/${kind === "briefing" ? "briefings" : "notices"}/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><ShieldCheck className="w-6 h-6 text-ink-600" /><h1 className="text-2xl font-bold">Sécurité</h1></div>
        <Button onClick={() => openCreate(tab === "causeries" ? "briefing" : "notice")}><Plus className="w-4 h-4 mr-2" /> {tab === "causeries" ? "Nouvelle causerie" : "Nouvelle consigne"}</Button>
      </div>

      <PageHelp>
        Preuve documentée de votre démarche sécurité. <strong>Causeries</strong> : créez une session (thème, date, participants) puis cliquez la ligne pour faire <strong>émarger</strong> les présents. <strong>Consignes</strong> : diffusez une note aux techniciens et suivez leurs <strong>accusés de lecture</strong>. Ces traces dégagent la responsabilité de l&apos;employeur en cas de contrôle ou d&apos;accident.
      </PageHelp>

      <div className="flex gap-1 mb-4 border-b border-ink-900/10">
        {([["causeries", "Causeries sécurité"], ["consignes", "Consignes & accusés"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-4 py-2 text-sm border-b-2 -mb-px transition ${tab === k ? "border-signal-500 text-ink-900" : "border-transparent text-ink-500 hover:text-ink-800"}`}>{l}</button>
        ))}
      </div>

      {tab === "causeries" && (
        <Card><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-ink-500 border-b border-ink-900/10"><tr><th className="text-left py-2 px-4">Date</th><th className="text-left py-2 px-3">Thème</th><th className="text-left py-2 px-3">Animateur</th><th className="text-left py-2 px-3">Émargement</th><th></th></tr></thead>
            <tbody>
              {briefings.map((b) => (
                <tr key={b.id} className="border-b border-ink-900/10 hover:bg-paper-2 cursor-pointer" onClick={() => openDetail("briefing", b.id)}>
                  <td className="py-2 px-4">{fmt(b.date)}</td>
                  <td className="py-2 px-3 font-medium text-ink-900">{b.theme}{b.project ? <span className="text-xs text-ink-400"> · {b.project.title}</span> : ""}</td>
                  <td className="py-2 px-3 text-ink-600">{b.animator || "—"}</td>
                  <td className="py-2 px-3 text-ink-600">{b.signed}/{b.total} signé(s)</td>
                  <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}><button onClick={() => remove("briefing", b.id)} className="text-ink-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
              {briefings.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-ink-400">Aucune causerie.</td></tr>}
            </tbody>
          </table>
        </CardContent></Card>
      )}

      {tab === "consignes" && (
        <Card><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-ink-500 border-b border-ink-900/10"><tr><th className="text-left py-2 px-4">Consigne</th><th className="text-left py-2 px-3">Publiée</th><th className="text-left py-2 px-3">Accusés</th><th></th></tr></thead>
            <tbody>
              {notices.map((n) => (
                <tr key={n.id} className="border-b border-ink-900/10 hover:bg-paper-2 cursor-pointer" onClick={() => openDetail("notice", n.id)}>
                  <td className="py-2 px-4 font-medium text-ink-900">{n.title}</td>
                  <td className="py-2 px-3 text-ink-600">{fmt(n.publishedAt)}</td>
                  <td className="py-2 px-3 text-ink-600">{n.acked}/{n.total} lu(s)</td>
                  <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}><button onClick={() => remove("notice", n.id)} className="text-ink-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
              {notices.length === 0 && <tr><td colSpan={4} className="text-center py-10 text-ink-400">Aucune consigne.</td></tr>}
            </tbody>
          </table>
        </CardContent></Card>
      )}

      {/* Create dialog */}
      <Dialog open={open !== ""} onOpenChange={(o) => !o && setOpen("")}>
        <DialogContent>
          <DialogHeader><DialogTitle>{open === "briefing" ? "Nouvelle causerie sécurité" : "Nouvelle consigne"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {open === "briefing" ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Date</Label><Input type="date" value={bf.date} onChange={(e) => setBf((f) => ({ ...f, date: e.target.value }))} /></div>
                  <div><Label>Animateur</Label><Input value={bf.animator} onChange={(e) => setBf((f) => ({ ...f, animator: e.target.value }))} /></div>
                </div>
                <div><Label>Thème *</Label><Input value={bf.theme} onChange={(e) => setBf((f) => ({ ...f, theme: e.target.value }))} placeholder="ex: Travail en hauteur" /></div>
              </>
            ) : (
              <>
                <div><Label>Titre *</Label><Input value={nf.title} onChange={(e) => setNf((f) => ({ ...f, title: e.target.value }))} /></div>
                <div><Label>Contenu</Label><Textarea rows={3} value={nf.content} onChange={(e) => setNf((f) => ({ ...f, content: e.target.value }))} /></div>
              </>
            )}
            <div>
              <Label>{open === "briefing" ? "Participants" : "Destinataires"} ({sel.size})</Label>
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
            <Button onClick={open === "briefing" ? saveBriefing : saveNotice} disabled={open === "briefing" ? !bf.theme.trim() || !bf.date : !nf.title.trim()}>Créer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail (émargement / acks) */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{detail?.kind === "briefing" ? `Émargement — ${detail?.data.theme}` : `Accusés — ${detail?.data.title}`}</DialogTitle></DialogHeader>
          <div className="py-2 max-h-80 overflow-y-auto divide-y divide-ink-900/5">
            {(detail?.kind === "briefing" ? detail?.data.attendees : detail?.data.acks)?.map((row) => {
              const done = detail?.kind === "briefing" ? !!(row as { signedAt: string | null }).signedAt : !!(row as { ackAt: string | null }).ackAt;
              return (
                <div key={row.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{row.technician.firstName} {row.technician.lastName}</span>
                  <button onClick={() => toggleSign(row.id)} className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${done ? "bg-green-500/15 border-green-500/40 text-green-700" : "border-ink-900/15 text-ink-400 hover:bg-paper-2"}`}>
                    <Check className="w-3.5 h-3.5" /> {done ? (detail?.kind === "briefing" ? "Signé" : "Lu") : (detail?.kind === "briefing" ? "Émarger" : "Marquer lu")}
                  </button>
                </div>
              );
            })}
            {(detail?.kind === "briefing" ? detail?.data.attendees : detail?.data.acks)?.length === 0 && <p className="text-sm text-ink-400 py-4 text-center">Aucun destinataire.</p>}
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Fermer</Button></DialogClose></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
