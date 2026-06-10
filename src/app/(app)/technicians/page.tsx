"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import {
  Users,
  Plus,
  Upload,
  Download,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  X,
  List,
  LayoutGrid,
} from "lucide-react";
import MiniRadar from "@/components/MiniRadar";
import { CONTRACT_TYPES, SERVICES, SKILL_LEVELS, AVAILABILITY, availabilityMeta } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Company {
  id: string;
  name: string;
  color: string;
}

interface SkillCategory {
  id: string;
  name: string;
  color: string;
  skills: { id: string; name: string }[];
}

interface TechSkill {
  id: string;
  level: number;
  skill: {
    id: string;
    name: string;
    category: { id: string; name: string; color: string };
  };
}

interface TechCert {
  id: string;
  status: string;
  certification: { id: string; name: string; category: string; color: string };
}

interface Technician {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  service: string;
  contractType: string;
  availabilityStatus: string;
  isActive: boolean;
  company: { id: string; name: string; color: string };
  agency: { id: string; name: string; city: string } | null;
  skills: TechSkill[];
  certifications: TechCert[];
  tags: { id: string; name: string }[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONTRACT_COLOR: Record<string, string> = {
  CDI: "#10B981",
  CDD: "#3B82F6",
  interim: "#F59E0B",
  freelance: "#8B5CF6",
};

const ITEMS_PER_PAGE = 20;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getServiceLabel(value: string): string {
  return SERVICES.find((s) => s.value === value)?.label ?? value;
}

function getContractLabel(value: string): string {
  return CONTRACT_TYPES.find((c) => c.value === value)?.label ?? value;
}

function getLevelLabel(level: number): string {
  return SKILL_LEVELS.find((l) => l.value === level)?.label ?? `${level}`;
}

function getLevelColor(level: number): string {
  return SKILL_LEVELS.find((l) => l.value === level)?.color ?? "#94A3B8";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TechniciansPage() {
  const router = useRouter();

  // Data
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: ITEMS_PER_PAGE,
    total: 0,
    pages: 0,
  });
  const [companies, setCompanies] = useState<Company[]>([]);
  const [skillCategories, setSkillCategories] = useState<SkillCategory[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [service, setService] = useState("");
  const [contractType, setContractType] = useState("");
  const [skillCategoryId, setSkillCategoryId] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  // Selection multiple + actions groupees
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modules, setModules] = useState<{ id: string; title: string }[]>([]);
  const [bulkProjectOpen, setBulkProjectOpen] = useState(false);
  const [bulkFormationOpen, setBulkFormationOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({ title: "", description: "", moduleId: "" });
  const [bulkSaving, setBulkSaving] = useState(false);

  function toggleSel(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch reference data once
  useEffect(() => {
    Promise.all([
      fetch("/api/companies").then((r) => r.json()),
      fetch("/api/skills/categories").then((r) => r.json()),
      fetch("/api/tags").then((r) => r.json()),
    ]).then(([companiesData, categoriesData, tagsData]) => {
      setCompanies(companiesData);
      setSkillCategories(categoriesData);
      setAllTags((tagsData as { name: string }[]).map((t) => t.name));
    });
    fetch("/api/training/modules")
      .then((r) => r.json())
      .then((d: { id: string; title: string }[]) => setModules(d))
      .catch(() => {});
  }, []);

  // Actions groupees
  async function bulkCreateProject() {
    if (!bulkForm.title.trim() || selected.size === 0) return;
    setBulkSaving(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: bulkForm.title,
        description: bulkForm.description,
        technicianIds: [...selected],
      }),
    });
    setBulkSaving(false);
    if (res.ok) {
      const p = await res.json();
      router.push(`/projets/${p.id}`);
    }
  }
  async function bulkProposeFormation() {
    if (!bulkForm.moduleId || selected.size === 0) return;
    setBulkSaving(true);
    await Promise.all(
      [...selected].map((technicianId) =>
        fetch("/api/training/assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ technicianId, moduleId: bulkForm.moduleId, status: "propose" }),
        })
      )
    );
    setBulkSaving(false);
    setBulkFormationOpen(false);
    setBulkForm({ title: "", description: "", moduleId: "" });
    setSelected(new Set());
  }

  // Fetch technicians
  const fetchTechnicians = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (companyId) params.set("companyId", companyId);
    if (service) params.set("service", service);
    if (contractType) params.set("contractType", contractType);
    if (tagFilter) params.set("tag", tagFilter);
    if (availabilityFilter) params.set("availability", availabilityFilter);
    params.set("isActive", String(isActive));
    params.set("page", String(page));
    params.set("limit", String(ITEMS_PER_PAGE));

    // If a skill category is selected, we pass all skill ids from that category
    // The API supports skillId filter; we pick the first skill as a proxy for
    // category-based filtering. A better approach would be server-side category
    // filter, but for now we handle it client-side after fetch.
    // NOTE: we do NOT pass skillId to the API here -- we filter client-side by category.

    try {
      const res = await fetch(`/api/technicians?${params.toString()}`);
      const data = await res.json();
      setTechnicians(data.data ?? []);
      setPagination(data.pagination ?? { page: 1, limit: ITEMS_PER_PAGE, total: 0, pages: 0 });
    } catch {
      setTechnicians([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, companyId, service, contractType, tagFilter, availabilityFilter, isActive, page]);

  useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, companyId, service, contractType, skillCategoryId, tagFilter, availabilityFilter, isActive]);

  // Client-side skill category filter
  const filteredTechnicians = skillCategoryId
    ? technicians.filter((t) =>
        t.skills.some((s) => s.skill.category.id === skillCategoryId)
      )
    : technicians;

  // Valeurs du mini-radar par technicien (moyenne de niveau par famille)
  const radarValues = (tech: Technician) =>
    skillCategories.map((cat) => {
      const lv = tech.skills
        .filter((s) => s.skill.category.id === cat.id)
        .map((s) => s.level);
      return lv.length ? lv.reduce((a, b) => a + b, 0) / lv.length : 0;
    });

  // Clear all filters
  function clearFilters() {
    setSearch("");
    setCompanyId("");
    setService("");
    setContractType("");
    setSkillCategoryId("");
    setTagFilter("");
    setAvailabilityFilter("");
    setIsActive(true);
    setPage(1);
  }

  const hasFilters =
    search !== "" ||
    companyId !== "" ||
    service !== "" ||
    contractType !== "" ||
    tagFilter !== "" ||
    availabilityFilter !== "" ||
    skillCategoryId !== "" ||
    !isActive;

  // Delete handler
  async function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer le technicien ${name} ?`)) return;
    await fetch(`/api/technicians/${id}`, { method: "DELETE" });
    fetchTechnicians();
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-50">Techniciens</h1>
            <p className="text-sm text-slate-400">
              {pagination.total} technicien{pagination.total !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href="/api/export?format=csv" download>
              <Download className="w-4 h-4 mr-2" />
              Exporter CSV
            </a>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/technicians/import">
              <Upload className="w-4 h-4 mr-2" />
              Importer CSV
            </Link>
          </Button>
          <Button asChild>
            <Link href="/technicians/new">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau technicien
            </Link>
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Rechercher par nom ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Company */}
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Entreprise" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Service */}
            <Select value={service} onValueChange={setService}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Service" />
              </SelectTrigger>
              <SelectContent>
                {SERVICES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Contract type */}
            <Select value={contractType} onValueChange={setContractType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Contrat" />
              </SelectTrigger>
              <SelectContent>
                {CONTRACT_TYPES.map((ct) => (
                  <SelectItem key={ct.value} value={ct.value}>
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: ct.color }}
                      />
                      {ct.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Skill category */}
            <Select value={skillCategoryId} onValueChange={setSkillCategoryId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Competences" />
              </SelectTrigger>
              <SelectContent>
                {skillCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      {cat.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Tag filter */}
            {allTags.length > 0 && (
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Etiquette" />
                </SelectTrigger>
                <SelectContent>
                  {allTags.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Availability filter */}
            <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Disponibilite" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABILITY.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: a.color }} />
                      {a.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Active toggle */}
            <div className="flex items-center gap-2">
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <span className="text-sm text-slate-400">
                {isActive ? "Actifs" : "Inactifs"}
              </span>
            </div>

            {/* Clear filters */}
            {hasFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="w-4 h-4 mr-1" />
                Effacer filtres
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Barre d'actions groupees */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-700/50 bg-blue-950/30 px-4 py-2.5 flex-wrap">
          <span className="text-sm text-slate-200">
            <strong>{selected.size}</strong> technicien{selected.size > 1 ? "s" : ""} selectionne{selected.size > 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => { setBulkForm((f) => ({ ...f, title: "", description: "" })); setBulkProjectOpen(true); }}>
              Creer un projet
            </Button>
            <Button size="sm" variant="outline" disabled={modules.length === 0} onClick={() => { setBulkForm((f) => ({ ...f, moduleId: "" })); setBulkFormationOpen(true); }}>
              Proposer une formation
            </Button>
            <a
              href={`/api/export?format=csv${companyId ? `&companyId=${companyId}` : ""}`}
              download
              className="text-sm text-amber-400 hover:underline px-2"
            >
              Exporter
            </a>
            <Button size="sm" variant="ghost" className="text-slate-400" onClick={() => setSelected(new Set())}>
              Deselectionner
            </Button>
          </div>
        </div>
      )}

      {/* Bascule tableau / cartes */}
      <div className="flex justify-end">
        <div className="inline-flex rounded-lg border border-slate-700 overflow-hidden">
          <button
            onClick={() => setViewMode("table")}
            className={`px-2.5 py-1.5 ${viewMode === "table" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}
            title="Vue tableau"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("cards")}
            className={`px-2.5 py-1.5 ${viewMode === "cards" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}
            title="Vue cartes"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      {viewMode === "table" ? (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <input
                    type="checkbox"
                    className="accent-blue-600"
                    checked={
                      filteredTechnicians.length > 0 &&
                      filteredTechnicians.every((t) => selected.has(t.id))
                    }
                    onChange={() =>
                      setSelected((s) => {
                        const allSel = filteredTechnicians.every((t) => s.has(t.id));
                        const n = new Set(s);
                        filteredTechnicians.forEach((t) =>
                          allSel ? n.delete(t.id) : n.add(t.id)
                        );
                        return n;
                      })
                    }
                  />
                </TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Entreprise</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Contrat</TableHead>
                <TableHead>Competences</TableHead>
                <TableHead>Certifications</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filteredTechnicians.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                    Aucun technicien trouve
                  </TableCell>
                </TableRow>
              ) : (
                filteredTechnicians.map((tech) => {
                  const contractColor = CONTRACT_COLOR[tech.contractType] ?? "#94A3B8";
                  const activeCerts = tech.certifications.filter(
                    (c) => c.status === "active"
                  );
                  const topSkills = [...tech.skills]
                    .sort((a, b) => b.level - a.level)
                    .slice(0, 3);

                  return (
                    <TableRow
                      key={tech.id}
                      className="cursor-pointer hover:bg-slate-800/50"
                      onClick={() => router.push(`/technicians/${tech.id}`)}
                    >
                      {/* Select */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="accent-blue-600"
                          checked={selected.has(tech.id)}
                          onChange={() => toggleSel(tech.id)}
                        />
                      </TableCell>

                      {/* Name */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-1 h-10 rounded-full"
                            style={{ backgroundColor: tech.company.color }}
                          />
                          <div>
                            <div className="font-medium text-slate-50 flex items-center gap-1.5">
                              {tech.firstName} {tech.lastName}
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: availabilityMeta(tech.availabilityStatus).color }}
                                title={availabilityMeta(tech.availabilityStatus).label}
                              />
                            </div>
                            <div className="text-sm text-slate-400">{tech.email}</div>
                            {tech.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {tech.tags.slice(0, 3).map((t) => (
                                  <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700/70 text-slate-300">
                                    {t.name}
                                  </span>
                                ))}
                                {tech.tags.length > 3 && (
                                  <span className="text-[10px] text-slate-500 self-center">+{tech.tags.length - 3}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Company */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: tech.company.color }}
                          />
                          <span className="text-sm text-slate-300">
                            {tech.company.name}
                          </span>
                        </div>
                      </TableCell>

                      {/* Service */}
                      <TableCell>
                        <span className="text-sm text-slate-300">
                          {getServiceLabel(tech.service)}
                        </span>
                      </TableCell>

                      {/* Contract */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: contractColor,
                            color: contractColor,
                          }}
                        >
                          {getContractLabel(tech.contractType)}
                        </Badge>
                      </TableCell>

                      {/* Skills (top 3) */}
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {topSkills.length === 0 && (
                            <span className="text-xs text-slate-500">--</span>
                          )}
                          {topSkills.map((ts) => (
                            <Badge
                              key={ts.id}
                              variant="secondary"
                              className="text-[11px] gap-1"
                              style={{
                                borderLeft: `3px solid ${ts.skill.category.color}`,
                              }}
                            >
                              {ts.skill.name}
                              <span
                                className="inline-block w-1.5 h-1.5 rounded-full ml-0.5"
                                style={{ backgroundColor: getLevelColor(ts.level) }}
                                title={getLevelLabel(ts.level)}
                              />
                            </Badge>
                          ))}
                          {tech.skills.length > 3 && (
                            <span className="text-xs text-slate-500 self-center ml-1">
                              +{tech.skills.length - 3}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Certifications */}
                      <TableCell>
                        {activeCerts.length > 0 ? (
                          <Badge
                            variant="secondary"
                            style={{
                              color: activeCerts[0].certification.color,
                            }}
                          >
                            {activeCerts.length} cert.
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-500">--</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/technicians/${tech.id}`);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Voir
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/technicians/${tech.id}/edit`);
                              }}
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-400 focus:text-red-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(
                                  tech.id,
                                  `${tech.firstName} ${tech.lastName}`
                                );
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? (
            <p className="col-span-full text-center py-12 text-slate-400">Chargement...</p>
          ) : filteredTechnicians.length === 0 ? (
            <p className="col-span-full text-center py-12 text-slate-400">Aucun technicien trouve</p>
          ) : (
            filteredTechnicians.map((tech) => {
              const activeCerts = tech.certifications.filter((c) => c.status === "active");
              const contractColor = CONTRACT_COLOR[tech.contractType] ?? "#94A3B8";
              return (
                <Link
                  key={tech.id}
                  href={`/technicians/${tech.id}`}
                  className="rounded-xl border border-slate-700/60 bg-slate-900 p-4 hover:border-slate-600 transition-colors flex gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-slate-50 truncate">
                        {tech.firstName} {tech.lastName}
                      </span>
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: availabilityMeta(tech.availabilityStatus).color }}
                        title={availabilityMeta(tech.availabilityStatus).label}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-400 mt-0.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: tech.company.color }} />
                      <span className="truncate">{tech.company.name}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{getServiceLabel(tech.service)}</div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <Badge variant="outline" className="text-[10px]" style={{ color: contractColor, borderColor: contractColor + "55" }}>
                        {tech.contractType}
                      </Badge>
                      {activeCerts.length > 0 && (
                        <span className="text-[10px] text-slate-400">{activeCerts.length} cert.</span>
                      )}
                      {tech.tags.slice(0, 2).map((t) => (
                        <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700/70 text-slate-300">
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex-shrink-0 self-center">
                    <MiniRadar values={radarValues(tech)} color={tech.company.color} size={72} />
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Page {pagination.page} sur {pagination.pages} ({pagination.total} resultats)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Precedent
            </Button>
            {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => {
              let pageNum: number;
              if (pagination.pages <= 7) {
                pageNum = i + 1;
              } else if (page <= 4) {
                pageNum = i + 1;
              } else if (page >= pagination.pages - 3) {
                pageNum = pagination.pages - 6 + i;
              } else {
                pageNum = page - 3 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? "default" : "outline"}
                  size="sm"
                  className="w-9"
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pagination.pages}
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

      {/* Dialog : creer un projet avec la selection */}
      <Dialog open={bulkProjectOpen} onOpenChange={setBulkProjectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Creer un projet ({selected.size} technicien{selected.size > 1 ? "s" : ""})</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Titre *</Label>
              <Input value={bulkForm.title} onChange={(e) => setBulkForm((f) => ({ ...f, title: e.target.value }))} placeholder="ex: Equipe festival ete" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={3} value={bulkForm.description} onChange={(e) => setBulkForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={bulkCreateProject} disabled={bulkSaving || !bulkForm.title.trim()}>Creer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog : proposer une formation a la selection */}
      <Dialog open={bulkFormationOpen} onOpenChange={setBulkFormationOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Proposer une formation ({selected.size} technicien{selected.size > 1 ? "s" : ""})</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Module</Label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-50 text-sm"
                value={bulkForm.moduleId}
                onChange={(e) => setBulkForm((f) => ({ ...f, moduleId: e.target.value }))}
              >
                <option value="">Selectionner un module...</option>
                {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </div>
            <p className="text-xs text-slate-400">Une affectation « Propose » sera creee pour chaque technicien selectionne.</p>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={bulkProposeFormation} disabled={bulkSaving || !bulkForm.moduleId}>Proposer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
