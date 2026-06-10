"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";

interface Log {
  id: string;
  action: string;
  details: string | null;
  user: string;
  createdAt: string;
}

const ACTION: Record<string, { label: string; color: string }> = {
  create: { label: "Creation", color: "#10B981" },
  update: { label: "Modification", color: "#3B82F6" },
  delete: { label: "Suppression", color: "#EF4444" },
  reminder: { label: "Rappel", color: "#F59E0B" },
  login: { label: "Connexion", color: "#64748B" },
};

function actionMeta(a: string) {
  return ACTION[a] ?? { label: a, color: "#94A3B8" };
}

export default function AuditTrail({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: string;
}) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/audit?entityType=${entityType}&entityId=${entityId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [entityType, entityId]);

  if (loaded && logs.length === 0) return null;

  return (
    <Card className="print-break">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="w-4 h-4" /> Dernieres modifications
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {logs.map((l) => {
            const m = actionMeta(l.action);
            return (
              <div key={l.id} className="flex items-center gap-3 text-sm">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ color: m.color, backgroundColor: m.color + "1A" }}>
                  {m.label}
                </span>
                <span className="text-ink-600 truncate flex-1">{l.details || "-"}</span>
                <span className="text-ink-400 text-xs whitespace-nowrap">
                  {l.user} · {new Date(l.createdAt).toLocaleDateString("fr-FR")}{" "}
                  {new Date(l.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
