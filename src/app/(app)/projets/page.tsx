"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FolderKanban, Users, Trash2, ArrowRight } from "lucide-react";

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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);

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

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FolderKanban className="w-6 h-6 text-slate-300" />
          <h1 className="text-2xl font-bold">Projets / Equipes</h1>
          <Badge variant="secondary">{projects.length}</Badge>
        </div>
        <Link href="/search">
          <Button variant="outline">
            <Users className="w-4 h-4 mr-2" />
            Composer une equipe
          </Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <FolderKanban className="w-12 h-12 mx-auto mb-3" />
          <p>Aucun projet. Composez une equipe depuis « Chercher une equipe ».</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => {
            const st = STATUS_META[p.status] ?? STATUS_META.actif;
            return (
              <Card key={p.id} className="hover:border-slate-600 transition group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/projets/${p.id}`} className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-100 truncate">{p.title}</h3>
                    </Link>
                    <button
                      onClick={() => remove(p.id, p.title)}
                      className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant="outline"
                      className="text-xs"
                      style={{ color: st.color, borderColor: st.color + "55" }}
                    >
                      {st.label}
                    </Badge>
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

                  {p.description && (
                    <p className="text-sm text-slate-400 mt-3 line-clamp-2">{p.description}</p>
                  )}

                  <Link
                    href={`/projets/${p.id}`}
                    className="text-xs text-blue-400 hover:underline mt-3 inline-flex items-center gap-1"
                  >
                    Ouvrir <ArrowRight className="w-3 h-3" />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
