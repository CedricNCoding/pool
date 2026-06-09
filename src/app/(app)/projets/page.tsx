"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderKanban, Users, Trash2, ArrowRight, List, Columns3, GripVertical } from "lucide-react";

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  updatedAt: string;
  company: { name: string; color: string } | null;
  _count: { technicians: number };
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  actif: { label: "Actif", color: "#10B981" },
  termine: { label: "Termine", color: "#3B82F6" },
  archive: { label: "Archive", color: "#64748B" },
};
const COLUMNS = ["actif", "termine", "archive"];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [view, setView] = useState<"kanban" | "liste">("kanban");
  const [dragOver, setDragOver] = useState<string | null>(null);

  const fetchProjects = useCallback(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then(setProjects)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  async function remove(id: string, title: string) {
    if (!confirm(`Supprimer le projet "${title}" ?`)) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    fetchProjects();
  }

  async function changeStatus(id: string, status: string) {
    setProjects((ps) => ps.map((p) => (p.id === id ? { ...p, status } : p)));
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => fetchProjects());
  }

  function card(p: Project, draggable = false) {
    const st = STATUS_META[p.status] ?? STATUS_META.actif;
    return (
      <Card
        key={p.id}
        draggable={draggable}
        onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)}
        className={`transition group ${draggable ? "cursor-grab active:cursor-grabbing hover:border-slate-600" : "hover:border-slate-600"}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-1.5 min-w-0">
              {draggable && <GripVertical className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />}
              <Link href={`/projets/${p.id}`} className="min-w-0">
                <h3 className="font-semibold text-slate-100 truncate">{p.title}</h3>
              </Link>
            </div>
            <button
              onClick={() => remove(p.id, p.title)}
              className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {!draggable && (
              <Badge variant="outline" className="text-xs" style={{ color: st.color, borderColor: st.color + "55" }}>
                {st.label}
              </Badge>
            )}
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {p._count.technicians}
            </span>
            {p.company && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.company.color }} />
                {p.company.name}
              </span>
            )}
          </div>

          {p.description && <p className="text-sm text-slate-400 mt-2 line-clamp-2">{p.description}</p>}

          <Link href={`/projets/${p.id}`} className="text-xs text-blue-400 hover:underline mt-2 inline-flex items-center gap-1">
            Ouvrir <ArrowRight className="w-3 h-3" />
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FolderKanban className="w-6 h-6 text-slate-300" />
          <h1 className="text-2xl font-bold">Projets / Equipes</h1>
          <Badge variant="secondary">{projects.length}</Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-slate-700 overflow-hidden">
            <button
              onClick={() => setView("kanban")}
              className={`px-2.5 py-1.5 ${view === "kanban" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}
              title="Vue kanban"
            >
              <Columns3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("liste")}
              className={`px-2.5 py-1.5 ${view === "liste" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}
              title="Vue liste"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Link href="/search">
            <Button variant="outline">
              <Users className="w-4 h-4 mr-2" />
              Composer une equipe
            </Button>
          </Link>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <FolderKanban className="w-12 h-12 mx-auto mb-3" />
          <p>Aucun projet. Composez une equipe depuis « Chercher une equipe ».</p>
        </div>
      ) : view === "liste" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => card(p))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => {
            const st = STATUS_META[col];
            const list = projects.filter((p) => p.status === col);
            return (
              <div
                key={col}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(col);
                }}
                onDragLeave={() => setDragOver((c) => (c === col ? null : c))}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(null);
                  const id = e.dataTransfer.getData("text/plain");
                  if (id) changeStatus(id, col);
                }}
                className={`rounded-xl border p-3 min-h-[200px] transition-colors ${dragOver === col ? "border-slate-500 bg-slate-800/40" : "border-slate-800 bg-slate-900/40"}`}
              >
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: st.color }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: st.color }} />
                    {st.label}
                  </span>
                  <span className="text-xs text-slate-500">{list.length}</span>
                </div>
                <div className="space-y-3">
                  {list.map((p) => card(p, true))}
                  {list.length === 0 && (
                    <p className="text-xs text-slate-600 text-center py-6">Glissez un projet ici</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
