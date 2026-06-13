"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  GraduationCap,
  Plus,
  Pencil,
  Trash2,
  Clock,
  Target,
  UserCheck,
  Route,
  Loader2,
  Calendar,
  MapPin,
  Users,
  Euro,
} from "lucide-react";
import { useSession } from "@/lib/hooks";

interface Skill { id: string; name: string; category: { name: string; color: string } }
interface SkillCategory { id: string; name: string; color: string; skills: { id: string; name: string }[] }
interface TModule {
  id: string;
  title: string;
  description: string | null;
  durationHours: number | null;
  cost?: number | null;
  targetSkills: Skill[];
  _count: { assignments: number };
}
interface TPath {
  id: string;
  title: string;
  description: string | null;
  modules: { module: { id: string; title: string; durationHours: number | null } }[];
  _count: { assignments: number };
}
interface SessionListItem {
  id: string;
  title: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  trainer: string | null;
  module: { title: string } | null;
  path: { title: string } | null;
  participantCount: number;
  totalCost: number;
}

const SESSION_STATUS: Record<string, { label: string; color: string }> = {
  planifiee: { label: "Planifiée", color: "#F59E0B" },
  en_cours: { label: "En cours", color: "#3B82F6" },
  terminee: { label: "Terminée", color: "#10B981" },
  annulee: { label: "Annulée", color: "#64748B" },
};

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString("fr-FR") : null;
}

