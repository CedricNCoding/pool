"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Users,
  MapPin,
  Wrench,
  Award,
  X,
  Plus,
  FolderPlus,
  Loader2,
  Search as SearchIcon,
  Tag as TagIcon,
} from "lucide-react";
import { SKILL_LEVELS, CERT_CATEGORIES, availabilityMeta } from "@/lib/constants";
import { useSession } from "@/lib/hooks";
import MiniRadar from "@/components/MiniRadar";

interface SkillCategory {
  id: string;
  name: string;
  color: string;
  skills: { id: string; name: string }[];
}
interface Certification {
  id: string;
  name: string;
  issuer: string;
  category: string;
  color: string;
}
interface Company {
  id: string;
  name: string;
  color: string;
}
interface TechResult {
  id: string;
  firstName: string;
  lastName: string;
  service: string;
  contractType: string;
  availabilityStatus: string;
  interventionRadiusKm: number;
  distanceKm?: number;
  company: { id: string; name: string; color: string };
  agency: { name: string; city: string | null } | null;
  skills: { level: number; skill: { name: string; category: { name: string; color: string } } }[];
  certifications: { status: string; certification: { name: string; color: string } }[];
}

type Criterion = {
  type: "skill" | "cert" | "tag";
  id: string;
  label: string;
  color: string;
  minLevel: number;
};

const CITIES: { name: string; lat: number; lng: number }[] = [
  { name: "Paris", lat: 48.8566, lng: 2.3522 },
  { name: "Lyon", lat: 45.764, lng: 4.8357 },
  { name: "Marseille", lat: 43.2965, lng: 5.3698 },
  { name: "Toulouse", lat: 43.6047, lng: 1.4442 },
  { name: "Nice", lat: 43.7102, lng: 7.262 },
  { name: "Nantes", lat: 47.2184, lng: -1.5536 },
  { name: "Strasbourg", lat: 48.5734, lng: 7.7521 },
  { name: "Montpellier", lat: 43.6108, lng: 3.8767 },
  { name: "Bordeaux", lat: 44.8378, lng: -0.5792 },
  { name: "Lille", lat: 50.6292, lng: 3.0573 },
  { name: "Rennes", lat: 48.1173, lng: -1.6778 },
  { name: "Reims", lat: 49.2583, lng: 4.0317 },
  { name: "Dijon", lat: 47.322, lng: 5.0415 },
  { name: "Grenoble", lat: 45.1885, lng: 5.7245 },
  { name: "Angers", lat: 47.4784, lng: -0.5632 },
  { name: "Nancy", lat: 48.6921, lng: 6.1844 },
];

