"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Gauge,
  Users,
  Sparkles,
  ShieldAlert,
  UserPlus,
  Target,
  Wallet,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { SERVICES } from "@/lib/constants";
import { useSession } from "@/lib/hooks";

interface Direction {
  headcount: { total: number; byContract: Record<string, number> };
  capacity: { disponible: number; en_mission: number; indisponible: number };
  capital: { skillPoints: number; avgLevel: number; validCerts: number; securityHab: number; coveredSkills: number; totalSkills: number };
  busFactor: { skill: string; family: string; color: string; holder: string; holderId: string }[];
  recruitment: { departures: { id: string; name: string; date: string }[]; priorities: { skill: string; family: string; color: string; holders: number }[] };
}
interface Compliance { total: number; items: { id: string; name: string; service: string; issues: string[] }[] }
interface Objective { id: string; label: string; skillName: string | null; color: string; minLevel: number; targetPercent: number; deadline: string | null; currentPercent: number; reached: boolean }
interface Budget { investedValidated: number; engaged: number; validatedCount: number; skillsGained: number; costPerSkill: number; byModule: { title: string; cost: number; count: number; total: number }[] }
interface Category { id: string; name: string; skills: { id: string; name: string }[] }

const eur = (n: number) => n.toLocaleString("fr-FR") + " EUR";
const serviceLabel = (v: string) => SERVICES.find((s) => s.value === v)?.label ?? v;

