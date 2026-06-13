"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Users, Calendar, MapPin, GraduationCap, Target, Clock, Euro,
  FileText, Plus, Trash2, Download, CheckCircle, Loader2, Pencil, History, Search, UserPlus,
} from "lucide-react";
import { SKILL_LEVELS } from "@/lib/constants";

const SESSION_STATUS: Record<string, { label: string; color: string }> = {
  planifiee: { label: "Planifiée", color: "#F59E0B" },
  en_cours: { label: "En cours", color: "#3B82F6" },
  terminee: { label: "Terminée", color: "#10B981" },
  annulee: { label: "Annulée", color: "#64748B" },
};
const PART_STATUS: Record<string, { label: string; color: string }> = {
  propose: { label: "Proposé", color: "#F59E0B" },
  en_cours: { label: "En cours", color: "#3B82F6" },
  valide: { label: "Validé", color: "#10B981" },
  annule: { label: "Annulé", color: "#64748B" },
};
const FUNDING_SOURCES = [
  { value: "opco", label: "OPCO" },
  { value: "cpf", label: "CPF" },
  { value: "interne", label: "Interne (employeur)" },
  { value: "client", label: "Client / refacturé" },
  { value: "autre", label: "Autre" },
];
const fundingLabel = (v: string | null) => FUNDING_SOURCES.find((f) => f.value === v)?.label ?? "—";
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : null);

interface Participant {
  id: string;
  status: string;
  cost: number | null;
  fundingSource: string | null;
  fundingRef: string | null;
  technician: { id: string; firstName: string; lastName: string; service: string; company: { id: string; name: string; color: string } | null };
}
interface SessionDoc { id: string; title: string; category: string; originalName: string; createdAt: string }
interface SessionEvent { id: string; kind: string; label: string; actorName: string | null; createdAt: string }
interface Fiche {
  id: string;
  title: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  trainer: string | null;
  notes: string | null;
  module: { id: string; title: string; description: string | null; durationHours: number | null; targetSkills: { id: string; name: string }[] } | null;
  path: { id: string; title: string } | null;
  participants: Participant[];
  documents: SessionDoc[];
  history: SessionEvent[];
  totalCost: number;
}

