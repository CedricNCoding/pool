"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

const InterventionMap = dynamic(() => import("@/components/InterventionMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[360px] rounded-lg border border-slate-700 bg-slate-800 flex items-center justify-center text-slate-500 text-sm">
      Chargement de la carte...
    </div>
  ),
});
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Pencil,
  Printer,
  Award,
  Wrench,
  MapPin,
  User,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
} from "lucide-react";
import TechnicianDocuments from "@/components/TechnicianDocuments";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import {
  SKILL_LEVELS,
  SKILL_LEVEL_NONE,
  CONTRACT_TYPES,
  SERVICES,
  CERT_CATEGORIES,
} from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SkillCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  // Present quand la categorie vient de /api/skills/categories (catalogue complet)
  skills?: { id: string; name: string }[];
}

interface SkillHistoryEntry {
  id: string;
  skillId: string;
  level: number;
  recordedAt: string;
  skill: { name: string; category: { name: string; color: string } };
}

interface SkillDef {
  id: string;
  name: string;
  category: SkillCategory;
}

interface TechSkill {
  id: string;
  skillId: string;
  level: number;
  skill: SkillDef;
}

interface CertDef {
  id: string;
  name: string;
  issuer: string;
  category: string;
  color: string;
  level: string;
}

interface TechCert {
  id: string;
  certificationId: string;
  obtainedDate: string;
  expiryDate: string | null;
  certificateNumber: string | null;
  status: string;
  certification: CertDef;
}

interface Technician {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  service: string;
  contractType: string;
  contractStart: string | null;
  contractEnd: string | null;
  isActive: boolean;
  departureDate: string | null;
  scheduledDeletionDate: string | null;
  notes: string | null;
  createdAt: string;
  interventionCenterLat: number | null;
  interventionCenterLng: number | null;
  interventionRadiusKm: number;
  company: { id: string; name: string; color: string; city: string | null };
  agency: { id: string; name: string; city: string | null } | null;
  skills: TechSkill[];
  certifications: TechCert[];
  tags: { id: string; name: string; color: string }[];
}

interface CertOption {
  id: string;
  name: string;
  issuer: string;
  category: string;
  color: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(d: string | null | undefined): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("fr-FR");
}

