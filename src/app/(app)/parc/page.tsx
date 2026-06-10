"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useFetch } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Users, Award, FileText, AlertTriangle, ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SERVICES } from "@/lib/constants";
import { docCategoryLabel } from "@/lib/dossier";
import TrendsCharts from "@/components/TrendsCharts";
import CoverageMap from "@/components/CoverageMap";

interface Analytics {
  totalActive: number;
  skillCoverage: { name: string; color: string; techCount: number; pct: number }[];
  rareSkills: { name: string; family: string; color: string; holders: number }[];
  incompleteDossiers: { id: string; name: string; service: string; missing: string[] }[];
  expiringCerts: number;
  expiringDocs: number;
}

function serviceLabel(v: string) {
  return SERVICES.find((s) => s.value === v)?.label ?? v;
}

function Stat({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-ink-500">{label}</p>
          <p className="mt-1 text-3xl font-bold text-ink-900">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg" style={{ backgroundColor: color + "20" }}>
          <Icon className="h-6 w-6" style={{ color }} />
        </div>
      </CardContent>
    </Card>
  );
}

type DossierSort = "name" | "service" | "missing";
const DOSSIER_PAGE = 12;

export default function ParcPage() {
  const { data, loading } = useFetch<Analytics>("/api/analytics");
  const [dq, setDq] = useState("");
  const [sortKey, setSortKey] = useState<DossierSort>("missing");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [dPage, setDPage] = useState(1);

  const dossiers = useMemo(() => {
    const term = dq.trim().toLowerCase();
    const list = (data?.incompleteDossiers ?? []).filter(
      (t) =>
        t.name.toLowerCase().includes(term) ||
        serviceLabel(t.service).toLowerCase().includes(term)
    );
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "service") cmp = serviceLabel(a.service).localeCompare(serviceLabel(b.service));
      else cmp = a.missing.length - b.missing.length;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, dq, sortKey, sortDir]);

  function toggleSort(key: DossierSort) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "missing" ? "desc" : "asc");
    }
    setDPage(1);
  }

  const dossierPages = Math.max(1, Math.ceil(dossiers.length / DOSSIER_PAGE));
  const pageDossiers = dossiers.slice((dPage - 1) * DOSSIER_PAGE, dPage * DOSSIER_PAGE);

  if (loading || !data) {
    return <div className="p-8 text-ink-500">Analyse de l&apos;equipe...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="w-6 h-6 text-ink-600" />
        <h1 className="text-2xl font-bold">Sante de l&apos;equipe</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat label="Techniciens actifs" value={data.totalActive} icon={Users} color="#3B82F6" />
        <Stat label="Certifs a renouveler (90j)" value={data.expiringCerts} icon={Award} color="#10B981" />
        <Stat label="Documents a renouveler (90j)" value={data.expiringDocs} icon={FileText} color="#06B6D4" />
        <Stat label="Dossiers incomplets" value={data.incompleteDossiers.length} icon={AlertTriangle} color={data.incompleteDossiers.length > 0 ? "#F59E0B" : "#10B981"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Couverture par famille */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Couverture par famille de competences</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.skillCoverage.map((c) => (
              <div key={c.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span style={{ color: c.color }}>{c.name}</span>
                  <span className="text-ink-500">{c.techCount} tech ({c.pct}%)</span>
                </div>
                <div className="h-2 rounded-full bg-white overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${c.pct}%`, backgroundColor: c.color }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Competences rares */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Competences les plus rares</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {data.rareSkills.map((s) => (
                <div key={s.name} className="flex items-center justify-between text-sm py-1">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                    {s.name}
                    <span className="text-xs text-ink-9000">{s.family}</span>
                  </span>
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={s.holders === 0
                      ? { color: "#EF4444", borderColor: "#EF444455" }
                      : { color: "#94A3B8", borderColor: "#94A3B855" }}
                  >
                    {s.holders === 0 ? "aucun tech" : `${s.holders} tech`}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dossiers incomplets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Dossiers incomplets
            <Badge variant="secondary">{data.incompleteDossiers.length}</Badge>
          </CardTitle>
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-9000" />
            <Input
              className="pl-8 h-9 text-sm"
              placeholder="Filtrer (nom, service)..."
              value={dq}
              onChange={(e) => { setDq(e.target.value); setDPage(1); }}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {dossiers.length === 0 ? (
            <p className="p-5 text-sm text-ink-9000">
              {data.incompleteDossiers.length === 0 ? "Tous les dossiers sont complets." : "Aucun resultat."}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-ink-500 border-b border-ink-900/10">
                <tr>
                  {([["name", "Technicien"], ["service", "Service"], ["missing", "Documents manquants"]] as [DossierSort, string][]).map(([key, label]) => (
                    <th key={key} className="text-left py-2 px-4">
                      <button onClick={() => toggleSort(key)} className="flex items-center gap-1 hover:text-ink-800">
                        {label}
                        <ArrowUpDown className={`w-3 h-3 ${sortKey === key ? "text-ink-800" : "text-ink-500"}`} />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageDossiers.map((t) => (
                  <tr key={t.id} className="border-b border-ink-900/10 hover:bg-paper-2">
                    <td className="py-2 px-4">
                      <Link href={`/technicians/${t.id}`} className="text-ink-900 hover:underline">{t.name}</Link>
                    </td>
                    <td className="py-2 px-4 text-ink-500">{serviceLabel(t.service)}</td>
                    <td className="py-2 px-4">
                      <div className="flex flex-wrap gap-1">
                        {t.missing.map((m) => (
                          <Badge key={m} variant="outline" className="text-[10px]" style={{ color: "#F59E0B", borderColor: "#F59E0B55" }}>
                            {docCategoryLabel(m)}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {dossiers.length > DOSSIER_PAGE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-ink-900/10 text-xs text-ink-500">
              <span>
                {(dPage - 1) * DOSSIER_PAGE + 1}–{Math.min(dPage * DOSSIER_PAGE, dossiers.length)} sur {dossiers.length}
              </span>
              <div className="flex items-center gap-2">
                <button disabled={dPage <= 1} onClick={() => setDPage((p) => p - 1)} className="p-1 rounded hover:bg-white disabled:opacity-30">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>{dPage} / {dossierPages}</span>
                <button disabled={dPage >= dossierPages} onClick={() => setDPage((p) => p + 1)} className="p-1 rounded hover:bg-white disabled:opacity-30">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <TrendsCharts />

      <CoverageMap />
    </div>
  );
}
