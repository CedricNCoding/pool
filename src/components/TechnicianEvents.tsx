"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ClipboardList, Plus, Trash2, Loader2 } from "lucide-react";

interface Event {
  id: string;
  type: string;
  title: string;
  body: string | null;
  date: string;
}

const TYPES: Record<string, { label: string; color: string }> = {
  entretien: { label: "Entretien", color: "#3B82F6" },
  incident: { label: "Incident", color: "#EF4444" },
  evaluation: { label: "Evaluation", color: "#8B5CF6" },
  note: { label: "Note", color: "#64748B" },
  autre: { label: "Autre", color: "#94A3B8" },
};

export default function TechnicianEvents({ technicianId }: { technicianId: string }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "note", title: "", body: "", date: "" });
  const [saving, setSaving] = useState(false);

  const fetchEvents = useCallback(() => {
    fetch(`/api/technicians/${technicianId}/events`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setEvents)
      .catch(() => {});
  }, [technicianId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  async function add() {
    if (!form.title.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/technicians/${technicianId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      setForm({ type: "note", title: "", body: "", date: "" });
      fetchEvents();
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cet evenement ?")) return;
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    fetchEvents();
  }

  return (
    <Card className="print-break">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="w-4 h-4" /> Journal de suivi
        </CardTitle>
        <Button size="sm" variant="outline" className="no-print" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Ajouter
        </Button>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-ink-400">
            Aucun evenement. Consignez entretiens, incidents, evaluations...
          </p>
        ) : (
          <div className="space-y-3">
            {events.map((e) => {
              const t = TYPES[e.type] ?? TYPES.note;
              return (
                <div key={e.id} className="flex gap-3 group">
                  <div className="flex flex-col items-center">
                    <span className="w-2.5 h-2.5 rounded-full mt-1.5" style={{ backgroundColor: t.color }} />
                    <span className="flex-1 w-px bg-paper-2 my-1" />
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]" style={{ color: t.color, borderColor: t.color + "55" }}>
                        {t.label}
                      </Badge>
                      <span className="text-sm font-medium text-ink-900">{e.title}</span>
                      <span className="text-xs text-ink-400">
                        {new Date(e.date).toLocaleDateString("fr-FR")}
                      </span>
                      <button onClick={() => remove(e.id)} className="ml-auto text-ink-400 hover:text-red-400 opacity-0 group-hover:opacity-100 no-print">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {e.body && <p className="text-sm text-ink-500 mt-0.5 whitespace-pre-wrap">{e.body}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvel evenement</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-ink-900/15 bg-white text-ink-900 text-sm"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                >
                  {Object.entries(TYPES).map(([v, m]) => (
                    <option key={v} value={v}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Intitule *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="ex: Entretien annuel 2026" />
            </div>
            <div>
              <Label>Detail</Label>
              <Textarea rows={3} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={add} disabled={saving || !form.title.trim()}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
