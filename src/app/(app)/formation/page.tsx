"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  CheckCircle,
  Loader2,
  Search,
  Users,
  History,
} from "lucide-react";
import { SKILL_LEVELS, SERVICES } from "@/lib/constants";
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
interface Assignment {
  id: string;
  status: string;
  note: string | null;
  technician: { id: string; firstName: string; lastName: string; company: { name: string; color: string } };
  module: { id: string; title: string; targetSkills: { id: string; name: string }[] } | null;
  path: { id: string; title: string } | null;
}
interface AssignEvent {
  id: string;
  status: string;
  note: string | null;
  actorName: string | null;
  createdAt: string;
}
interface WeakTech {
  id: string;
  firstName: string;
  lastName: string;
  service: string;
  company: { name: string; color: string };
  perSkill: { skillId: string; name: string; level: number }[];
}

const STATUS: Record<string, { label: string; color: string }> = {
  propose: { label: "Propose", color: "#F59E0B" },
  en_cours: { label: "En cours", color: "#3B82F6" },
  valide: { label: "Valide", color: "#10B981" },
  annule: { label: "Annule", color: "#64748B" },
};

function levelLabel(n: number) {
  if (n === 0) return "Aucune";
  return SKILL_LEVELS.find((l) => l.value === n)?.label ?? `${n}`;
}
function levelColor(n: number) {
  if (n === 0) return "#475569";
  return SKILL_LEVELS.find((l) => l.value === n)?.color ?? "#64748B";
}