export default function FormationPage() {
  const { user } = useSession();
  const router = useRouter();
  const isAdmin = user?.role === "admin";
  const [tab, setTab] = useState<"catalogue" | "paths" | "sessions">("sessions");

  const [modules, setModules] = useState<TModule[]>([]);
  const [paths, setPaths] = useState<TPath[]>([]);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [categories, setCategories] = useState<SkillCategory[]>([]);

  const fetchAll = useCallback(() => {
    fetch("/api/training/modules").then((r) => r.json()).then(setModules).catch(() => {});
    fetch("/api/training/paths").then((r) => r.json()).then(setPaths).catch(() => {});
    fetch("/api/training/sessions").then((r) => r.json()).then((d) => setSessions(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);
  useEffect(() => {
    fetchAll();
    fetch("/api/skills/categories").then((r) => r.json()).then(setCategories).catch(() => {});
  }, [fetchAll]);

  // ---- Programme / contenu (creation / edition) --------------------------
  const [modOpen, setModOpen] = useState(false);
  const [editModId, setEditModId] = useState<string | null>(null);
  const [modForm, setModForm] = useState({ title: "", description: "", durationHours: "", cost: "", skillIds: [] as string[] });
  const [savingMod, setSavingMod] = useState(false);
  function toggleModSkill(id: string) {
    setModForm((f) => ({
      ...f,
      skillIds: f.skillIds.includes(id) ? f.skillIds.filter((s) => s !== id) : [...f.skillIds, id],
    }));
  }
  function openNewModule() {
    setEditModId(null);
    setModForm({ title: "", description: "", durationHours: "", cost: "", skillIds: [] });
    setModOpen(true);
  }
  function openEditModule(m: TModule) {
    setEditModId(m.id);
    setModForm({
      title: m.title,
      description: m.description ?? "",
      durationHours: m.durationHours != null ? String(m.durationHours) : "",
      cost: m.cost != null ? String(m.cost) : "",
      skillIds: m.targetSkills.map((s) => s.id),
    });
    setModOpen(true);
  }
  async function saveModule() {
    if (!modForm.title.trim()) return;
    setSavingMod(true);
    const res = await fetch(
      editModId ? `/api/training/modules/${editModId}` : "/api/training/modules",
      {
        method: editModId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: modForm.title,
          description: modForm.description,
          durationHours: modForm.durationHours,
          cost: modForm.cost,
          targetSkillIds: modForm.skillIds,
        }),
      }
    );
    setSavingMod(false);
    if (res.ok) {
      setModOpen(false);
      setEditModId(null);
      setModForm({ title: "", description: "", durationHours: "", cost: "", skillIds: [] });
      fetchAll();
    }
  }
  async function deleteModule(id: string) {
    if (!confirm("Supprimer ce programme ?")) return;
    await fetch(`/api/training/modules/${id}`, { method: "DELETE" });
    fetchAll();
  }

  // ---- Parcours (creation / edition) -------------------------------------
  const [pathOpen, setPathOpen] = useState(false);
  const [editPathId, setEditPathId] = useState<string | null>(null);
  const [pathForm, setPathForm] = useState({ title: "", description: "", moduleIds: [] as string[] });
  const [savingPath, setSavingPath] = useState(false);
  function togglePathModule(id: string) {
    setPathForm((f) => ({
      ...f,
      moduleIds: f.moduleIds.includes(id) ? f.moduleIds.filter((m) => m !== id) : [...f.moduleIds, id],
    }));
  }
  function openNewPath() {
    setEditPathId(null);
    setPathForm({ title: "", description: "", moduleIds: [] });
    setPathOpen(true);
  }
  function openEditPath(p: TPath) {
    setEditPathId(p.id);
    setPathForm({
      title: p.title,
      description: p.description ?? "",
      moduleIds: p.modules.map((pm) => pm.module.id),
    });
    setPathOpen(true);
  }
  async function savePath() {
    if (!pathForm.title.trim()) return;
    setSavingPath(true);
    const res = await fetch(
      editPathId ? `/api/training/paths/${editPathId}` : "/api/training/paths",
      {
        method: editPathId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pathForm),
      }
    );
    setSavingPath(false);
    if (res.ok) {
      setPathOpen(false);
      setEditPathId(null);
      setPathForm({ title: "", description: "", moduleIds: [] });
      fetchAll();
    }
  }
  async function deletePath(id: string) {
    if (!confirm("Supprimer ce parcours ?")) return;
    await fetch(`/api/training/paths/${id}`, { method: "DELETE" });
    fetchAll();
  }

  // ---- Session (creation -> redirige vers la fiche) ----------------------
  const [sessOpen, setSessOpen] = useState(false);
  const [savingSess, setSavingSess] = useState(false);
  const [sessForm, setSessForm] = useState({
    title: "",
    contentType: "module" as "module" | "path" | "libre",
    moduleId: "",
    pathId: "",
    startDate: "",
    endDate: "",
    location: "",
    trainer: "",
    notes: "",
  });
  function openNewSession() {
    setSessForm({ title: "", contentType: "module", moduleId: "", pathId: "", startDate: "", endDate: "", location: "", trainer: "", notes: "" });
    setSessOpen(true);
  }
  async function saveSession() {
    if (!sessForm.title.trim()) return;
    setSavingSess(true);
    const res = await fetch("/api/training/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: sessForm.title,
        moduleId: sessForm.contentType === "module" ? sessForm.moduleId || null : null,
        pathId: sessForm.contentType === "path" ? sessForm.pathId || null : null,
        startDate: sessForm.startDate || null,
        endDate: sessForm.endDate || null,
        location: sessForm.location,
        trainer: sessForm.trainer,
        notes: sessForm.notes,
      }),
    });
    setSavingSess(false);
    if (res.ok) {
      const d = await res.json();
      setSessOpen(false);
      router.push(`/formation/sessions/${d.id}`);
    }
  }
  async function deleteSession(id: string) {
    if (!confirm("Supprimer cette session ? Les participants seront déliés (pas supprimés).")) return;
    await fetch(`/api/training/sessions/${id}`, { method: "DELETE" });
    fetchAll();
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <GraduationCap className="w-6 h-6 text-ink-600" />
        <h1 className="text-2xl font-bold">Formation</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-ink-900/10">
        {([
          ["sessions", "Sessions", sessions.length],
          ["catalogue", "Catalogue", modules.length],
          ["paths", "Parcours", paths.length],
        ] as const).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition ${
              tab === key
                ? "border-signal-500 text-ink-900"
                : "border-transparent text-ink-500 hover:text-ink-800"
            }`}
          >
            {label} <span className="text-xs text-ink-400">({count})</span>
          </button>
        ))}
      </div>

      {/* ----- Sessions (fiches) ----- */}
      {tab === "sessions" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openNewSession}>
              <Plus className="w-4 h-4 mr-2" /> Nouvelle session
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((s) => {
              const st = SESSION_STATUS[s.status] ?? SESSION_STATUS.planifiee;
              const start = fmtDate(s.startDate);
              const end = fmtDate(s.endDate);
              return (
                <Card key={s.id} className="group relative hover:border-signal-500/40 transition-colors">
                  <Link href={`/formation/sessions/${s.id}`} className="block">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-ink-900 leading-tight">{s.title}</h3>
                        <Badge variant="outline" className="shrink-0" style={{ color: st.color, borderColor: st.color + "55" }}>
                          {st.label}
                        </Badge>
                      </div>
                      {(s.module || s.path) && (
                        <p className="text-xs text-ink-500 mt-1 truncate">
                          {s.module?.title || s.path?.title}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs text-ink-500">
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{s.participantCount}</span>
                        {(start || end) && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />{start || "?"}{end && end !== start ? ` → ${end}` : ""}
                          </span>
                        )}
                        {s.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{s.location}</span>}
                        {s.totalCost > 0 && (
                          <span className="flex items-center gap-1"><Euro className="w-3.5 h-3.5" />{s.totalCost.toLocaleString("fr-FR")}</span>
                        )}
                      </div>
                    </CardContent>
                  </Link>
                  {isAdmin && (
                    <button
                      onClick={() => deleteSession(s.id)}
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 text-ink-300 hover:text-red-500 bg-paper-bone/80 rounded p-0.5"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </Card>
              );
            })}
            {sessions.length === 0 && (
              <p className="text-ink-400 text-sm col-span-full">
                Aucune session. Créez-en une : elle regroupera les participants, le contenu, les documents, le financement et l&apos;historique.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ----- Catalogue (programmes / contenus) ----- */}
      {tab === "catalogue" && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <Button onClick={openNewModule}>
                <Plus className="w-4 h-4 mr-2" /> Nouveau programme
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((m) => (
              <Card key={m.id} className="group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-ink-900">{m.title}</h3>
                    {isAdmin && (
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100">
                        <button onClick={() => openEditModule(m)} className="text-ink-400 hover:text-signal-600" title="Modifier">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteModule(m.id)} className="text-ink-400 hover:text-red-500" title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  {m.description && <p className="text-sm text-ink-500 mt-1 line-clamp-2">{m.description}</p>}
                  <div className="flex items-center gap-3 mt-3 text-xs text-ink-500">
                    {m.durationHours != null && (
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{m.durationHours} h</span>
                    )}
                    <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" />{m._count.assignments}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    <Target className="w-3 h-3 text-ink-400" />
                    {m.targetSkills.map((s) => (
                      <Badge key={s.id} variant="outline" className="text-[10px]" style={{ borderColor: s.category.color, color: s.category.color }}>
                        {s.name}
                      </Badge>
                    ))}
                    {m.targetSkills.length === 0 && <span className="text-xs text-ink-500">aucune competence ciblee</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
            {modules.length === 0 && <p className="text-ink-400 text-sm col-span-full">Aucun programme de formation.</p>}
          </div>
        </div>
      )}

      {/* ----- Parcours ----- */}
      {tab === "paths" && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <Button onClick={openNewPath} disabled={modules.length === 0}>
                <Plus className="w-4 h-4 mr-2" /> Nouveau parcours
              </Button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paths.map((p) => (
              <Card key={p.id} className="group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-ink-900 flex items-center gap-2">
                      <Route className="w-4 h-4 text-signal-500" />{p.title}
                    </h3>
                    {isAdmin && (
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100">
                        <button onClick={() => openEditPath(p)} className="text-ink-400 hover:text-signal-600" title="Modifier">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => deletePath(p.id)} className="text-ink-400 hover:text-red-500" title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  {p.description && <p className="text-sm text-ink-500 mt-1">{p.description}</p>}
                  <div className="flex items-center gap-1.5 mt-3 flex-wrap text-xs">
                    {p.modules.map((pm, i) => (
                      <span key={pm.module.id} className="flex items-center gap-1.5">
                        {i > 0 && <span className="text-ink-500">→</span>}
                        <span className="px-2 py-0.5 rounded bg-white text-ink-600">{pm.module.title}</span>
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
            {paths.length === 0 && <p className="text-ink-400 text-sm col-span-full">Aucun parcours.</p>}
          </div>
        </div>
      )}

      {/* ===== Dialog : nouvelle session ===== */}
      <Dialog open={sessOpen} onOpenChange={setSessOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle session de formation</DialogTitle></DialogHeader>
          <div className="space-y-4 py-3">
            <div>
              <Label>Intitulé *</Label>
              <Input
                value={sessForm.title}
                onChange={(e) => setSessForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="ex: Habilitation B0 — mars 2026"
              />
            </div>
            <div>
              <Label>Contenu</Label>
              <div className="flex gap-1.5 mt-1">
                {([
                  ["module", "Programme"],
                  ["path", "Parcours"],
                  ["libre", "Libre"],
                ] as const).map(([v, lbl]) => (
                  <button
                    key={v}
                    onClick={() => setSessForm((f) => ({ ...f, contentType: v }))}
                    className={`px-3 py-1.5 text-sm rounded-md border transition ${
                      sessForm.contentType === v ? "bg-signal-500 text-[#0B1220] border-signal-500" : "border-ink-900/15 text-ink-600 hover:bg-paper-2"
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
              {sessForm.contentType === "module" && (
                <select
                  className="w-full mt-2 px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm"
                  value={sessForm.moduleId}
                  onChange={(e) => {
                    const moduleId = e.target.value;
                    const m = modules.find((x) => x.id === moduleId);
                    setSessForm((f) => ({ ...f, moduleId, title: f.title.trim() ? f.title : m?.title ?? "" }));
                  }}
                >
                  <option value="">— Choisir un programme —</option>
                  {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                </select>
              )}
              {sessForm.contentType === "path" && (
                <select
                  className="w-full mt-2 px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm"
                  value={sessForm.pathId}
                  onChange={(e) => {
                    const pathId = e.target.value;
                    const p = paths.find((x) => x.id === pathId);
                    setSessForm((f) => ({ ...f, pathId, title: f.title.trim() ? f.title : p?.title ?? "" }));
                  }}
                >
                  <option value="">— Choisir un parcours —</option>
                  {paths.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Début</Label>
                <Input type="date" value={sessForm.startDate} onChange={(e) => setSessForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <Label>Fin</Label>
                <Input type="date" value={sessForm.endDate} onChange={(e) => setSessForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Lieu</Label>
                <Input value={sessForm.location} onChange={(e) => setSessForm((f) => ({ ...f, location: e.target.value }))} placeholder="ex: Lyon / distanciel" />
              </div>
              <div>
                <Label>Formateur / organisme</Label>
                <Input value={sessForm.trainer} onChange={(e) => setSessForm((f) => ({ ...f, trainer: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={sessForm.notes} onChange={(e) => setSessForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={saveSession} disabled={savingSess || !sessForm.title.trim()}>
              {savingSess && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Créer la fiche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog : programme ===== */}
      <Dialog open={modOpen} onOpenChange={setModOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editModId ? "Modifier le programme" : "Nouveau programme de formation"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label>Titre *</Label>
                <Input value={modForm.title} onChange={(e) => setModForm((f) => ({ ...f, title: e.target.value }))} placeholder="ex: Dante niveau 2" />
              </div>
              <div>
                <Label>Duree (h)</Label>
                <Input type="number" min={1} value={modForm.durationHours} onChange={(e) => setModForm((f) => ({ ...f, durationHours: e.target.value }))} />
              </div>
              <div>
                <Label>Cout (EUR)</Label>
                <Input type="number" min={0} value={modForm.cost} onChange={(e) => setModForm((f) => ({ ...f, cost: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={2} value={modForm.description} onChange={(e) => setModForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <Label>Competences developpees</Label>
              <div className="max-h-44 overflow-y-auto border border-ink-900/10 rounded-lg p-2 space-y-2">
                {categories.map((cat) => (
                  <div key={cat.id}>
                    <p className="text-[11px] font-semibold mb-1" style={{ color: cat.color }}>{cat.name}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.skills.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => toggleModSkill(s.id)}
                          className={`text-[11px] px-2 py-0.5 rounded-full border transition ${modForm.skillIds.includes(s.id) ? "text-white" : "text-ink-500"}`}
                          style={modForm.skillIds.includes(s.id) ? { backgroundColor: cat.color, borderColor: cat.color } : { borderColor: cat.color + "55" }}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={saveModule} disabled={savingMod || !modForm.title.trim()}>
              {savingMod && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{editModId ? "Enregistrer" : "Creer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog : parcours ===== */}
      <Dialog open={pathOpen} onOpenChange={setPathOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editPathId ? "Modifier le parcours" : "Nouveau parcours"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Titre *</Label>
              <Input value={pathForm.title} onChange={(e) => setPathForm((f) => ({ ...f, title: e.target.value }))} placeholder="ex: Parcours integrateur confirme" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={2} value={pathForm.description} onChange={(e) => setPathForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <Label>Programmes (l&apos;ordre = ordre de selection)</Label>
              <div className="max-h-44 overflow-y-auto border border-ink-900/10 rounded-lg p-2 space-y-1">
                {modules.map((m) => {
                  const idx = pathForm.moduleIds.indexOf(m.id);
                  return (
                    <button
                      key={m.id}
                      onClick={() => togglePathModule(m.id)}
                      className={`w-full flex items-center gap-2 text-left text-sm px-2 py-1.5 rounded ${idx >= 0 ? "bg-signal-500/20 text-ink-900" : "text-ink-500 hover:bg-white"}`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${idx >= 0 ? "bg-signal-500 text-[#0B1220]" : "bg-paper-2"}`}>
                        {idx >= 0 ? idx + 1 : ""}
                      </span>
                      {m.title}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={savePath} disabled={savingPath || !pathForm.title.trim() || pathForm.moduleIds.length === 0}>
              {savingPath && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{editPathId ? "Enregistrer" : "Creer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
