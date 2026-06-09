"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import { CONTRACT_TYPES, SERVICES, SKILL_LEVELS } from "@/lib/constants";

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
  isActive: boolean;
  company: { id: string; name: string; color: string };
  agency: { id: string; name: string; city: string } | null;
  skills: TechSkill[];
  certifications: TechCert[];
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
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [service, setService] = useState("");
  const [contractType, setContractType] = useState("");
  const [skillCategoryId, setSkillCategoryId] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [page, setPage] = useState(1);

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
    ]).then(([companiesData, categoriesData]) => {
      setCompanies(companiesData);
      setSkillCategories(categoriesData);
    });
  }, []);

  // Fetch technicians
  const fetchTechnicians = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (companyId) params.set("companyId", companyId);
    if (service) params.set("service", service);
    if (contractType) params.set("contractType", contractType);
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
  }, [debouncedSearch, companyId, service, contractType, isActive, page]);

  useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, companyId, service, contractType, skillCategoryId, isActive]);

  // Client-side skill category filter
  const filteredTechnicians = skillCategoryId
    ? technicians.filter((t) =>
        t.skills.some((s) => s.skill.category.id === skillCategoryId)
      )
    : technicians;

  // Clear all filters
  function clearFilters() {
    setSearch("");
    setCompanyId("");
    setService("");
    setContractType("");
    setSkillCategoryId("");
    setIsActive(true);
    setPage(1);
  }

  const hasFilters =
    search !== "" ||
    companyId !== "" ||
    service !== "" ||
    contractType !== "" ||
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
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-600">
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
            <Link href="/api/export?format=csv">
              <Download className="w-4 h-4 mr-2" />
              Exporter CSV
            </Link>
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
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
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filteredTechnicians.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400">
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
                      {/* Name */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-1 h-10 rounded-full"
                            style={{ backgroundColor: tech.company.color }}
                          />
                          <div>
                            <div className="font-medium text-slate-50">
                              {tech.firstName} {tech.lastName}
                            </div>
                            <div className="text-sm text-slate-400">{tech.email}</div>
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
    </div>
  );
}