function Kpi({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-ink-500">{label}</p>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <p className="mt-2 text-3xl font-bold text-ink-900">{value}</p>
        {sub && <p className="text-xs text-ink-400 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function DirectionPage() {
  const { user } = useSession();
  const [d, setD] = useState<Direction | null>(null);
  const [comp, setComp] = useState<Compliance | null>(null);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ label: "", skillId: "", minLevel: "3", targetPercent: "80", deadline: "" });

  const loadObjectives = useCallback(() => {
    fetch(`/api/objectives${companyId ? `?companyId=${companyId}` : ""}`)
      .then((r) => r.json()).then(setObjectives).catch(() => {});
  }, [companyId]);

  useEffect(() => {
    fetch("/api/skills/categories").then((r) => r.json()).then(setCategories).catch(() => {});
    fetch("/api/companies").then((r) => r.json()).then(setCompanies).catch(() => {});
  }, []);

  useEffect(() => {
    const cq = companyId ? `?companyId=${companyId}` : "";
    fetch(`/api/direction${cq}`).then((r) => r.json()).then(setD).catch(() => {});
    fetch(`/api/compliance${cq}`).then((r) => r.json()).then(setComp).catch(() => {});
    fetch(`/api/training/budget${cq}`).then((r) => r.json()).then(setBudget).catch(() => {});
    loadObjectives();
  }, [companyId, loadObjectives]);

  async function addObjective() {
    if (!form.label.trim()) return;
    const res = await fetch("/api/objectives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setOpen(false);
      setForm({ label: "", skillId: "", minLevel: "3", targetPercent: "80", deadline: "" });
      loadObjectives();
    }
  }
  async function delObjective(id: string) {
    await fetch(`/api/objectives/${id}`, { method: "DELETE" });
    loadObjectives();
  }

  if (!d) return <div className="p-8 text-ink-500">Chargement du cockpit...</div>;

  const capPct = d.headcount.total ? Math.round((d.capacity.disponible / d.headcount.total) * 100) : 0;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Gauge className="w-6 h-6 text-ink-600" />
          <h1 className="text-2xl font-bold">Tableau de bord direction</h1>
        </div>
        {user?.role === "admin" && companies.length > 0 && (
          <select
            className="px-3 py-2 rounded-lg border border-ink-900/15 bg-white text-ink-900 text-sm"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
          >
            <option value="">Toutes les entreprises</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <Kpi label="Effectif actif" value={d.headcount.total} icon={Users} color="#3B82F6" />
        <Kpi label="Capacite disponible" value={`${capPct}%`} sub={`${d.capacity.disponible} dispo / ${d.capacity.en_mission} en mission`} icon={Gauge} color="#10B981" />
        <Kpi label="Capital competences" value={d.capital.skillPoints} sub="points de competence" icon={Sparkles} color="#8B5CF6" />
        <Kpi label="Non-conformites" value={comp?.total ?? 0} sub="habilitation / medical / certifs" icon={ShieldAlert} color={(comp?.total ?? 0) > 0 ? "#EF4444" : "#10B981"} />
        <Kpi label="Departs a venir (90j)" value={d.recruitment.departures.length} icon={UserPlus} color="#F59E0B" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Capital competences */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Sparkles className="w-5 h-5 text-violet-400" /> Capital competences</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {[
                ["Points de competence", d.capital.skillPoints],
                ["Niveau moyen", d.capital.avgLevel],
                ["Certifications valides", d.capital.validCerts],
                ["Habilitations securite", d.capital.securityHab],
                ["Competences couvertes", `${d.capital.coveredSkills}/${d.capital.totalSkills}`],
              ].map(([l, v]) => (
                <div key={l as string}>
                  <p className="text-xs text-ink-400">{l}</p>
                  <p className="text-xl font-semibold text-ink-900">{v}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-ink-400 mt-3">
              La valeur technique de votre parc, a presenter aux clients et partenaires.
            </p>
          </CardContent>
        </Card>

        {/* Conformite */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldAlert className="w-5 h-5 text-red-400" /> Conformite & responsabilite
              {comp && <Badge variant="secondary">{comp.total}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!comp || comp.items.length === 0 ? (
              <p className="text-sm text-emerald-400 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Aucune non-conformite. Tout le monde est en regle.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {comp.items.slice(0, 12).map((t) => (
                  <div key={t.id} className="flex items-start justify-between gap-2">
                    <Link href={`/technicians/${t.id}`} className="text-sm text-ink-900 hover:underline">{t.name}</Link>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {t.issues.map((i, k) => (
                        <span key={k} className="text-[10px] px-1.5 py-0.5 rounded-full text-red-300 bg-red-500/15">{i}</span>
                      ))}
                    </div>
                  </div>
                ))}
                {comp.items.length > 12 && <p className="text-xs text-ink-400">et {comp.items.length - 12} autre(s).</p>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bus factor */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><AlertTriangle className="w-5 h-5 text-amber-400" /> Dependances critiques</CardTitle></CardHeader>
          <CardContent>
            {d.busFactor.length === 0 ? (
              <p className="text-sm text-ink-400">Aucune competence avancee tenue par un seul technicien.</p>
            ) : (
              <>
                <p className="text-xs text-ink-400 mb-2">Competences (niveau avance) detenues par une seule personne — a securiser en formant un second.</p>
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {d.busFactor.map((b, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.color }} />
                        {b.skill}
                      </span>
                      <Link href={`/technicians/${b.holderId}`} className="text-xs text-ink-500 hover:underline">{b.holder}</Link>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recrutement */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><UserPlus className="w-5 h-5 text-amber-400" /> Besoin en recrutement</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-ink-400 mb-1">Departs a anticiper (90 jours)</p>
              {d.recruitment.departures.length === 0 ? (
                <p className="text-sm text-ink-400">Aucun depart proche.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {d.recruitment.departures.map((t) => (
                    <Link key={t.id} href={`/technicians/${t.id}`} className="text-xs px-2 py-0.5 rounded-full bg-signal-500/15 text-signal-300 hover:underline">
                      {t.name} ({new Date(t.date).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })})
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-ink-400 mb-1">Competences a renforcer (priorites)</p>
              <div className="flex flex-wrap gap-1.5">
                {d.recruitment.priorities.map((p, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full border" style={{ color: p.color, borderColor: p.color + "55" }}>
                    {p.skill} · {p.holders} tech
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Objectifs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg"><Target className="w-5 h-5 text-emerald-400" /> Objectifs de montee en competences</CardTitle>
          {user?.role === "admin" && (
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> Ajouter</Button>
          )}
        </CardHeader>
        <CardContent>
          {objectives.length === 0 ? (
            <p className="text-sm text-ink-400">Aucun objectif. Fixez une cible (ex. « 80% habilites travail en hauteur »).</p>
          ) : (
            <div className="space-y-3">
              {objectives.map((o) => (
                <div key={o.id} className="group">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-ink-900">
                      {o.label}
                      {o.deadline && <span className="text-xs text-ink-400"> · echeance {new Date(o.deadline).toLocaleDateString("fr-FR")}</span>}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className={o.reached ? "text-emerald-400" : "text-ink-500"}>{o.currentPercent}% / {o.targetPercent}%</span>
                      {user?.role === "admin" && (
                        <button onClick={() => delObjective(o.id)} className="text-ink-500 hover:text-red-400 opacity-0 group-hover:opacity-100"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, o.currentPercent)}%`, backgroundColor: o.reached ? "#10B981" : o.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget formation */}
      {budget && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Wallet className="w-5 h-5 text-cyan-400" /> Budget & ROI formation</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div><p className="text-xs text-ink-400">Investi (validees)</p><p className="text-xl font-semibold text-ink-900">{eur(budget.investedValidated)}</p></div>
              <div><p className="text-xs text-ink-400">Engage (en cours)</p><p className="text-xl font-semibold text-ink-900">{eur(budget.engaged)}</p></div>
              <div><p className="text-xs text-ink-400">Competences gagnees</p><p className="text-xl font-semibold text-ink-900 flex items-center gap-1"><TrendingUp className="w-4 h-4 text-emerald-400" />{budget.skillsGained}</p></div>
              <div><p className="text-xs text-ink-400">Cout / competence</p><p className="text-xl font-semibold text-ink-900">{eur(budget.costPerSkill)}</p></div>
            </div>
            {budget.byModule.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-ink-400">Detail par module (formations validees)</p>
                {budget.byModule.map((m) => (
                  <div key={m.title} className="flex items-center justify-between text-sm">
                    <span className="text-ink-600">{m.title}</span>
                    <span className="text-ink-500">{m.count} x {eur(m.cost)} = <span className="text-ink-900">{eur(m.total)}</span></span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-ink-400 mt-3">Renseignez le cout des modules dans le menu Formation pour affiner le suivi.</p>
          </CardContent>
        </Card>
      )}

      {/* Dialog objectif */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvel objectif</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Intitule *</Label>
              <Input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="ex: 80% habilites travail en hauteur" />
            </div>
            <div>
              <Label>Competence visee</Label>
              <select className="w-full px-3 py-2 rounded-lg border border-ink-900/15 bg-white text-ink-900 text-sm" value={form.skillId} onChange={(e) => setForm((f) => ({ ...f, skillId: e.target.value }))}>
                <option value="">Selectionner...</option>
                {categories.map((cat) => (
                  <optgroup key={cat.id} label={cat.name}>
                    {cat.skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Niveau mini</Label>
                <Input type="number" min={1} max={5} value={form.minLevel} onChange={(e) => setForm((f) => ({ ...f, minLevel: e.target.value }))} />
              </div>
              <div>
                <Label>Cible %</Label>
                <Input type="number" min={1} max={100} value={form.targetPercent} onChange={(e) => setForm((f) => ({ ...f, targetPercent: e.target.value }))} />
              </div>
              <div>
                <Label>Echeance</Label>
                <Input type="date" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={addObjective} disabled={!form.label.trim() || !form.skillId}>Creer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
