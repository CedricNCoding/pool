"use client";

import Link from "next/link";
import { useFetch } from "@/lib/hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Award, AlertTriangle, Building2, Clock } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface DashboardData {
  totalTechnicians: number;
  totalCompanies: number;
  activeCertifications: number;
  expiringSoon: number;
  expiringCertifications: {
    id: string;
    techId: string;
    techName: string;
    certName: string;
    expiryDate: string;
    daysLeft: number;
  }[];
  skillDistribution: { name: string; color: string; count: number }[];
  contractDistribution: { name: string; value: number }[];
  recentActivity: {
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    details: string | null;
    userName: string;
    createdAt: string;
  }[];
}

const CONTRACT_COLORS: Record<string, string> = {
  CDI: "#10B981",
  CDD: "#3B82F6",
  Interim: "#F59E0B",
  Freelance: "#8B5CF6",
};

const SKILL_COLORS: Record<string, string> = {
  Audio: "#EC4899",
  Video: "#3B82F6",
  Eclairage: "#F59E0B",
  Reseau: "#10B981",
  Integration: "#F97316",
  Controle: "#8B5CF6",
  Visio: "#06B6D4",
  Conception: "#6366F1",
};

const ACTION_LABELS: Record<string, string> = {
  create: "Creation",
  update: "Modification",
  delete: "Suppression",
  login: "Connexion",
  logout: "Deconnexion",
  export: "Export",
};

const ENTITY_LABELS: Record<string, string> = {
  technician: "Technicien",
  company: "Entreprise",
  certification: "Certification",
  skill: "Competence",
  agency: "Agence",
  user: "Utilisateur",
  api_key: "Cle API",
};

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400">{title}</p>
            <p className="mt-1 text-3xl font-bold text-slate-50">{value}</p>
          </div>
          <div
            className="flex h-12 w-12 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="h-6 w-6" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ExpiryBadge({ daysLeft }: { daysLeft: number }) {
  if (daysLeft <= 30) {
    return (
      <Badge className="border-transparent bg-red-500/20 text-red-400">
        {daysLeft}j
      </Badge>
    );
  }
  if (daysLeft <= 60) {
    return (
      <Badge className="border-transparent bg-orange-500/20 text-orange-400">
        {daysLeft}j
      </Badge>
    );
  }
  return (
    <Badge className="border-transparent bg-yellow-500/20 text-yellow-400">
      {daysLeft}j
    </Badge>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="animate-pulse">
          <div className="h-4 w-24 rounded bg-slate-700" />
          <div className="mt-3 h-8 w-16 rounded bg-slate-700" />
        </div>
      </CardContent>
    </Card>
  );
}

function CustomBarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-slate-200">{label}</p>
      <p className="text-slate-400">
        {payload[0].value} technicien{payload[0].value > 1 ? "s" : ""}
      </p>
    </div>
  );
}

function CustomPieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number }[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-slate-200">{payload[0].name}</p>
      <p className="text-slate-400">{payload[0].value} technicien{payload[0].value > 1 ? "s" : ""}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { data, loading, error } = useFetch<DashboardData>("/api/dashboard");

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-red-400" />
            <p className="mt-3 text-slate-400">
              Impossible de charger le tableau de bord
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-50">Tableau de bord</h1>
        <p className="mt-1 text-sm text-slate-400">
          Vue d&apos;ensemble de votre pool de techniciens
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : data ? (
          <>
            <StatCard
              title="Techniciens"
              value={data.totalTechnicians}
              icon={Users}
              color="#3B82F6"
            />
            <StatCard
              title="Certifications actives"
              value={data.activeCertifications}
              icon={Award}
              color="#10B981"
            />
            <StatCard
              title="Expirent sous 30j"
              value={data.expiringSoon}
              icon={AlertTriangle}
              color={data.expiringSoon > 0 ? "#EF4444" : "#6B7280"}
            />
            <StatCard
              title="Entreprises"
              value={data.totalCompanies}
              icon={Building2}
              color="#8B5CF6"
            />
          </>
        ) : null}
      </div>

      {/* Main grid: charts left, alerts right */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Left column: charts */}
        <div className="space-y-6 xl:col-span-2">
          {/* Skills distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-slate-50">
                Repartition des competences
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex h-72 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
                </div>
              ) : data && data.skillDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={data.skillDistribution}
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#334155"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#94A3B8", fontSize: 12 }}
                      axisLine={{ stroke: "#475569" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#94A3B8", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={<CustomBarTooltip />}
                      cursor={{ fill: "#1E293B" }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {data.skillDistribution.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={
                            SKILL_COLORS[entry.name] || entry.color || "#6366F1"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-12 text-center text-sm text-slate-500">
                  Aucune donnee disponible
                </p>
              )}
            </CardContent>
          </Card>

          {/* Contract types pie chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-slate-50">
                Types de contrats
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex h-72 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-blue-500" />
                </div>
              ) : data && data.contractDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.contractDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      stroke="none"
                    >
                      {data.contractDistribution.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={CONTRACT_COLORS[entry.name] || "#6B7280"}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      iconSize={10}
                      formatter={(value: string) => (
                        <span className="text-sm text-slate-300">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-12 text-center text-sm text-slate-500">
                  Aucune donnee disponible
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: alerts + activity */}
        <div className="space-y-6">
          {/* Certification expiry alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-slate-50">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                Certifications a renouveler
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 w-3/4 rounded bg-slate-700" />
                      <div className="mt-1 h-3 w-1/2 rounded bg-slate-700" />
                    </div>
                  ))}
                </div>
              ) : data && data.expiringCertifications.length > 0 ? (
                <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">
                  {data.expiringCertifications.map((cert) => (
                    <Link
                      key={cert.id}
                      href={`/technicians/${cert.techId}`}
                      className="flex items-start justify-between rounded-lg border border-slate-700/50 bg-slate-800/50 p-3 transition-colors hover:border-slate-600 hover:bg-slate-800"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-200">
                          {cert.techName}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {cert.certName}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Expire le{" "}
                          {new Date(cert.expiryDate).toLocaleDateString(
                            "fr-FR",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </p>
                      </div>
                      <div className="ml-3 flex-shrink-0">
                        <ExpiryBadge daysLeft={cert.daysLeft} />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Award className="mx-auto h-8 w-8 text-slate-600" />
                  <p className="mt-2 text-sm text-slate-500">
                    Aucune certification a renouveler prochainement
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-slate-50">
                <Clock className="h-5 w-5 text-blue-400" />
                Activite recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 w-full rounded bg-slate-700" />
                      <div className="mt-1 h-3 w-2/3 rounded bg-slate-700" />
                    </div>
                  ))}
                </div>
              ) : data && data.recentActivity.length > 0 ? (
                <div className="max-h-[460px] space-y-3 overflow-y-auto pr-1">
                  {data.recentActivity.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-lg border border-slate-700/50 bg-slate-800/50 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-200">
                          {log.userName}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-400">
                        {ENTITY_LABELS[log.entityType] || log.entityType}
                        {log.details ? ` — ${log.details}` : ""}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-600">
                        {new Date(log.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-slate-500">
                  Aucune activite recente
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
