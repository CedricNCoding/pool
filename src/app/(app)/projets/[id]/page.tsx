"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Printer, Save, Trash2, Users, MapPin, Award, X, FileDown } from "lucide-react";
import MiniRadar from "@/components/MiniRadar";
import { generateProjectPdf, type PdfProject } from "@/lib/pdf";
import AuditTrail from "@/components/AuditTrail";

interface SkillCategory { id: string; name: string; color: string }
interface Tech {
  id: string;
  firstName: string;
  lastName: string;
  service: string;
  company: { name: string; color: string };
  agency: { name: string; city: string | null } | null;
  skills: { level: number; skill: { name: string; category: { name: string; color: string } } }[];
  certifications: { status: string; certification: { name: string } }[];
}
interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  company: { name: string; color: string } | null;
  technicians: Tech[];
}

const STATUSES = [
  { value: "actif", label: "Actif" },
  { value: "termine", label: "Termine" },
  { value: "archive", label: "Archive" },
];

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [form, setForm] = useState({ title: "", description: "", status: "actif" });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProject = useCallback(async () => {
    const res = await fetch(`/api/projects/${id}`);
    if (res.ok) {
      const p: Project = await res.json();
      setProject(p);
      setForm({ title: p.title, description: p.description ?? "", status: p.status });
      setDirty(false);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchProject();
    fetch("/api/skills/categories").then((r) => r.json()).then(setCategories).catch(() => {});
  }, [fetchProject]);

  async function save() {
    setSaving(true);
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    await fetchProject();
    setSaving(false);
  }

  async function removeTech(techId: string) {
    if (!project) return;
    const ids = project.technicians.filter((t) => t.id !== techId).map((t) => t.id);
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ technicianIds: ids }),
    });
    fetchProject();
  }

  async function removeProject() {
    if (!project || !confirm(`Supprimer le projet "${project.title}" ?`)) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    router.push("/projets");
  }

  function radarValues(t: Tech): number[] {
    return categories.map((cat) => {
      const lv = t.skills.filter((s) => s.skill.category.name === cat.name).map((s) => s.level);
      return lv.length ? lv.reduce((a, b) => a + b, 0) / lv.length : 0;
    });
  }

  if (loading) {
    return <div className="p-8 text-ink-500">Chargement...</div>;
  }
  if (!project) {
    return (
      <div className="p-8">
        <Link href="/projets" className="text-amber-400 hover:underline">← Retour aux projets</Link>
        <p className="text-red-400 mt-4">Projet introuvable.</p>
      </div>
    );
  }

  return (
    <>
      <style>{`@media print { nav, aside, .no-print { display:none !important } body { background:white !important; color:black !important } }`}</style>
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link href="/projets" className="no-print">
              <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{project.title}</h1>
              <div className="flex items-center gap-2 mt-1 text-sm text-ink-500">
                <Users className="w-4 h-4" />
                {project.technicians.length} technicien{project.technicians.length > 1 ? "s" : ""}
                {project.company && (
                  <span className="flex items-center gap-1">
                    · <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: project.company.color }} />
                    {project.company.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 no-print">
            <Button variant="outline" size="sm" onClick={() => generateProjectPdf(project as unknown as PdfProject)}>
              <FileDown className="w-4 h-4 mr-1" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-1" /> Imprimer
            </Button>
            <Button variant="outline" size="sm" className="text-red-400 border-red-400/30 hover:bg-red-400/10" onClick={removeProject}>
              <Trash2 className="w-4 h-4 mr-1" /> Supprimer
            </Button>
          </div>
        </div>

        {/* Edition */}
        <Card className="no-print">
          <CardHeader><CardTitle>Informations du projet</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Label>Titre</Label>
                <Input value={form.title} onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setDirty(true); }} />
              </div>
              <div>
                <Label>Statut</Label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-ink-900/15 bg-white text-ink-900 text-sm"
                  value={form.status}
                  onChange={(e) => { setForm((f) => ({ ...f, status: e.target.value })); setDirty(true); }}
                >
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={4} value={form.description} onChange={(e) => { setForm((f) => ({ ...f, description: e.target.value })); setDirty(true); }} />
            </div>
            <div className="flex justify-end">
              <Button size="sm" disabled={!dirty || saving} onClick={save}>
                <Save className="w-4 h-4 mr-1" /> {saving ? "Sauvegarde..." : "Enregistrer"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Description en impression */}
        {project.description && (
          <div className="hidden print:block">
            <p className="whitespace-pre-wrap text-sm">{project.description}</p>
          </div>
        )}

        {/* Equipe */}
        <Card>
          <CardHeader><CardTitle>Equipe</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-ink-500 border-b border-ink-900/10">
                  <tr>
                    <th className="text-left py-2 px-4">Technicien</th>
                    <th className="text-left py-2 px-4">Localisation</th>
                    <th className="text-left py-2 px-4">Competences</th>
                    <th className="text-left py-2 px-4">Certifs</th>
                    <th className="text-center py-2 px-4">Profil</th>
                    <th className="w-10 no-print"></th>
                  </tr>
                </thead>
                <tbody>
                  {project.technicians.map((t) => {
                    const top = [...t.skills].sort((a, b) => b.level - a.level).slice(0, 4);
                    return (
                      <tr key={t.id} className="border-b border-ink-900/10">
                        <td className="py-2 px-4">
                          <Link href={`/technicians/${t.id}`} className="font-medium text-ink-900 hover:underline">
                            {t.firstName} {t.lastName}
                          </Link>
                          <div className="flex items-center gap-1.5 text-xs text-ink-500">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: t.company.color }} />
                            {t.company.name} · {t.service}
                          </div>
                        </td>
                        <td className="py-2 px-4 text-xs text-ink-500">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{t.agency?.city || "Siege"}</span>
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex flex-wrap gap-1 max-w-[240px]">
                            {top.map((s, i) => (
                              <Badge key={i} variant="outline" className="text-[10px]" style={{ borderColor: s.skill.category.color, color: s.skill.category.color }}>
                                {s.skill.name}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="py-2 px-4">
                          {t.certifications.length > 0 ? (
                            <Badge variant="secondary" className="text-xs"><Award className="w-3 h-3 mr-1" />{t.certifications.length}</Badge>
                          ) : <span className="text-xs text-ink-500">--</span>}
                        </td>
                        <td className="py-2 px-4 text-center">
                          <div className="inline-block"><MiniRadar values={radarValues(t)} color={t.company.color} /></div>
                        </td>
                        <td className="py-2 px-4 no-print">
                          <button onClick={() => removeTech(t.id)} className="text-ink-9000 hover:text-red-400" title="Retirer de l'equipe">
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {project.technicians.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-8 text-ink-9000">
                      Aucun technicien. Ajoutez-en depuis <Link href="/search" className="text-amber-400 hover:underline">Chercher une equipe</Link>.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <AuditTrail entityType="project" entityId={project.id} />
      </div>
    </>
  );
}
