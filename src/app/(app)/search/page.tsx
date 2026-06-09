"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, MapPin, Wrench, Award, Users, Loader2, Filter } from "lucide-react";
import { SKILL_LEVELS, CERT_CATEGORIES } from "@/lib/constants";
import Link from "next/link";

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
  email: string;
  service: string;
  contractType: string;
  interventionRadiusKm: number;
  company: { id: string; name: string; color: string };
  skills: { level: number; skill: { name: string; category: { name: string; color: string } } }[];
  certifications: { status: string; certification: { name: string; color: string } }[];
}

export default function SearchPage() {
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [results, setResults] = useState<TechResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [filters, setFilters] = useState({
    search: "",
    companyId: "",
    skillId: "",
    skillLevel: "",
    certificationId: "",
    isActive: "true",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/skills/categories").then((r) => r.json()),
      fetch("/api/certifications").then((r) => r.json()),
      fetch("/api/companies").then((r) => r.json()),
    ]).then(([cats, certs, comps]) => {
      setCategories(cats);
      setCertifications(certs);
      setCompanies(comps);
    });
  }, []);

  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setSearched(true);

    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.companyId) params.set("companyId", filters.companyId);
    if (filters.skillId) params.set("skillId", filters.skillId);
    if (filters.skillLevel) params.set("skillLevel", filters.skillLevel);
    if (filters.certificationId) params.set("certificationId", filters.certificationId);
    if (filters.isActive) params.set("isActive", filters.isActive);
    params.set("limit", "100");

    const res = await fetch(`/api/technicians?${params}`);
    const data = await res.json();
    setResults(data.data || []);
    setLoading(false);
  }

  function clearFilters() {
    setFilters({ search: "", companyId: "", skillId: "", skillLevel: "", certificationId: "", isActive: "true" });
    setResults([]);
    setSearched(false);
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-8">
        <Search className="w-6 h-6 text-slate-300" />
        <h1 className="text-2xl font-bold">Recherche avancee</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="w-4 h-4" />
                Filtres
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div>
                  <Label>Recherche texte</Label>
                  <Input
                    placeholder="Nom, email..."
                    value={filters.search}
                    onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  />
                </div>

                <div>
                  <Label>Entreprise</Label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-50 text-sm"
                    value={filters.companyId}
                    onChange={(e) => setFilters((f) => ({ ...f, companyId: e.target.value }))}
                  >
                    <option value="">Toutes</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Competence</Label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-50 text-sm"
                    value={filters.skillId}
                    onChange={(e) => setFilters((f) => ({ ...f, skillId: e.target.value }))}
                  >
                    <option value="">Toutes</option>
                    {categories.map((cat) => (
                      <optgroup key={cat.id} label={cat.name}>
                        {cat.skills.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {filters.skillId && (
                  <div>
                    <Label>Niveau minimum</Label>
                    <select
                      className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-50 text-sm"
                      value={filters.skillLevel}
                      onChange={(e) => setFilters((f) => ({ ...f, skillLevel: e.target.value }))}
                    >
                      <option value="">Tous niveaux</option>
                      {SKILL_LEVELS.map((l) => (
                        <option key={l.value} value={l.value}>{l.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <Label>Certification</Label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-50 text-sm"
                    value={filters.certificationId}
                    onChange={(e) => setFilters((f) => ({ ...f, certificationId: e.target.value }))}
                  >
                    <option value="">Toutes</option>
                    {CERT_CATEGORIES.map((cat) => (
                      <optgroup key={cat.value} label={cat.label}>
                        {certifications
                          .filter((c) => c.category === cat.value)
                          .map((c) => (
                            <option key={c.id} value={c.id}>{c.name} ({c.issuer})</option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Statut</Label>
                  <select
                    className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-50 text-sm"
                    value={filters.isActive}
                    onChange={(e) => setFilters((f) => ({ ...f, isActive: e.target.value }))}
                  >
                    <option value="true">Actifs uniquement</option>
                    <option value="false">Inactifs uniquement</option>
                    <option value="">Tous</option>
                  </select>
                </div>

                <div className="space-y-2 pt-2">
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                    Rechercher
                  </Button>
                  <Button type="button" variant="outline" className="w-full" onClick={clearFilters}>
                    Effacer les filtres
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          {!searched ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Search className="w-16 h-16 mb-4" />
              <p className="text-lg">Utilisez les filtres pour rechercher des techniciens</p>
            </div>
          ) : loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-slate-600">
                  <strong>{results.length}</strong> resultat{results.length > 1 ? "s" : ""}
                </p>
                {results.length > 0 && (
                  <a
                    href={`/api/export?format=csv${filters.companyId ? `&companyId=${filters.companyId}` : ""}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Exporter en CSV
                  </a>
                )}
              </div>

              <div className="space-y-3">
                {results.map((tech) => (
                  <Link key={tech.id} href={`/technicians/${tech.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                              style={{ backgroundColor: tech.company.color }}
                            >
                              {tech.firstName.charAt(0)}{tech.lastName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">
                                {tech.firstName} {tech.lastName}
                              </p>
                              <p className="text-sm text-slate-500">
                                {tech.company.name} - {tech.service}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap justify-end">
                            {tech.skills.slice(0, 4).map((s, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className="text-xs"
                                style={{
                                  borderColor: s.skill.category.color,
                                  color: s.skill.category.color,
                                }}
                              >
                                {s.skill.name}
                                <span className="ml-1 opacity-60">
                                  {SKILL_LEVELS[s.level - 1]?.label.charAt(0)}
                                </span>
                              </Badge>
                            ))}
                            {tech.certifications.length > 0 && (
                              <Badge className="bg-green-100 text-green-700 border-green-200">
                                <Award className="w-3 h-3 mr-1" />
                                {tech.certifications.length}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}

                {results.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-3" />
                    <p>Aucun technicien ne correspond a ces criteres</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