function daysUntil(d: string): number {
  return Math.ceil(
    (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

function contractBadgeStyle(ct: string) {
  const c = CONTRACT_TYPES.find((t) => t.value === ct);
  if (!c) return {};
  return {
    backgroundColor: c.color + "20",
    color: c.color,
    borderColor: c.color + "40",
  };
}

function serviceLabel(s: string) {
  return SERVICES.find((sv) => sv.value === s)?.label ?? s;
}

function certCategoryLabel(c: string) {
  return CERT_CATEGORIES.find((cc) => cc.value === c)?.label ?? c;
}

function certCategoryColor(c: string) {
  return CERT_CATEGORIES.find((cc) => cc.value === c)?.color ?? "#6366F1";
}

// Radar axes = les VRAIES familles (catalogue complet), une par famille dans
// l'ordre, calculees a partir des niveaux EDITES (skillEdits) -> le radar suit
// le barometre en direct et reste aligne avec lui.
function buildRadarData(
  skillEdits: Record<string, number>,
  categories: SkillCategory[]
) {
  return categories.map((cat) => {
    // Moyenne sur les competences RENSEIGNEES (niveau 0 a 5). "Non renseigne"
    // (absent de skillEdits) est exclu ; un 0 explicite ("Aucune") compte.
    const levels = (cat.skills ?? [])
      .map((s) => skillEdits[s.id])
      .filter((l): l is number => l !== undefined);
    const avg = levels.length
      ? levels.reduce((a, b) => a + b, 0) / levels.length
      : 0;
    return {
      category: cat.name,
      level: Math.round(avg * 10) / 10,
      fullMark: 5,
    };
  });
}

// ---------------------------------------------------------------------------
// Skill level selector : "0/Aucune" + 5 paliers. level = null => non renseigne.
// Cliquer un palier l'attribue ; recliquer le palier actif efface (non renseigne).
// ---------------------------------------------------------------------------

function SkillLevelSelector({
  level,
  onPick,
}: {
  level: number | null;
  onPick: (l: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        title={`${SKILL_LEVEL_NONE.label} (0)${level === 0 ? " - recliquer pour effacer" : ""}`}
        onClick={() => onPick(0)}
        className="h-6 w-6 rounded-sm text-[10px] font-semibold transition-all hover:scale-110 cursor-pointer flex items-center justify-center border border-slate-700 flex-shrink-0"
        style={{
          backgroundColor: level === 0 ? SKILL_LEVEL_NONE.color : "#1E293B",
          color: level === 0 ? "#fff" : "#64748B",
        }}
      >
        0
      </button>
      {SKILL_LEVELS.map((sl) => (
        <button
          key={sl.value}
          type="button"
          title={`${sl.label}${level === sl.value ? " - recliquer pour effacer" : ""}`}
          onClick={() => onPick(sl.value)}
          className="h-6 flex-1 rounded-sm transition-all hover:scale-110 cursor-pointer"
          style={{
            backgroundColor:
              level != null && level >= 1 && level >= sl.value
                ? sl.color
                : "#334155",
            minWidth: 22,
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TechnicianDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [tech, setTech] = useState<Technician | null>(null);
  const [skillCategories, setSkillCategories] = useState<SkillCategory[]>([]);
  const [skillHistory, setSkillHistory] = useState<SkillHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Skills state (local editable copy). Une clef presente = competence
  // renseignee (niveau 0 a 5). Clef absente = "non renseigne".
  const [skillEdits, setSkillEdits] = useState<
    Record<string, number>
  >({});
  const [skillsDirty, setSkillsDirty] = useState(false);
  const [savingSkills, setSavingSkills] = useState(false);

  // Certifications dialog
  const [certOptions, setCertOptions] = useState<CertOption[]>([]);
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [newCert, setNewCert] = useState({
    certificationId: "",
    obtainedDate: "",
    expiryDate: "",
    certificateNumber: "",
  });
  const [savingCert, setSavingCert] = useState(false);

  // ------------------------------------------------------------------
  // Fetch technician
  // ------------------------------------------------------------------

  const fetchTech = useCallback(async () => {
    try {
      const res = await fetch(`/api/technicians/${id}`);
      if (!res.ok) {
        setError(res.status === 404 ? "Technicien introuvable" : "Erreur de chargement");
        return;
      }
      const data: Technician = await res.json();
      setTech(data);

      // Initialise skill edits from fetched data
      const edits: Record<string, number> = {};
      for (const s of data.skills) {
        edits[s.skillId] = s.level;
      }
      setSkillEdits(edits);
      setSkillsDirty(false);
    } catch {
      setError("Erreur reseau");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTech();
  }, [fetchTech]);

  // Fetch all cert options for the dialog dropdown
  useEffect(() => {
    fetch("/api/certifications")
      .then((r) => r.json())
      .then(setCertOptions)
      .catch(() => {});
  }, []);

  // Familles de competences (axes du radar, dans l'ordre)
  useEffect(() => {
    fetch("/api/skills/categories")
      .then((r) => r.json())
      .then(setSkillCategories)
      .catch(() => {});
  }, []);

  // Historique d'evolution des competences
  const fetchHistory = useCallback(() => {
    fetch(`/api/technicians/${id}/skills`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setSkillHistory)
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // ------------------------------------------------------------------
  // Skill actions
  // ------------------------------------------------------------------

  // Clic sur un palier : l'attribue ; reclic sur le palier actif => efface
  // (la competence repasse en "non renseigne").
  function handleSkillPick(skillId: string, value: number) {
    setSkillEdits((prev) => {
      if (prev[skillId] === value) {
        const next = { ...prev };
        delete next[skillId];
        return next;
      }
      return { ...prev, [skillId]: value };
    });
    setSkillsDirty(true);
  }

  async function saveSkills() {
    if (!tech) return;
    setSavingSkills(true);
    // On envoie toutes les competences RENSEIGNEES (niveau 0 a 5). Le PUT
    // remplace tout : celles effacees (absentes de skillEdits) sont retirees.
    const payload = Object.entries(skillEdits).map(([skillId, level]) => ({
      skillId,
      level,
    }));

    try {
      const res = await fetch(`/api/technicians/${id}/skills`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills: payload }),
      });
      if (res.ok) {
        await fetchTech();
        fetchHistory();
      }
    } catch {
      // silent
    } finally {
      setSavingSkills(false);
    }
  }

  // ------------------------------------------------------------------
  // Certification actions
  // ------------------------------------------------------------------

  async function addCertification() {
    if (!newCert.certificationId || !newCert.obtainedDate) return;
    setSavingCert(true);
    try {
      const res = await fetch(`/api/technicians/${id}/certifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          certificationId: newCert.certificationId,
          obtainedDate: newCert.obtainedDate,
          expiryDate: newCert.expiryDate || null,
          certificateNumber: newCert.certificateNumber || null,
        }),
      });
      if (res.ok) {
        setCertDialogOpen(false);
        setNewCert({ certificationId: "", obtainedDate: "", expiryDate: "", certificateNumber: "" });
        await fetchTech();
      }
    } catch {
      // silent
    } finally {
      setSavingCert(false);
    }
  }

  async function removeCertification(certificationId: string) {
    try {
      await fetch(`/api/technicians/${id}/certifications`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificationId }),
      });
      await fetchTech();
    } catch {
      // silent
    }
  }

  // ------------------------------------------------------------------
  // Loading / Error states
  // ------------------------------------------------------------------

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 text-sm">Chargement...</div>
      </div>
    );
  }

  if (error || !tech) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/technicians">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <span className="text-red-400">{error || "Introuvable"}</span>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Derived data
  // ------------------------------------------------------------------

  const fullName = `${tech.firstName} ${tech.lastName}`;
  const contractMeta = CONTRACT_TYPES.find((c) => c.value === tech.contractType);

  // Radar data (calcule depuis les niveaux edites + le catalogue complet)
  const radarData = buildRadarData(skillEdits, skillCategories);

  // Historique groupe par competence, progression chronologique (plus recent en tete)
  const historyBySkill = (() => {
    const map = new Map<
      string,
      {
        skillName: string;
        categoryName: string;
        color: string;
        entries: { level: number; recordedAt: string }[];
      }
    >();
    for (const h of skillHistory) {
      let g = map.get(h.skillId);
      if (!g) {
        g = {
          skillName: h.skill.name,
          categoryName: h.skill.category.name,
          color: h.skill.category.color,
          entries: [],
        };
        map.set(h.skillId, g);
      }
      g.entries.push({ level: h.level, recordedAt: h.recordedAt });
    }
    return Array.from(map.values()).sort((a, b) => {
      const la = a.entries[a.entries.length - 1]?.recordedAt ?? "";
      const lb = b.entries[b.entries.length - 1]?.recordedAt ?? "";
      return lb.localeCompare(la);
    });
  })();

  function levelLabel(n: number): string {
    if (n === 0) return SKILL_LEVEL_NONE.label;
    return SKILL_LEVELS.find((l) => l.value === n)?.label ?? `${n}`;
  }
  function levelColor(n: number): string {
    if (n === 0) return SKILL_LEVEL_NONE.color;
    return SKILL_LEVELS.find((l) => l.value === n)?.color ?? "#64748B";
  }

  // Certs grouped by category
  const certsByCategory: Record<string, TechCert[]> = {};
  for (const c of tech.certifications) {
    const cat = c.certification.category;
    if (!certsByCategory[cat]) certsByCategory[cat] = [];
    certsByCategory[cat].push(c);
  }

  // Available certs not yet held (for dialog dropdown)
  const heldCertIds = new Set(tech.certifications.map((c) => c.certificationId));
  const availableCerts = certOptions.filter((c) => !heldCertIds.has(c.id));

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          nav, aside, .no-print { display: none !important; }
          body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-break { page-break-inside: avoid; }
          * { color-adjust: exact !important; }
        }
      `}</style>

      <div className="p-8 max-w-6xl mx-auto space-y-6">
        {/* ============================================================= */}
        {/* HEADER                                                        */}
        {/* ============================================================= */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Link href="/technicians" className="no-print">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">{fullName}</h1>
                <Badge
                  variant="outline"
                  style={{
                    backgroundColor: tech.isActive ? "#10B98120" : "#EF444420",
                    color: tech.isActive ? "#10B981" : "#EF4444",
                    borderColor: tech.isActive ? "#10B98140" : "#EF444440",
                  }}
                >
                  {tech.isActive ? "Actif" : "Inactif"}
                </Badge>
              </div>

              <div className="flex items-center gap-2 mt-1 text-sm text-slate-400 flex-wrap">
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ backgroundColor: tech.company.color }}
                />
                <span>{tech.company.name}</span>
                {tech.agency && (
                  <>
                    <span className="text-slate-600">-</span>
                    <span>{tech.agency.name}</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-sm text-slate-300">
                  {serviceLabel(tech.service)}
                </span>
                <Badge
                  variant="outline"
                  style={contractBadgeStyle(tech.contractType)}
                >
                  {contractMeta?.label ?? tech.contractType}
                </Badge>
                {(tech.contractStart || tech.contractEnd) && (
                  <span className="text-xs text-slate-500">
                    {fmtDate(tech.contractStart)} - {fmtDate(tech.contractEnd)}
                  </span>
                )}
              </div>

              {tech.tags.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {tech.tags.map((t) => (
                    <span
                      key={t.id}
                      className="text-xs px-2 py-0.5 rounded-full bg-slate-700/70 text-slate-200"
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 no-print">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
            >
              <Printer className="w-4 h-4 mr-1" />
              Imprimer
            </Button>
            <Link href={`/technicians/${tech.id}/edit`}>
              <Button size="sm">
                <Pencil className="w-4 h-4 mr-1" />
                Modifier
              </Button>
            </Link>
          </div>
        </div>

        <Separator />

        {/* ============================================================= */}
        {/* TABS                                                          */}
        {/* ============================================================= */}
        <Tabs defaultValue="competences" className="w-full">
          <TabsList className="no-print">
            <TabsTrigger value="competences">
              <Wrench className="w-3.5 h-3.5 mr-1" />
              Competences
            </TabsTrigger>
            <TabsTrigger value="historique">
              <Clock className="w-3.5 h-3.5 mr-1" />
              Historique
            </TabsTrigger>
            <TabsTrigger value="certifications">
              <Award className="w-3.5 h-3.5 mr-1" />
              Certifications
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="w-3.5 h-3.5 mr-1" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="zone">
              <MapPin className="w-3.5 h-3.5 mr-1" />
              Zone d&apos;intervention
            </TabsTrigger>
            <TabsTrigger value="informations">
              <User className="w-3.5 h-3.5 mr-1" />
              Informations
            </TabsTrigger>
          </TabsList>

          {/* ----------------------------------------------------------- */}
          {/* TAB: Competences                                            */}
          {/* ----------------------------------------------------------- */}
          <TabsContent value="competences" className="space-y-6">
            {/* Radar chart */}
            <Card className="print-break">
              <CardHeader>
                <CardTitle>Profil de competences</CardTitle>
              </CardHeader>
              <CardContent>
                {radarData.length > 0 ? (
                  <div className="w-full h-[360px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        cx="50%"
                        cy="50%"
                        outerRadius="75%"
                        data={radarData}
                      >
                        <PolarGrid stroke="#334155" />
                        <PolarAngleAxis
                          dataKey="category"
                          tick={{ fill: "#CBD5E1", fontSize: 12 }}
                        />
                        <PolarRadiusAxis
                          angle={90}
                          domain={[0, 5]}
                          tickCount={6}
                          tick={{ fill: "#64748B", fontSize: 10 }}
                        />
                        <Radar
                          name="Niveau"
                          dataKey="level"
                          stroke="#1E40AF"
                          fill="#3B82F6"
                          fillOpacity={0.35}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    Aucune competence renseignee.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Skill barometer by category */}
            <Card className="print-break">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Barometre des competences</CardTitle>
                <Button
                  size="sm"
                  disabled={!skillsDirty || savingSkills}
                  onClick={saveSkills}
                  className="no-print"
                >
                  {savingSkills ? "Sauvegarde..." : "Mettre a jour les competences"}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-xs text-slate-500 -mt-2 no-print">
                  Echelle 0 a 5 (0 = Aucune). Cliquez un palier pour l&apos;attribuer ;
                  recliquez le palier actif pour l&apos;effacer (non renseigne). Pensez
                  a « Mettre a jour ».
                </p>
                {skillCategories.length === 0 && (
                  <p className="text-sm text-slate-500">
                    Chargement du referentiel...
                  </p>
                )}
                {/* Tout le catalogue : chaque famille + toutes ses competences,
                    meme celles non encore attribuees (niveau 0). */}
                {skillCategories.map((cat) => {
                  const catColor = cat.color ?? "#6366F1";
                  return (
                    <div key={cat.id}>
                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className="w-3 h-3 rounded-full inline-block"
                          style={{ backgroundColor: catColor }}
                        />
                        <h3
                          className="text-sm font-semibold"
                          style={{ color: catColor }}
                        >
                          {cat.name}
                        </h3>
                      </div>
                      <div className="space-y-2 pl-5">
                        {(cat.skills ?? []).map((skill) => {
                          const raw = skillEdits[skill.id];
                          const isSet = raw !== undefined;
                          const graded =
                            isSet && raw >= 1
                              ? SKILL_LEVELS.find((l) => l.value === raw)
                              : null;
                          const labelText = !isSet
                            ? "Non renseigne"
                            : raw === 0
                              ? SKILL_LEVEL_NONE.label
                              : graded?.label ?? "-";
                          const labelColor = !isSet
                            ? "#64748B"
                            : raw === 0
                              ? SKILL_LEVEL_NONE.color
                              : graded?.color ?? "#64748B";
                          return (
                            <div
                              key={skill.id}
                              className="flex items-center gap-4"
                            >
                              <span className="text-sm text-slate-300 w-48 truncate">
                                {skill.name}
                              </span>
                              <div className="w-56">
                                <SkillLevelSelector
                                  level={isSet ? raw : null}
                                  onPick={(l) => handleSkillPick(skill.id, l)}
                                />
                              </div>
                              <span
                                className="text-xs font-medium min-w-[100px]"
                                style={{ color: labelColor }}
                              >
                                {labelText}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ----------------------------------------------------------- */}
          {/* TAB: Historique                                             */}
          {/* ----------------------------------------------------------- */}
          <TabsContent value="historique" className="space-y-6">
            <Card className="print-break">
              <CardHeader>
                <CardTitle>Evolution des competences</CardTitle>
              </CardHeader>
              <CardContent>
                {historyBySkill.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Aucun historique pour l&apos;instant. Chaque modification de
                    niveau dans le barometre sera enregistree ici, avec sa date,
                    pour suivre la progression.
                  </p>
                ) : (
                  <div className="space-y-5">
                    {historyBySkill.map((h) => (
                      <div key={h.skillName} className="print-break">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                            style={{ backgroundColor: h.color }}
                          />
                          <span className="text-sm font-medium text-slate-200">
                            {h.skillName}
                          </span>
                          <span className="text-xs text-slate-500">
                            {h.categoryName}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap pl-5">
                          {h.entries.map((e, i) => (
                            <div key={i} className="flex items-center gap-1">
                              {i > 0 && (
                                <span className="text-slate-600 text-xs">→</span>
                              )}
                              <div className="flex flex-col items-center">
                                <Badge
                                  variant="outline"
                                  className="text-[11px]"
                                  style={{
                                    color: levelColor(e.level),
                                    borderColor: levelColor(e.level) + "55",
                                    backgroundColor: levelColor(e.level) + "15",
                                  }}
                                >
                                  {levelLabel(e.level)}
                                </Badge>
                                <span className="text-[10px] text-slate-500 mt-0.5">
                                  {fmtDate(e.recordedAt)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ----------------------------------------------------------- */}
          {/* TAB: Certifications                                         */}
          {/* ----------------------------------------------------------- */}
          <TabsContent value="certifications" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Certifications</h2>
              <Dialog open={certDialogOpen} onOpenChange={setCertDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="no-print">
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ajouter une certification</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm font-medium text-slate-300 block mb-1">
                        Certification
                      </label>
                      <select
                        className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-50 text-sm"
                        value={newCert.certificationId}
                        onChange={(e) =>
                          setNewCert((p) => ({
                            ...p,
                            certificationId: e.target.value,
                          }))
                        }
                      >
                        <option value="">Selectionner...</option>
                        {availableCerts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.issuer})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-300 block mb-1">
                        Date d&apos;obtention
                      </label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-50 text-sm"
                        value={newCert.obtainedDate}
                        onChange={(e) =>
                          setNewCert((p) => ({
                            ...p,
                            obtainedDate: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-300 block mb-1">
                        Date d&apos;expiration
                      </label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-50 text-sm"
                        value={newCert.expiryDate}
                        onChange={(e) =>
                          setNewCert((p) => ({
                            ...p,
                            expiryDate: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-300 block mb-1">
                        Numero de certificat
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-50 text-sm"
                        placeholder="Optionnel"
                        value={newCert.certificateNumber}
                        onChange={(e) =>
                          setNewCert((p) => ({
                            ...p,
                            certificateNumber: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Annuler</Button>
                    </DialogClose>
                    <Button
                      disabled={
                        savingCert ||
                        !newCert.certificationId ||
                        !newCert.obtainedDate
                      }
                      onClick={addCertification}
                    >
                      {savingCert ? "Ajout..." : "Ajouter"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {Object.entries(certsByCategory).length === 0 && (
              <p className="text-sm text-slate-500">
                Aucune certification renseignee.
              </p>
            )}

            {Object.entries(certsByCategory).map(([catKey, certs]) => (
              <Card key={catKey} className="print-break">
                <CardHeader>
                  <CardTitle
                    className="text-sm flex items-center gap-2"
                    style={{ color: certCategoryColor(catKey) }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: certCategoryColor(catKey) }}
                    />
                    {certCategoryLabel(catKey)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {certs.map((tc) => {
                    const days = tc.expiryDate ? daysUntil(tc.expiryDate) : null;
                    const isExpired = days !== null && days < 0;
                    const isExpiringSoon = days !== null && days >= 0 && days <= 60;
                    const isActive = !isExpired && !isExpiringSoon;

                    let statusColor = "#10B981";
                    let StatusIcon = CheckCircle;
                    let statusLabel = "Active";
                    if (isExpired) {
                      statusColor = "#EF4444";
                      StatusIcon = AlertTriangle;
                      statusLabel = "Expiree";
                    } else if (isExpiringSoon) {
                      statusColor = "#F59E0B";
                      StatusIcon = Clock;
                      statusLabel = `Expire dans ${days}j`;
                    }

                    return (
                      <div
                        key={tc.id}
                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-800/50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-200">
                              {tc.certification.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-xs"
                              style={{
                                color: statusColor,
                                borderColor: statusColor + "40",
                                backgroundColor: statusColor + "15",
                              }}
                            >
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {statusLabel}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span>{tc.certification.issuer}</span>
                            <span>Obtenu le {fmtDate(tc.obtainedDate)}</span>
                            {tc.expiryDate && (
                              <span>Expire le {fmtDate(tc.expiryDate)}</span>
                            )}
                            {tc.certificateNumber && (
                              <span>N. {tc.certificateNumber}</span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="no-print text-slate-500 hover:text-red-400"
                          onClick={() =>
                            removeCertification(tc.certificationId)
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ----------------------------------------------------------- */}
          {/* TAB: Documents (coffre-fort)                                 */}
          {/* ----------------------------------------------------------- */}
          <TabsContent value="documents" className="space-y-6">
            <TechnicianDocuments technicianId={tech.id} />
          </TabsContent>

          {/* ----------------------------------------------------------- */}
          {/* TAB: Zone d'intervention                                    */}
          {/* ----------------------------------------------------------- */}
          <TabsContent value="zone" className="space-y-6">
            <Card className="print-break">
              <CardHeader>
                <CardTitle>Zone d&apos;intervention</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="w-full h-[360px] rounded-lg border border-slate-700 overflow-hidden">
                  {tech.interventionCenterLat && tech.interventionCenterLng ? (
                    <InterventionMap
                      lat={tech.interventionCenterLat}
                      lng={tech.interventionCenterLng}
                      radiusKm={tech.interventionRadiusKm}
                      name={fullName}
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-500 text-sm">
                      Coordonnees non renseignees
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-800 rounded-lg p-4">
                    <p className="text-xs text-slate-500 mb-1">Latitude</p>
                    <p className="text-sm font-medium">
                      {tech.interventionCenterLat ?? "-"}
                    </p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-4">
                    <p className="text-xs text-slate-500 mb-1">Longitude</p>
                    <p className="text-sm font-medium">
                      {tech.interventionCenterLng ?? "-"}
                    </p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-4">
                    <p className="text-xs text-slate-500 mb-1">
                      Rayon d&apos;intervention
                    </p>
                    <p className="text-sm font-medium">
                      {tech.interventionRadiusKm} km
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ----------------------------------------------------------- */}
          {/* TAB: Informations                                           */}
          {/* ----------------------------------------------------------- */}
          <TabsContent value="informations" className="space-y-6">
            <Card className="print-break">
              <CardHeader>
                <CardTitle>Coordonnees</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                  <div>
                    <dt className="text-xs text-slate-500">Email</dt>
                    <dd className="text-sm">{tech.email}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Telephone</dt>
                    <dd className="text-sm">{tech.phone || "-"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Entreprise</dt>
                    <dd className="text-sm flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: tech.company.color }}
                      />
                      {tech.company.name}
                      {tech.company.city && (
                        <span className="text-slate-500">
                          ({tech.company.city})
                        </span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Agence</dt>
                    <dd className="text-sm">
                      {tech.agency ? (
                        <>
                          {tech.agency.name}
                          {tech.agency.city && (
                            <span className="text-slate-500">
                              {" "}
                              ({tech.agency.city})
                            </span>
                          )}
                        </>
                      ) : (
                        "Siege"
                      )}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {tech.notes && (
              <Card className="print-break">
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">
                    {tech.notes}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="print-break">
              <CardHeader>
                <CardTitle>RGPD</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-4">
                  <div>
                    <dt className="text-xs text-slate-500">
                      Date de creation
                    </dt>
                    <dd className="text-sm">{fmtDate(tech.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">
                      Date de depart
                    </dt>
                    <dd className="text-sm">
                      {tech.departureDate ? fmtDate(tech.departureDate) : "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">
                      Suppression programmee
                    </dt>
                    <dd className="text-sm">
                      {tech.scheduledDeletionDate ? (
                        <span className="text-amber-400">
                          {fmtDate(tech.scheduledDeletionDate)}
                        </span>
                      ) : (
                        "-"
                      )}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