export default function TeamSearchPage() {
  const router = useRouter();
  const { user } = useSession();
  const isAdmin = user?.role === "admin";

  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [results, setResults] = useState<TechResult[]>([]);
  const [loading, setLoading] = useState(false);

  const [allTags, setAllTags] = useState<{ name: string; color: string }[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [paletteTab, setPaletteTab] = useState<"skill" | "cert" | "tag">("skill");
  const [paletteFilter, setPaletteFilter] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [geoCity, setGeoCity] = useState("");
  const [geoMode, setGeoMode] = useState("cover");
  const [geoRadius, setGeoRadius] = useState("50");

  const [team, setTeam] = useState<Record<string, TechResult>>({});
  const [projectOpen, setProjectOpen] = useState(false);
  const [projectForm, setProjectForm] = useState({ title: "", description: "" });
  const [savingProject, setSavingProject] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/skills/categories").then((r) => r.json()),
      fetch("/api/certifications").then((r) => r.json()),
      fetch("/api/companies").then((r) => r.json()),
      fetch("/api/tags").then((r) => r.json()),
    ]).then(([cats, certs, comps, tagsData]) => {
      setCategories(cats);
      setCertifications(certs);
      setCompanies(comps);
      setAllTags(
        (tagsData as { name: string; color: string }[]).map((t) => ({ name: t.name, color: t.color }))
      );
    });
  }, []);

  // --- Recherche live (debounced) -----------------------------------------
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      const skillsAll = criteria
        .filter((c) => c.type === "skill")
        .map((c) => `${c.id}:${c.minLevel}`)
        .join(",");
      const certsAll = criteria
        .filter((c) => c.type === "cert")
        .map((c) => c.id)
        .join(",");
      const tagsAll = criteria
        .filter((c) => c.type === "tag")
        .map((c) => c.id)
        .join(",");
      if (skillsAll) params.set("skillsAll", skillsAll);
      if (certsAll) params.set("certsAll", certsAll);
      if (tagsAll) params.set("tagsAll", tagsAll);
      if (companyId) params.set("companyId", companyId);
      const city = CITIES.find((c) => c.name === geoCity);
      if (city) {
        params.set("lat", String(city.lat));
        params.set("lng", String(city.lng));
        params.set("geoMode", geoMode);
        params.set("geoRadius", geoRadius);
      }
      params.set("isActive", "true");
      params.set("limit", "60");

      setLoading(true);
      fetch(`/api/technicians?${params}`)
        .then((r) => r.json())
        .then((d) => setResults(d.data || []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [criteria, companyId, geoCity, geoMode, geoRadius]);

  // --- Criteres ------------------------------------------------------------
  function addCriterion(c: Omit<Criterion, "minLevel">) {
    setCriteria((prev) =>
      prev.some((p) => p.type === c.type && p.id === c.id)
        ? prev
        : [...prev, { ...c, minLevel: c.type === "skill" ? 1 : 0 }]
    );
  }
  function removeCriterion(type: string, id: string) {
    setCriteria((prev) => prev.filter((c) => !(c.type === type && c.id === id)));
  }
  function setMinLevel(id: string, level: number) {
    setCriteria((prev) =>
      prev.map((c) => (c.type === "skill" && c.id === id ? { ...c, minLevel: level } : c))
    );
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    try {
      const c = JSON.parse(e.dataTransfer.getData("application/json"));
      if (c && c.id) addCriterion(c);
    } catch {
      /* ignore */
    }
  }

  // --- Equipe / Projet -----------------------------------------------------
  const teamList = Object.values(team);
  function toggleTeam(t: TechResult) {
    setTeam((prev) => {
      const next = { ...prev };
      if (next[t.id]) delete next[t.id];
      else next[t.id] = t;
      return next;
    });
  }
  async function createProject() {
    if (!projectForm.title.trim() || teamList.length === 0) return;
    setSavingProject(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: projectForm.title,
        description: projectForm.description,
        technicianIds: teamList.map((t) => t.id),
      }),
    });
    setSavingProject(false);
    if (res.ok) {
      const p = await res.json();
      router.push(`/projets/${p.id}`);
    }
  }

  // --- Radar values per tech ----------------------------------------------
  function radarValues(tech: TechResult): number[] {
    return categories.map((cat) => {
      const lv = tech.skills
        .filter((s) => s.skill.category.name === cat.name)
        .map((s) => s.level);
      return lv.length ? lv.reduce((a, b) => a + b, 0) / lv.length : 0;
    });
  }

  // Palette filtree
  const filteredCats = categories
    .map((cat) => ({
      ...cat,
      skills: cat.skills.filter((s) =>
        s.name.toLowerCase().includes(paletteFilter.toLowerCase())
      ),
    }))
    .filter((cat) => cat.skills.length > 0);
  const filteredCertCats = CERT_CATEGORIES.map((cat) => ({
    ...cat,
    certs: certifications.filter(
      (c) =>
        c.category === cat.value &&
        `${c.name} ${c.issuer}`.toLowerCase().includes(paletteFilter.toLowerCase())
    ),
  })).filter((g) => g.certs.length > 0);

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-6 h-6 text-slate-300" />
        <h1 className="text-2xl font-bold">Chercher une equipe</h1>
        <span className="text-sm text-slate-400">
          Glissez ou cliquez des competences / certifications dans les criteres
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ----- Colonne criteres ----- */}
        <div className="lg:col-span-1 space-y-4">
          {/* Zone Criteres (drop) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Criteres (ET)</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className="min-h-[80px] rounded-lg border-2 border-dashed border-slate-700 p-2 space-y-1.5"
              >
                {criteria.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-4">
                    Deposez des etiquettes ici (ou cliquez-les ci-dessous)
                  </p>
                )}
                {criteria.map((c) => (
                  <div
                    key={`${c.type}-${c.id}`}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs"
                    style={{ backgroundColor: c.color + "22", border: `1px solid ${c.color}55` }}
                  >
                    {c.type === "skill" ? (
                      <Wrench className="w-3 h-3 flex-shrink-0" style={{ color: c.color }} />
                    ) : c.type === "cert" ? (
                      <Award className="w-3 h-3 flex-shrink-0" style={{ color: c.color }} />
                    ) : (
                      <TagIcon className="w-3 h-3 flex-shrink-0" style={{ color: c.color }} />
                    )}
                    <span className="flex-1 truncate" style={{ color: c.color }}>
                      {c.label}
                    </span>
                    {c.type === "skill" && (
                      <select
                        className="bg-slate-900 border border-slate-600 rounded text-[10px] px-1 py-0.5 text-slate-200"
                        value={c.minLevel}
                        onChange={(e) => setMinLevel(c.id, parseInt(e.target.value))}
                        title="Niveau minimum"
                      >
                        {SKILL_LEVELS.map((l) => (
                          <option key={l.value} value={l.value}>
                            ≥ {l.label}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      onClick={() => removeCriterion(c.type, c.id)}
                      className="text-slate-400 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Filtres complementaires */}
              <div className="mt-4 space-y-3">
                {isAdmin && (
                  <div>
                    <Label className="text-xs">Entreprise</Label>
                    <select
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-600 bg-slate-800 text-slate-50 text-sm"
                      value={companyId}
                      onChange={(e) => setCompanyId(e.target.value)}
                    >
                      <option value="">Toutes</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <Label className="text-xs">Zone geographique</Label>
                  <select
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-600 bg-slate-800 text-slate-50 text-sm"
                    value={geoCity}
                    onChange={(e) => setGeoCity(e.target.value)}
                  >
                    <option value="">Toute la France</option>
                    {CITIES.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                {geoCity && (
                  <select
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-600 bg-slate-800 text-slate-50 text-sm"
                    value={geoMode}
                    onChange={(e) => setGeoMode(e.target.value)}
                  >
                    <option value="cover">Peut intervenir sur ce lieu</option>
                    <option value="near">Base a proximite</option>
                  </select>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Palette */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex gap-1">
                <button
                  onClick={() => setPaletteTab("skill")}
                  className={`flex-1 text-xs py-1.5 rounded-md ${paletteTab === "skill" ? "bg-amber-500 text-[#0B1220]" : "bg-slate-800 text-slate-400"}`}
                >
                  Competences
                </button>
                <button
                  onClick={() => setPaletteTab("cert")}
                  className={`flex-1 text-xs py-1.5 rounded-md ${paletteTab === "cert" ? "bg-amber-500 text-[#0B1220]" : "bg-slate-800 text-slate-400"}`}
                >
                  Certifs
                </button>
                <button
                  onClick={() => setPaletteTab("tag")}
                  className={`flex-1 text-xs py-1.5 rounded-md ${paletteTab === "tag" ? "bg-amber-500 text-[#0B1220]" : "bg-slate-800 text-slate-400"}`}
                >
                  Etiquettes
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative mb-3">
                <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <Input
                  className="pl-8 h-8 text-sm"
                  placeholder="Filtrer..."
                  value={paletteFilter}
                  onChange={(e) => setPaletteFilter(e.target.value)}
                />
              </div>
              <div className="max-h-[420px] overflow-y-auto space-y-3 pr-1">
                {paletteTab === "skill"
                  ? filteredCats.map((cat) => (
                      <div key={cat.id}>
                        <p className="text-[11px] font-semibold mb-1" style={{ color: cat.color }}>
                          {cat.name}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {cat.skills.map((s) => (
                            <button
                              key={s.id}
                              draggable
                              onDragStart={(e) =>
                                e.dataTransfer.setData(
                                  "application/json",
                                  JSON.stringify({ type: "skill", id: s.id, label: s.name, color: cat.color })
                                )
                              }
                              onClick={() =>
                                addCriterion({ type: "skill", id: s.id, label: s.name, color: cat.color })
                              }
                              className="text-[11px] px-2 py-0.5 rounded-full border cursor-grab active:cursor-grabbing hover:scale-105 transition"
                              style={{ borderColor: cat.color + "66", color: cat.color }}
                            >
                              {s.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  : paletteTab === "cert"
                  ? filteredCertCats.map((g) => (
                      <div key={g.value}>
                        <p className="text-[11px] font-semibold mb-1" style={{ color: g.color }}>
                          {g.label}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {g.certs.map((c) => (
                            <button
                              key={c.id}
                              draggable
                              onDragStart={(e) =>
                                e.dataTransfer.setData(
                                  "application/json",
                                  JSON.stringify({ type: "cert", id: c.id, label: c.name, color: c.color })
                                )
                              }
                              onClick={() =>
                                addCriterion({ type: "cert", id: c.id, label: c.name, color: c.color })
                              }
                              className="text-[11px] px-2 py-0.5 rounded-full border cursor-grab active:cursor-grabbing hover:scale-105 transition"
                              style={{ borderColor: c.color + "66", color: c.color }}
                              title={c.issuer}
                            >
                              {c.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))
                  : (
                    <div className="flex flex-wrap gap-1.5">
                      {allTags
                        .filter((t) =>
                          t.name.toLowerCase().includes(paletteFilter.toLowerCase())
                        )
                        .map((t) => (
                          <button
                            key={t.name}
                            draggable
                            onDragStart={(e) =>
                              e.dataTransfer.setData(
                                "application/json",
                                JSON.stringify({ type: "tag", id: t.name, label: t.name, color: t.color })
                              )
                            }
                            onClick={() =>
                              addCriterion({ type: "tag", id: t.name, label: t.name, color: t.color })
                            }
                            className="text-[11px] px-2 py-0.5 rounded-full border cursor-grab active:cursor-grabbing hover:scale-105 transition"
                            style={{ borderColor: t.color + "66", color: t.color }}
                          >
                            {t.name}
                          </button>
                        ))}
                      {allTags.length === 0 && (
                        <span className="text-xs text-slate-500">Aucune etiquette creee.</span>
                      )}
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ----- Colonne resultats ----- */}
        <div className="lg:col-span-3 space-y-4">
          {/* Tiroir equipe */}
          {teamList.length > 0 && (
            <Card className="border-blue-700/50 bg-blue-950/20">
              <CardContent className="py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-amber-500 text-[#0B1220]">{teamList.length}</Badge>
                  <span className="text-sm text-slate-300">dans l&apos;equipe :</span>
                  {teamList.slice(0, 6).map((t) => (
                    <Badge key={t.id} variant="outline" className="text-xs gap-1">
                      {t.firstName} {t.lastName}
                      <button onClick={() => toggleTeam(t)} className="hover:text-red-400">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  {teamList.length > 6 && (
                    <span className="text-xs text-slate-500">+{teamList.length - 6}</span>
                  )}
                </div>
                <Button size="sm" onClick={() => setProjectOpen(true)}>
                  <FolderPlus className="w-4 h-4 mr-1" />
                  Creer un projet
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Users className="w-4 h-4" />
                )}
                {results.length} technicien{results.length > 1 ? "s" : ""}
              </CardTitle>
              <Link
                href="/projets"
                className="text-sm text-amber-400 hover:underline"
              >
                Voir les projets
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-slate-400 border-b border-slate-700">
                    <tr>
                      <th className="w-10 py-2 px-3"></th>
                      <th className="text-left py-2 px-3">Technicien</th>
                      <th className="text-left py-2 px-3">Localisation</th>
                      <th className="text-left py-2 px-3">Competences</th>
                      <th className="text-left py-2 px-3">Certifs</th>
                      <th className="text-center py-2 px-3">Profil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((t) => {
                      const inTeam = !!team[t.id];
                      const topSkills = [...t.skills].sort((a, b) => b.level - a.level).slice(0, 4);
                      return (
                        <tr key={t.id} className="border-b border-slate-800 hover:bg-slate-800/40">
                          <td className="py-2 px-3">
                            <button
                              onClick={() => toggleTeam(t)}
                              title={inTeam ? "Retirer de l'equipe" : "Ajouter a l'equipe"}
                              className={`w-6 h-6 rounded-md flex items-center justify-center border transition ${
                                inTeam
                                  ? "bg-amber-500 border-blue-600 text-white"
                                  : "border-slate-600 text-slate-400 hover:border-amber-500"
                              }`}
                            >
                              {inTeam ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                          <td className="py-2 px-3">
                            <Link href={`/technicians/${t.id}`} className="hover:underline">
                              <div className="font-medium text-slate-100 flex items-center gap-1.5">
                                {t.firstName} {t.lastName}
                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: availabilityMeta(t.availabilityStatus).color }}
                                  title={availabilityMeta(t.availabilityStatus).label}
                                />
                              </div>
                            </Link>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: t.company.color }} />
                              {t.company.name} · {t.service}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-xs text-slate-400">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {t.agency?.city || "Siege"}
                            </div>
                            {t.distanceKm !== undefined && (
                              <div className="text-amber-400">a {t.distanceKm} km</div>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex flex-wrap gap-1 max-w-[240px]">
                              {topSkills.map((s, i) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="text-[10px]"
                                  style={{ borderColor: s.skill.category.color, color: s.skill.category.color }}
                                >
                                  {s.skill.name}
                                </Badge>
                              ))}
                              {t.skills.length > 4 && (
                                <span className="text-[10px] text-slate-500 self-center">
                                  +{t.skills.length - 4}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            {t.certifications.length > 0 ? (
                              <Badge variant="secondary" className="text-xs">
                                <Award className="w-3 h-3 mr-1" />
                                {t.certifications.length}
                              </Badge>
                            ) : (
                              <span className="text-xs text-slate-600">--</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="inline-block">
                              <MiniRadar values={radarValues(t)} color={t.company.color} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {results.length === 0 && !loading && (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-slate-500">
                          Aucun technicien ne correspond a ces criteres
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog creation projet */}
      <Dialog open={projectOpen} onOpenChange={setProjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Creer un projet / equipe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Titre du projet *</Label>
              <Input
                value={projectForm.title}
                onChange={(e) => setProjectForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="ex: Festival d'ete 2026 - regie"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                rows={4}
                value={projectForm.description}
                onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Contexte, dates, lieu, besoins..."
              />
            </div>
            <p className="text-sm text-slate-400">
              {teamList.length} technicien{teamList.length > 1 ? "s" : ""}{" "}
              dans l&apos;equipe.
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button
              onClick={createProject}
              disabled={savingProject || !projectForm.title.trim() || teamList.length === 0}
            >
              {savingProject && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Creer le projet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
