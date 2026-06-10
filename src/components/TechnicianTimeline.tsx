"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, GraduationCap, Award, ClipboardList, Milestone } from "lucide-react";

interface Entry {
  date: string;
  kind: string;
  label: string;
  sub: string;
  color: string;
}

const ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  skill: TrendingUp,
  formation: GraduationCap,
  cert: Award,
  event: ClipboardList,
};

export default function TechnicianTimeline({
  technicianId,
  reloadKey = 0,
}: {
  technicianId: string;
  reloadKey?: number;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/technicians/${technicianId}/timeline`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [technicianId, reloadKey]);

  return (
    <Card className="print-break">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Milestone className="w-4 h-4" /> Frise d&apos;evolution
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loaded && entries.length === 0 ? (
          <p className="text-sm text-ink-9000">
            Aucun evenement de parcours pour l&apos;instant.
          </p>
        ) : (
          <div className="relative">
            <div className="absolute left-[7px] top-1 bottom-1 w-px bg-paper-2" />
            <div className="space-y-4">
              {entries.map((e, i) => {
                const Icon = ICON[e.kind] ?? Milestone;
                return (
                  <div key={i} className="relative flex gap-3 pl-0">
                    <span
                      className="relative z-10 mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: e.color }}
                    >
                      <Icon className="h-2.5 w-2.5 text-white" />
                    </span>
                    <div className="min-w-0 flex-1 -mt-0.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm font-medium text-ink-900 truncate">{e.label}</span>
                        <span className="text-xs text-ink-9000 whitespace-nowrap">
                          {new Date(e.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <span className="text-xs" style={{ color: e.color }}>{e.sub}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
