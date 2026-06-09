"use client";

import Link from "next/link";
import { useFetch } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Users, Award, FileText, AlertTriangle } from "lucide-react";
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
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-1 text-3xl font-bold text-slate-50">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg" style={{ backgroundColor: color + "20" }}>
          <Icon className="h-6 w-6" style={{ color }} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ParcPage() {
  const { data, loading } = useFetch<Analytics>("/api/analytics");

  if (loading || !data) {
    return <div className="p-8 text-slate-400">Analyse du parc...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="w-6 h-6 text-slate-300" />
        <h1 className="text-2xl font-bold">Sante du parc</h1>
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
                  <span className="text-slate-400">{c.techCount} tech ({c.pct}%)</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
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
                    <span className="text-xs text-slate-500">{s.family}</span>
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
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Dossiers incomplets
            <Badge variant="secondary">{data.incompleteDossiers.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.incompleteDossiers.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">Tous les dossiers sont complets.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-400 border-b border-slate-700">
                <tr>
                  <th className="text-left py-2 px-4">Technicien</th>
                  <th className="text-left py-2 px-4">Service</th>
                  <th className="text-left py-2 px-4">Documents manquants</th>
                </tr>
              </thead>
              <tbody>
                {data.incompleteDossiers.slice(0, 15).map((t) => (
                  <tr key={t.id} className="border-b border-slate-800 hover:bg-slate-800/40">
                    <td className="py-2 px-4">
                      <Link href={`/technicians/${t.id}`} className="text-slate-100 hover:underline">{t.name}</Link>
                    </td>
                    <td className="py-2 px-4 text-slate-400">{serviceLabel(t.service)}</td>
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
          {data.incompleteDossiers.length > 15 && (
            <p className="px-4 py-3 text-xs text-slate-500 border-t border-slate-800">
              et {data.incompleteDossiers.length - 15} autre(s) dossier(s) incomplet(s).
            </p>
          )}
        </CardContent>
      </Card>

      <TrendsCharts />

      <CoverageMap />
    </div>
  );
}