export default function SessionFichePage() {
  const { id } = useParams<{ id: string }>();
  const [f, setF] = useState<Fiche | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/training/sessions/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setF(d))
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  async function patchSession(body: Record<string, unknown>) {
    await fetch(`/api/training/sessions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    load();
  }

  // ---- Edition de l'entête ----
  const [editOpen, setEditOpen] = useState(false);
  const [meta, setMeta] = useState({ title: "", startDate: "", endDate: "", location: "", trainer: "", notes: "" });
  function openEdit() {
    if (!f) return;
    setMeta({
      title: f.title,
      startDate: f.startDate ? f.startDate.slice(0, 10) : "",
      endDate: f.endDate ? f.endDate.slice(0, 10) : "",
      location: f.location ?? "",
      trainer: f.trainer ?? "",
      notes: f.notes ?? "",
    });
    setEditOpen(true);
  }
  async function saveMeta() {
    await patchSession({
      title: meta.title,
      startDate: meta.startDate || null,
      endDate: meta.endDate || null,
      location: meta.location,
      trainer: meta.trainer,
      notes: meta.notes,
    });
    setEditOpen(false);
  }

  // ---- Participants : statut / financement ----
  async function patchParticipant(assignmentId: string, body: Record<string, unknown>) {
    await fetch(`/api/training/assignments/${assignmentId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    load();
  }
  async function removeParticipant(assignmentId: string) {
    if (!confirm("Retirer ce participant de la session ?")) return;
    await fetch(`/api/training/sessions/${id}/participants`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ assignmentId }) });
    load();
  }

  // financement (coût + source + réf) par participant
  const [fundP, setFundP] = useState<Participant | null>(null);
  const [fundForm, setFundForm] = useState({ cost: "", fundingSource: "", fundingRef: "" });
  function openFund(p: Participant) {
    setFundP(p);
    setFundForm({ cost: p.cost != null ? String(p.cost) : "", fundingSource: p.fundingSource ?? "", fundingRef: p.fundingRef ?? "" });
  }
  async function saveFund() {
    if (!fundP) return;
    await patchParticipant(fundP.id, { cost: fundForm.cost, fundingSource: fundForm.fundingSource, fundingRef: fundForm.fundingRef });
    setFundP(null);
  }

  // validation (fixe les niveaux des compétences du programme)
  const [valP, setValP] = useState<Participant | null>(null);
  const [valLevels, setValLevels] = useState<Record<string, number>>({});
  function openValidate(p: Participant) {
    setValP(p);
    const init: Record<string, number> = {};
    (f?.module?.targetSkills ?? []).forEach((s) => (init[s.id] = 3));
    setValLevels(init);
  }
  async function confirmValidate() {
    if (!valP) return;
    await patchParticipant(valP.id, { status: "valide", levels: Object.entries(valLevels).map(([skillId, level]) => ({ skillId, level })) });
    setValP(null);
  }

  // ---- Ajout de participants ----
  const [addOpen, setAddOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; firstName: string; lastName: string; company: { name: string; color: string } }[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [addingP, setAddingP] = useState(false);
  const existingIds = new Set((f?.participants ?? []).map((p) => p.technician.id));
  async function search() {
    setSearching(true);
    const p = new URLSearchParams({ isActive: "true", limit: "50" });
    if (q) p.set("search", q);
    try {
      const r = await fetch(`/api/technicians?${p.toString()}`);
      const d = await r.json();
      setResults(Array.isArray(d.data) ? d.data : []);
    } catch { setResults([]); } finally { setSearching(false); }
  }
  function toggleSel(tid: string) {
    setSel((prev) => { const n = new Set(prev); if (n.has(tid)) n.delete(tid); else n.add(tid); return n; });
  }
  async function addParticipants() {
    if (sel.size === 0) return;
    setAddingP(true);
    await fetch(`/api/training/sessions/${id}/participants`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ technicianIds: Array.from(sel) }),
    });
    setAddingP(false);
    setAddOpen(false);
    setSel(new Set());
    setResults([]);
    setQ("");
    load();
  }

  // ---- Documents ----
  const [docTitle, setDocTitle] = useState("");
  const [docCategory, setDocCategory] = useState("autre");
  const [uploading, setUploading] = useState(false);
  async function uploadDoc(file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", docTitle || file.name);
    fd.append("category", docCategory);
    await fetch(`/api/training/sessions/${id}/documents`, { method: "POST", body: fd });
    setUploading(false);
    setDocTitle("");
    load();
  }
  async function deleteDoc(docId: string) {
    if (!confirm("Supprimer ce document ?")) return;
    await fetch(`/api/training/sessions/${id}/documents/${docId}`, { method: "DELETE" });
    load();
  }

  if (loading) {
    return <div className="p-8 flex items-center gap-2 text-ink-400"><Loader2 className="w-5 h-5 animate-spin" /> Chargement…</div>;
  }
  if (!f) {
    return (
      <div className="p-8">
        <Link href="/formation" className="text-sm text-ink-500 hover:text-ink-900 flex items-center gap-1"><ArrowLeft className="w-4 h-4" /> Formation</Link>
        <p className="mt-6 text-ink-500">Session introuvable ou accès refusé.</p>
      </div>
    );
  }

  const st = SESSION_STATUS[f.status] ?? SESSION_STATUS.planifiee;
  // Récap financement par source.
  const bySource = new Map<string, number>();
  for (const p of f.participants) {
    if (p.cost) bySource.set(p.fundingSource ?? "autre", (bySource.get(p.fundingSource ?? "autre") ?? 0) + p.cost);
  }
  const funded = f.participants.filter((p) => p.cost != null).length;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <Link href="/formation" className="text-sm text-ink-500 hover:text-ink-900 flex items-center gap-1 w-fit"><ArrowLeft className="w-4 h-4" /> Formation</Link>

      {/* Entête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold flex items-center gap-2"><GraduationCap className="w-6 h-6 text-ink-600" />{f.title}</h1>
            <Badge variant="outline" style={{ color: st.color, borderColor: st.color + "55" }}>{st.label}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-ink-500">
            {(fmt(f.startDate) || fmt(f.endDate)) && (
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{fmt(f.startDate) || "?"}{f.endDate && fmt(f.endDate) !== fmt(f.startDate) ? ` → ${fmt(f.endDate)}` : ""}</span>
            )}
            {f.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{f.location}</span>}
            {f.trainer && <span className="flex items-center gap-1"><Users className="w-4 h-4" />{f.trainer}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm"
            value={f.status}
            onChange={(e) => patchSession({ status: e.target.value })}
          >
            {Object.entries(SESSION_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
          </select>
          <Button variant="outline" onClick={openEdit}><Pencil className="w-4 h-4 mr-1.5" /> Modifier</Button>
        </div>
      </div>

      {f.notes && <p className="text-sm text-ink-600 bg-paper-2 rounded-lg p-3 -mt-2">{f.notes}</p>}

      {/* Contenu */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4 text-signal-500" /> Contenu</CardTitle></CardHeader>
        <CardContent className="text-sm">
          {f.module ? (
            <>
              <p className="font-medium text-ink-900">{f.module.title}</p>
              {f.module.description && <p className="text-ink-500 mt-1">{f.module.description}</p>}
              <div className="flex items-center gap-3 mt-2 text-xs text-ink-500">
                {f.module.durationHours != null && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{f.module.durationHours} h</span>}
              </div>
              {f.module.targetSkills.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {f.module.targetSkills.map((s) => <Badge key={s.id} variant="secondary" className="text-[11px]">{s.name}</Badge>)}
                </div>
              )}
            </>
          ) : f.path ? (
            <p className="font-medium text-ink-900">{f.path.title} <span className="text-ink-400">(parcours)</span></p>
          ) : (
            <p className="text-ink-400">Contenu libre.</p>
          )}
        </CardContent>
      </Card>

      {/* Participants */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-signal-500" /> Participants <span className="text-ink-400 font-normal">({f.participants.length})</span></CardTitle>
          <Button size="sm" onClick={() => setAddOpen(true)}><UserPlus className="w-4 h-4 mr-1.5" /> Ajouter</Button>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-ink-500 border-y border-ink-900/10">
              <tr>
                <th className="text-left py-2 px-4">Technicien</th>
                <th className="text-left py-2 px-4">Statut</th>
                <th className="text-left py-2 px-4">Financement</th>
                <th className="text-right py-2 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {f.participants.map((p) => {
                const ps = PART_STATUS[p.status] ?? PART_STATUS.propose;
                return (
                  <tr key={p.id} className="border-b border-ink-900/10">
                    <td className="py-2 px-4">
                      <Link href={`/technicians/${p.technician.id}`} className="font-medium text-ink-900 hover:underline">
                        {p.technician.firstName} {p.technician.lastName}
                      </Link>
                      {p.technician.company && (
                        <div className="flex items-center gap-1.5 text-xs text-ink-500">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.technician.company.color }} />
                          {p.technician.company.name}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-4">
                      <Badge variant="outline" style={{ color: ps.color, borderColor: ps.color + "55" }}>{ps.label}</Badge>
                    </td>
                    <td className="py-2 px-4">
                      <button onClick={() => openFund(p)} className="text-left hover:text-ink-900 text-ink-600">
                        {p.cost != null ? (
                          <span>{p.cost.toLocaleString("fr-FR")} € · {fundingLabel(p.fundingSource)}{p.fundingRef ? ` · ${p.fundingRef}` : ""}</span>
                        ) : (
                          <span className="text-ink-400">+ financement</span>
                        )}
                      </button>
                    </td>
                    <td className="py-2 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {p.status === "propose" && <Button size="sm" variant="outline" onClick={() => patchParticipant(p.id, { status: "en_cours" })}>Démarrer</Button>}
                        {p.status !== "valide" && p.status !== "annule" && f.module && (
                          <Button size="sm" onClick={() => openValidate(p)}><CheckCircle className="w-3.5 h-3.5 mr-1" /> Valider</Button>
                        )}
                        {p.status === "annule" && <Button size="sm" variant="outline" onClick={() => patchParticipant(p.id, { status: "propose" })}>Réactiver</Button>}
                        {p.status !== "valide" && p.status !== "annule" && (
                          <Button size="sm" variant="ghost" className="text-ink-400" onClick={() => patchParticipant(p.id, { status: "annule" })}>Annuler</Button>
                        )}
                        <button onClick={() => removeParticipant(p.id)} className="text-ink-400 hover:text-red-500 ml-1" title="Retirer"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {f.participants.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-ink-400">Aucun participant. Cliquez « Ajouter ».</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financement */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Euro className="w-4 h-4 text-signal-500" /> Financement</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-ink-500">Coût total</span>
              <span className="font-semibold text-ink-900">{f.totalCost.toLocaleString("fr-FR")} €</span>
            </div>
            <div className="flex items-center justify-between text-xs text-ink-500">
              <span>{funded}/{f.participants.length} participant(s) financé(s)</span>
            </div>
            {bySource.size > 0 && (
              <div className="pt-2 border-t border-ink-900/10 space-y-1">
                {Array.from(bySource.entries()).map(([src, amt]) => (
                  <div key={src} className="flex items-center justify-between">
                    <span className="text-ink-600">{fundingLabel(src)}</span>
                    <span className="text-ink-900">{amt.toLocaleString("fr-FR")} €</span>
                  </div>
                ))}
              </div>
            )}
            {f.totalCost === 0 && <p className="text-ink-400 text-xs">Renseignez le financement par participant (colonne « Financement »).</p>}
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-signal-500" /> Documents</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="text-xs">Intitulé</Label>
                <Input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} placeholder="Convention, devis, convocation…" className="h-9" />
              </div>
              <select className="h-9 px-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm" value={docCategory} onChange={(e) => setDocCategory(e.target.value)}>
                <option value="convention">Convention</option>
                <option value="devis">Devis</option>
                <option value="convocation">Convocation</option>
                <option value="attestation">Attestation</option>
                <option value="programme">Programme</option>
                <option value="autre">Autre</option>
              </select>
              <label className="inline-flex">
                <input type="file" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadDoc(file); e.currentTarget.value = ""; }} accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" />
                <span className={`inline-flex items-center h-9 px-3 rounded-md text-sm cursor-pointer ${uploading ? "bg-ink-200 text-ink-500" : "bg-signal-500 text-[#0B1220] hover:opacity-90"}`}>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </span>
              </label>
            </div>
            <div className="divide-y divide-ink-900/5">
              {f.documents.map((d) => (
                <div key={d.id} className="flex items-center gap-2 py-2">
                  <FileText className="w-4 h-4 text-ink-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-900 truncate">{d.title}</p>
                    <p className="text-[11px] text-ink-400">{d.category} · {fmt(d.createdAt)}</p>
                  </div>
                  <a href={`/api/training/sessions/${id}/documents/${d.id}?download=1`} className="text-ink-400 hover:text-signal-600" title="Télécharger"><Download className="w-4 h-4" /></a>
                  <button onClick={() => deleteDoc(d.id)} className="text-ink-400 hover:text-red-500" title="Supprimer"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              {f.documents.length === 0 && <p className="text-sm text-ink-400 py-3">Aucun document.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historique */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><History className="w-4 h-4 text-signal-500" /> Historique</CardTitle></CardHeader>
        <CardContent>
          {f.history.length === 0 ? (
            <p className="text-sm text-ink-400">Aucun évènement.</p>
          ) : (
            <ol className="relative border-l border-ink-900/15 ml-2 space-y-3">
              {f.history.map((e) => (
                <li key={e.id} className="ml-4">
                  <span className="absolute -left-[5px] mt-1.5 w-2.5 h-2.5 rounded-full bg-signal-500" />
                  <p className="text-sm text-ink-900">{e.label}</p>
                  <p className="text-xs text-ink-400">{new Date(e.createdAt).toLocaleString("fr-FR")}{e.actorName ? ` · ${e.actorName}` : ""}</p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* ===== Dialog : édition entête ===== */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier la session</DialogTitle></DialogHeader>
          <div className="space-y-4 py-3">
            <div>
              <Label>Intitulé *</Label>
              <Input value={meta.title} onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Début</Label><Input type="date" value={meta.startDate} onChange={(e) => setMeta((m) => ({ ...m, startDate: e.target.value }))} /></div>
              <div><Label>Fin</Label><Input type="date" value={meta.endDate} onChange={(e) => setMeta((m) => ({ ...m, endDate: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Lieu</Label><Input value={meta.location} onChange={(e) => setMeta((m) => ({ ...m, location: e.target.value }))} /></div>
              <div><Label>Formateur / organisme</Label><Input value={meta.trainer} onChange={(e) => setMeta((m) => ({ ...m, trainer: e.target.value }))} /></div>
            </div>
            <div><Label>Notes</Label><Textarea rows={2} value={meta.notes} onChange={(e) => setMeta((m) => ({ ...m, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={saveMeta} disabled={!meta.title.trim()}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog : ajout de participants ===== */}
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) { setSel(new Set()); setResults([]); setQ(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajouter des participants</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <Input className="pl-8" placeholder="Nom ou email…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
              </div>
              <Button variant="outline" onClick={search} disabled={searching}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Rechercher"}
              </Button>
            </div>
            <div className="max-h-72 overflow-y-auto border border-ink-900/10 rounded-lg divide-y divide-ink-900/5">
              {results.length === 0 ? (
                <p className="text-sm text-ink-400 p-4 text-center">{searching ? "Recherche…" : "Lancez une recherche."}</p>
              ) : (
                results.map((t) => {
                  const already = existingIds.has(t.id);
                  const checked = sel.has(t.id);
                  return (
                    <button key={t.id} disabled={already} onClick={() => toggleSel(t.id)} className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm ${already ? "opacity-40 cursor-not-allowed" : checked ? "bg-signal-500/10" : "hover:bg-paper-2"}`}>
                      <span className={`w-4 h-4 rounded border flex items-center justify-center ${checked ? "bg-signal-500 border-signal-500" : "border-ink-900/25"}`}>
                        {checked && <CheckCircle className="w-3 h-3 text-[#0B1220]" />}
                      </span>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.company.color }} />
                      <span className="font-medium text-ink-900">{t.firstName} {t.lastName}</span>
                      <span className="text-xs text-ink-400 ml-auto">{already ? "déjà inscrit" : t.company.name}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
          <DialogFooter>
            <span className="text-sm text-ink-500 mr-auto self-center">{sel.size} sélectionné(s)</span>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={addParticipants} disabled={addingP || sel.size === 0}>
              {addingP && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog : financement participant ===== */}
      <Dialog open={!!fundP} onOpenChange={(o) => !o && setFundP(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Financement — {fundP?.technician.firstName} {fundP?.technician.lastName}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Coût (€)</Label><Input type="number" min={0} value={fundForm.cost} onChange={(e) => setFundForm((f2) => ({ ...f2, cost: e.target.value }))} /></div>
              <div>
                <Label>Financeur</Label>
                <select className="w-full px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm" value={fundForm.fundingSource} onChange={(e) => setFundForm((f2) => ({ ...f2, fundingSource: e.target.value }))}>
                  <option value="">—</option>
                  {FUNDING_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div><Label>N° dossier / convention</Label><Input value={fundForm.fundingRef} onChange={(e) => setFundForm((f2) => ({ ...f2, fundingRef: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={saveFund}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog : validation participant ===== */}
      <Dialog open={!!valP} onOpenChange={(o) => !o && setValP(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Valider la formation</DialogTitle></DialogHeader>
          <div className="py-3 space-y-4">
            <p className="text-sm text-ink-500">
              Fixez le niveau atteint par <strong className="text-ink-800">{valP?.technician.firstName} {valP?.technician.lastName}</strong> sur les compétences du programme. Met à jour ses compétences et son historique.
            </p>
            {(f.module?.targetSkills ?? []).map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3">
                <span className="text-sm text-ink-800">{s.name}</span>
                <select className="px-2 py-1 rounded border border-ink-900/15 bg-white text-ink-900 text-sm" value={valLevels[s.id] ?? 3} onChange={(e) => setValLevels((v) => ({ ...v, [s.id]: parseInt(e.target.value) }))}>
                  <option value={0}>Aucune</option>
                  {SKILL_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            ))}
            {(f.module?.targetSkills ?? []).length === 0 && <p className="text-sm text-ink-400">Ce programme ne cible aucune compétence — la validation marque juste la formation comme acquise.</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={confirmValidate}><CheckCircle className="w-4 h-4 mr-1" /> Valider</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
