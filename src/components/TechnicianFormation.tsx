"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { GraduationCap, Plus, Target, Clock, Loader2 } from "lucide-react";

interface Assignment {
  id: string;
  status: string;
  module: { id: string; title: string; targetSkills: { id: string; name: string }[] } | null;
  path: { id: string; title: string } | null;
}
interface TModule {
  id: string;
  title: string;
  durationHours: number | null;
  targetSkills: { id: string; name: string }[];
}

const STATUS: Record<string, { label: string; color: string }> = {
  propose: { label: "Propose", color: "#F59E0B" },
  en_cours: { label: "En cours", color: "#3B82F6" },
  valide: { label: "Valide", color: "#10B981" },
  annule: { label: "Annule", color: "#64748B" },
};

export default function TechnicianFormation({ technicianId }: { technicianId: string }) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [modules, setModules] = useState<TModule[]>([]);
  const [open, setOpen] = useState(false);
  const [moduleId, setModuleId] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(() => {
    fetch(`/api/training/assignments?technicianId=${technicianId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setAssignments)
      .catch(() => {});
  }, [technicianId]);

  useEffect(() => {
    fetchData();
    fetch("/api/training/modules").then((r) => r.json()).then(setModules).catch(() => {});
  }, [fetchData]);

  async function propose() {
    if (!moduleId) return;
    setSaving(true);
    const res = await fetch("/api/training/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ technicianId, moduleId, note, status: "propose" }),
    });
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      setModuleId("");
      setNote("");
      fetchData();
    }
  }

  // En cours / proposees en premier
  const sorted = [...assignments].sort((a, b) => {
    const order: Record<string, number> = { en_cours: 0, propose: 1, valide: 2, annule: 3 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between no-print">
        <p className="text-sm text-ink-500">
          {assignments.length} formation{assignments.length > 1 ? "s" : ""} (proposees, en cours, validees)
        </p>
        <Button size="sm" onClick={() => setOpen(true)} disabled={modules.length === 0}>
          <Plus className="w-4 h-4 mr-1" /> Proposer une formation
        </Button>
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-ink-400">
            <GraduationCap className="w-10 h-10 mx-auto mb-2" />
            Aucune formation. Proposez-en une (ex. pour combler une competence faible).
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sorted.map((a) => {
            const st = STATUS[a.status] ?? STATUS.propose;
            return (
              <Card key={a.id} className="print-break">
                <CardContent className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-ink-900">
                      {a.module?.title || a.path?.title || "-"}
                    </div>
                    {a.module && a.module.targetSkills.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap text-xs text-ink-500">
                        <Target className="w-3 h-3" />
                        {a.module.targetSkills.map((s) => s.name).join(", ")}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" style={{ color: st.color, borderColor: st.color + "55" }}>
                    {st.label}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-ink-400 no-print">
        La gestion complete (validation, parcours) se fait dans le menu{" "}
        <Link href="/formation" className="text-amber-400 hover:underline">Formation</Link>.
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Proposer une formation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-ink-600 block mb-1">Module</label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-ink-900/15 bg-white text-ink-900 text-sm"
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
              >
                <option value="">Selectionner un module...</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                    {m.durationHours ? ` (${m.durationHours} h)` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-ink-600 block mb-1">Note (optionnel)</label>
              <input
                className="w-full px-3 py-2 rounded-lg border border-ink-900/15 bg-white text-ink-900 text-sm"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="ex: a planifier au T1"
              />
            </div>
            {moduleId && (
              <p className="text-xs text-ink-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Statut initial : Propose. Validation depuis le menu Formation.
              </p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={propose} disabled={saving || !moduleId}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Proposer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