export default function FormationPage() {
  const { user } = useSession();
  const isAdmin = user?.role === "admin";
  const [tab, setTab] = useState<"modules" | "paths" | "assignments">("modules");

  const [modules, setModules] = useState<TModule[]>([]);
  const [paths, setPaths] = useState<TPath[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);

  const fetchAll = useCallback(() => {
    fetch("/api/training/modules").then((r) => r.json()).then(setModules).catch(() => {});
    fetch("/api/training/paths").then((r) => r.json()).then(setPaths).catch(() => {});
    fetch("/api/training/assignments").then((r) => r.json()).then(setAssignments).catch(() => {});
  }, []);
  useEffect(() => {
    fetchAll();
    fetch("/api/skills/categories").then((r) => r.json()).then(setCategories).catch(() => {});
    fetch("/api/companies").then((r) => r.json()).then((d) => setCompanies(Array.isArray(d) ? d : [])).catch(() => {});
  }, [fetchAll]);

  // ---- Session (creation / edition) --------------------------------------
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

  // ---- Affectation par criteres (recherche de techniciens -> parcours) ----
  type AssignTech = {
    id: string;
    firstName: string;
    lastName: string;
    service: string;
    company: { name: string; color: string };
  };
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignPathId, setAssignPathId] = useState("");
  const [assignF, setAssignF] = useState({ q: "", companyId: "", service: "", skillId: "", skillLevel: "" });
  const [assignResults, setAssignResults] = useState<AssignTech[]>([]);
  const [assignSel, setAssignSel] = useState<Set<string>>(new Set());
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);

  const allSkills = categories.flatMap((c) => (c.skills ?? []).map((s) => ({ ...s, color: c.color })));

  const searchAssignTechs = useCallback(async () => {
    setAssignLoading(true);
    const p = new URLSearchParams({ isActive: "true", limit: "100" });
    if (assignF.q) p.set("search", assignF.q);
    if (assignF.companyId) p.set("companyId", assignF.companyId);
    if (assignF.service) p.set("service", assignF.service);
    if (assignF.skillId) p.set("skillId", assignF.skillId);
    if (assignF.skillLevel) p.set("skillLevel", assignF.skillLevel);
    try {
      const res = await fetch(`/api/technicians?${p.toString()}`);
      const d = await res.json();
      setAssignResults(Array.isArray(d.data) ? d.data : []);
    } catch {
      setAssignResults([]);
    } finally {
      setAssignLoading(false);
    }
  }, [assignF]);

  function openAssign() {
    setAssignPathId(paths[0]?.id ?? "");
    setAssignF({ q: "", companyId: "", service: "", skillId: "", skillLevel: "" });
    setAssignResults([]);
    setAssignSel(new Set());
    setAssignOpen(true);
  }
  function toggleAssignTech(id: string) {
    setAssignSel((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  async function assignSelectedToPath() {
    if (!assignPathId || assignSel.size === 0) return;
    setAssignSaving(true);
    await Promise.all(
      Array.from(assignSel).map((technicianId) =>
        fetch("/api/training/assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ technicianId, pathId: assignPathId, status: "propose" }),
        }).catch(() => {})
      )
    );
    setAssignSaving(false);
    setAssignOpen(false);
    setTab("assignments");
    fetchAll();
  }

  // ---- Preselection ------------------------------------------------------
  const [presModule, setPresModule] = useState<TModule | null>(null);
  const [presLevel, setPresLevel] = useState(3);
  const [weak, setWeak] = useState<WeakTech[]>([]);
  const [loadingWeak, setLoadingWeak] = useState(false);
  const loadPreselection = useCallback((moduleId: string, level: number) => {
    setLoadingWeak(true);
    fetch(`/api/training/modules/${moduleId}/preselection?level=${level}`)
      .then((r) => r.json())
      .then((d) => setWeak(Array.isArray(d) ? d : []))
      .catch(() => setWeak([]))
      .finally(() => setLoadingWeak(false));
  }, []);
  function openPreselection(m: TModule) {
    setPresModule(m);
    setPresLevel(3);
    loadPreselection(m.id, 3);
  }
  async function assign(techId: string, moduleId: string) {
    await fetch("/api/training/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ technicianId: techId, moduleId, status: "propose" }),
    });
    setWeak((w) => w.filter((t) => t.id !== techId));
    fetchAll();
  }

  // ---- Validation --------------------------------------------------------
  const [valAssign, setValAssign] = useState<Assignment | null>(null);
  const [valLevels, setValLevels] = useState<Record<string, number>>({});
  const [savingVal, setSavingVal] = useState(false);
  function openValidate(a: Assignment) {
    setValAssign(a);
    const init: Record<string, number> = {};
    (a.module?.targetSkills ?? []).forEach((s) => (init[s.id] = 3));
    setValLevels(init);
  }
  async function confirmValidate() {
    if (!valAssign) return;
    setSavingVal(true);
    await fetch(`/api/training/assignments/${valAssign.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "valide",
        levels: Object.entries(valLevels).map(([skillId, level]) => ({ skillId, level })),
      }),
    });
    setSavingVal(false);
    setValAssign(null);
    fetchAll();
  }
  async function setStatus(id: string, status: string) {
    await fetch(`/api/training/assignments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchAll();
  }
  async function deleteAssignment(id: string) {
    if (!confirm("Supprimer cette affectation et tout son historique ?")) return;
    await fetch(`/api/training/assignments/${id}`, { method: "DELETE" });
    fetchAll();
  }

  // ---- Historique d'une affectation -------------------------------------
  const [histAssign, setHistAssign] = useState<Assignment | null>(null);
  const [histEvents, setHistEvents] = useState<AssignEvent[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  async function openHistory(a: Assignment) {
    setHistAssign(a);
    setHistEvents([]);
    setHistLoading(true);
    try {
      const r = await fetch(`/api/training/assignments/${a.id}`);
      if (r.ok) setHistEvents((await r.json()).history ?? []);
    } finally {
      setHistLoading(false);
    }
  }
  async function deleteModule(id: string) {
    if (!confirm("Supprimer cette session ?")) return;
    await fetch(`/api/training/modules/${id}`, { method: "DELETE" });
    fetchAll();
  }
  async function deletePath(id: string) {
    if (!confirm("Supprimer ce parcours ?")) return;
    await fetch(`/api/training/paths/${id}`, { method: "DELETE" });
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
          ["modules", "Sessions", modules.length],
          ["paths", "Parcours", paths.length],
          ["assignments", "Affectations", assignments.length],
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

      {/* ----- Modeles ----- */}
      {tab === "modules" && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <Button onClick={openNewModule}>
                <Plus className="w-4 h-4 mr-2" /> Nouvelle session
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
                  {m.targetSkills.length > 0 && (
                    <Button variant="outline" size="sm" className="w-full mt-3" onClick={() => openPreselection(m)}>
                      <Target className="w-4 h-4 mr-1" /> Preselection (faiblesses)
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
            {modules.length === 0 && <p className="text-ink-400 text-sm col-span-full">Aucune session de formation.</p>}
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

      {/* ----- Affectations ----- */}
      {tab === "assignments" && (
        <div className="space-y-4">
          {isAdmin && (
            <div className="flex justify-end">
              <Button onClick={openAssign} disabled={paths.length === 0}>
                <Users className="w-4 h-4 mr-2" /> Affecter par criteres
              </Button>
            </div>
          )}
          <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="text-xs text-ink-500 border-b border-ink-900/10">
                <tr>
                  <th className="text-left py-2 px-4">Technicien</th>
                  <th className="text-left py-2 px-4">Formation</th>
                  <th className="text-left py-2 px-4">Statut</th>
                  <th className="text-right py-2 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => {
                  const st = STATUS[a.status] ?? STATUS.propose;
                  return (
                    <tr key={a.id} className="border-b border-ink-900/10">
                      <td className="py-2 px-4">
                        <Link href={`/technicians/${a.technician.id}`} className="font-medium text-ink-900 hover:underline">
                          {a.technician.firstName} {a.technician.lastName}
                        </Link>
                        <div className="flex items-center gap-1.5 text-xs text-ink-500">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: a.technician.company.color }} />
                          {a.technician.company.name}
                        </div>
                      </td>
                      <td className="py-2 px-4 text-ink-600">
                        {a.module?.title || a.path?.title || "-"}
                      </td>
                      <td className="py-2 px-4">
                        <Badge variant="outline" style={{ color: st.color, borderColor: st.color + "55" }}>
                          {st.label}
                        </Badge>
                      </td>
                      <td className="py-2 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {a.status === "propose" && (
                            <Button size="sm" variant="outline" onClick={() => setStatus(a.id, "en_cours")}>Demarrer</Button>
                          )}
                          {a.status !== "valide" && a.status !== "annule" && a.module && (
                            <Button size="sm" onClick={() => openValidate(a)}>
                              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Valider
                            </Button>
                          )}
                          {a.status === "annule" && (
                            <Button size="sm" variant="outline" onClick={() => setStatus(a.id, "propose")}>Reactiver</Button>
                          )}
                          {a.status !== "valide" && a.status !== "annule" && (
                            <Button size="sm" variant="ghost" className="text-ink-400" onClick={() => setStatus(a.id, "annule")}>Annuler</Button>
                          )}
                          <button onClick={() => openHistory(a)} className="text-ink-400 hover:text-ink-700 ml-1" title="Historique">
                            <History className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteAssignment(a.id)} className="text-ink-400 hover:text-red-400" title="Supprimer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {assignments.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-10 text-ink-400">
                    Aucune affectation. Utilisez « Affecter par criteres » ou la preselection d&apos;une session.
                  </td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
          </Card>
        </div>
      )}

      {/* ===== Dialog : nouveau module ===== */}
      <Dialog open={modOpen} onOpenChange={setModOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editModId ? "Modifier la session" : "Nouvelle session de formation"}</DialogTitle></DialogHeader>
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

      {/* ===== Dialog : nouveau parcours ===== */}
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
              <Label>Sessions (l&apos;ordre = ordre de selection)</Label>
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

      {/* ===== Dialog : affectation par criteres ===== */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader><DialogTitle>Affecter des techniciens a un parcours</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Parcours cible *</Label>
              <select
                className="w-full px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm"
                value={assignPathId}
                onChange={(e) => setAssignPathId(e.target.value)}
              >
                {paths.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>

            {/* Criteres de recherche (comme « Chercher une equipe ») */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative sm:col-span-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <Input className="pl-8" placeholder="Nom ou email..." value={assignF.q} onChange={(e) => setAssignF((f) => ({ ...f, q: e.target.value }))} />
              </div>
              {isAdmin && (
                <select className="px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm" value={assignF.companyId} onChange={(e) => setAssignF((f) => ({ ...f, companyId: e.target.value }))}>
                  <option value="">Toutes entreprises</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              <select className="px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm" value={assignF.service} onChange={(e) => setAssignF((f) => ({ ...f, service: e.target.value }))}>
                <option value="">Tous services</option>
                {SERVICES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <select className="px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm" value={assignF.skillId} onChange={(e) => setAssignF((f) => ({ ...f, skillId: e.target.value }))}>
                <option value="">Toute competence</option>
                {allSkills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select className="px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm" value={assignF.skillLevel} onChange={(e) => setAssignF((f) => ({ ...f, skillLevel: e.target.value }))} disabled={!assignF.skillId}>
                <option value="">Niveau min.</option>
                {SKILL_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label} ({l.value}+)</option>)}
              </select>
              <Button variant="outline" onClick={searchAssignTechs} disabled={assignLoading} className="sm:col-span-2">
                {assignLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />} Rechercher
              </Button>
            </div>

            {/* Resultats */}
            <div className="max-h-60 overflow-y-auto border border-ink-900/10 rounded-lg divide-y divide-ink-900/5">
              {assignResults.length === 0 ? (
                <p className="text-sm text-ink-400 p-4 text-center">{assignLoading ? "Recherche..." : "Lancez une recherche pour lister les techniciens."}</p>
              ) : (
                assignResults.map((t) => {
                  const sel = assignSel.has(t.id);
                  return (
                    <button key={t.id} onClick={() => toggleAssignTech(t.id)} className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm ${sel ? "bg-signal-500/10" : "hover:bg-paper-2"}`}>
                      <span className={`w-4 h-4 rounded border flex items-center justify-center ${sel ? "bg-signal-500 border-signal-500" : "border-ink-900/25"}`}>
                        {sel && <CheckCircle className="w-3 h-3 text-[#0B1220]" />}
                      </span>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.company.color }} />
                      <span className="font-medium text-ink-900">{t.firstName} {t.lastName}</span>
                      <span className="text-xs text-ink-400 ml-auto">{t.company.name}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
          <DialogFooter>
            <span className="text-sm text-ink-500 mr-auto self-center">{assignSel.size} selectionne(s)</span>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={assignSelectedToPath} disabled={assignSaving || !assignPathId || assignSel.size === 0}>
              {assignSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Affecter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog : preselection ===== */}
      <Dialog open={!!presModule} onOpenChange={(o) => !o && setPresModule(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preselection — {presModule?.title}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <div className="flex items-center gap-2 mb-3">
              <Label className="text-xs">Seuil de faiblesse : sous</Label>
              <select
                className="px-2 py-1 rounded border border-ink-900/15 bg-white text-ink-900 text-sm"
                value={presLevel}
                onChange={(e) => {
                  const lv = parseInt(e.target.value);
                  setPresLevel(lv);
                  if (presModule) loadPreselection(presModule.id, lv);
                }}
              >
                {SKILL_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div className="max-h-80 overflow-y-auto space-y-1.5">
              {loadingWeak ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-ink-500" /></div>
              ) : weak.length === 0 ? (
                <p className="text-sm text-ink-400 text-center py-6">Aucun technicien en faiblesse sous ce seuil.</p>
              ) : (
                weak.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-paper-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-ink-900 truncate">{t.firstName} {t.lastName}</div>
                      <div className="flex items-center gap-1 flex-wrap mt-0.5">
                        {t.perSkill.map((p) => (
                          <span key={p.skillId} className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: levelColor(p.level), backgroundColor: levelColor(p.level) + "22" }}>
                            {p.name}: {levelLabel(p.level)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => presModule && assign(t.id, presModule.id)}>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Affecter
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog : validation ===== */}
      <Dialog open={!!valAssign} onOpenChange={(o) => !o && setValAssign(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Valider la formation</DialogTitle></DialogHeader>
          <div className="py-3 space-y-4">
            <p className="text-sm text-ink-500">
              Fixez le niveau atteint par <strong className="text-ink-800">{valAssign?.technician.firstName} {valAssign?.technician.lastName}</strong> sur les competences du module. Cela met a jour ses competences et son historique.
            </p>
            {(valAssign?.module?.targetSkills ?? []).map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3">
                <span className="text-sm text-ink-800">{s.name}</span>
                <select
                  className="px-2 py-1 rounded border border-ink-900/15 bg-white text-ink-900 text-sm"
                  value={valLevels[s.id] ?? 3}
                  onChange={(e) => setValLevels((v) => ({ ...v, [s.id]: parseInt(e.target.value) }))}
                >
                  <option value={0}>Aucune</option>
                  {SKILL_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            ))}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={confirmValidate} disabled={savingVal}>
              {savingVal && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <CheckCircle className="w-4 h-4 mr-1" /> Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog : historique d'une affectation ===== */}
      <Dialog open={!!histAssign} onOpenChange={(o) => !o && setHistAssign(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Historique de l&apos;affectation</DialogTitle></DialogHeader>
          {histAssign && (
            <p className="text-sm text-ink-500 -mt-1">
              {histAssign.technician.firstName} {histAssign.technician.lastName}
              {" — "}
              {histAssign.module?.title || histAssign.path?.title || ""}
            </p>
          )}
          <div className="py-3">
            {histLoading ? (
              <div className="flex items-center gap-2 text-sm text-ink-400">
                <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
              </div>
            ) : histEvents.length === 0 ? (
              <p className="text-sm text-ink-400">Aucun évènement.</p>
            ) : (
              <ol className="relative border-l border-ink-900/15 ml-2 space-y-4">
                {histEvents.map((e) => {
                  const st = STATUS[e.status] ?? STATUS.propose;
                  return (
                    <li key={e.id} className="ml-4">
                      <span
                        className="absolute -left-[5px] mt-1 w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: st.color }}
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" style={{ color: st.color, borderColor: st.color + "55" }}>
                          {st.label}
                        </Badge>
                        <span className="text-xs text-ink-400">
                          {new Date(e.createdAt).toLocaleString("fr-FR")}
                        </span>
                      </div>
                      {(e.actorName || e.note) && (
                        <div className="text-xs text-ink-500 mt-0.5">
                          {e.actorName ? `par ${e.actorName}` : ""}
                          {e.note ? `${e.actorName ? " — " : ""}${e.note}` : ""}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Fermer</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
