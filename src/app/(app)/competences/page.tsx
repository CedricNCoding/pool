"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Layers, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { useSession } from "@/lib/hooks";

interface Skill {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
}
interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  order: number;
  skills: Skill[];
}

export default function SkillsPage() {
  const { user } = useSession();
  const isAdmin = user?.role === "admin";

  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");

  // Family dialog
  const [familyOpen, setFamilyOpen] = useState(false);
  const [familyName, setFamilyName] = useState("");
  const [familyColor, setFamilyColor] = useState("#6366F1");
  const [savingFamily, setSavingFamily] = useState(false);

  // Skill dialog (add | edit)
  const [skillOpen, setSkillOpen] = useState(false);
  const [skillMode, setSkillMode] = useState<"add" | "edit">("add");
  const [skillId, setSkillId] = useState<string | null>(null);
  const [skillForm, setSkillForm] = useState({
    name: "",
    categoryId: "",
    description: "",
  });
  const [savingSkill, setSavingSkill] = useState(false);

  const fetchCategories = useCallback(() => {
    fetch("/api/skills/categories")
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const totalSkills = categories.reduce((n, c) => n + c.skills.length, 0);

  // ---- Family --------------------------------------------------------------
  async function saveFamily() {
    if (!familyName.trim()) return;
    setSavingFamily(true);
    setError("");
    const res = await fetch("/api/skills/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: familyName, color: familyColor }),
    });
    if (res.ok) {
      setFamilyOpen(false);
      setFamilyName("");
      setFamilyColor("#6366F1");
      fetchCategories();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Erreur");
    }
    setSavingFamily(false);
  }

  // ---- Skill ---------------------------------------------------------------
  function openAdd(categoryId: string) {
    setSkillMode("add");
    setSkillId(null);
    setSkillForm({ name: "", categoryId, description: "" });
    setError("");
    setSkillOpen(true);
  }
  function openEdit(skill: Skill) {
    setSkillMode("edit");
    setSkillId(skill.id);
    setSkillForm({
      name: skill.name,
      categoryId: skill.categoryId,
      description: skill.description ?? "",
    });
    setError("");
    setSkillOpen(true);
  }

  async function saveSkill() {
    if (!skillForm.name.trim() || !skillForm.categoryId) return;
    setSavingSkill(true);
    setError("");
    const url = skillMode === "add" ? "/api/skills" : `/api/skills/${skillId}`;
    const method = skillMode === "add" ? "POST" : "PATCH";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(skillForm),
    });
    if (res.ok) {
      setSkillOpen(false);
      fetchCategories();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Erreur");
    }
    setSavingSkill(false);
  }

  async function deleteSkill(skill: Skill) {
    if (
      !confirm(
        `Supprimer la competence "${skill.name}" ? Les niveaux attribues aux techniciens seront retires.`
      )
    )
      return;
    await fetch(`/api/skills/${skill.id}`, { method: "DELETE" });
    fetchCategories();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-slate-300" />
          <h1 className="text-2xl font-bold">Gestion des competences</h1>
          <Badge variant="secondary">
            {totalSkills} competences / {categories.length} familles
          </Badge>
        </div>

        {isAdmin && (
          <Button variant="outline" onClick={() => setFamilyOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle famille
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {categories.map((cat) => (
          <Card key={cat.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                <span style={{ color: cat.color }}>{cat.name}</span>
                <Badge variant="outline">{cat.skills.length}</Badge>
              </CardTitle>
              {isAdmin && (
                <Button size="sm" variant="outline" onClick={() => openAdd(cat.id)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Competence
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {cat.skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="group flex items-center justify-between gap-2 p-2.5 rounded-lg border border-slate-700 hover:border-slate-600 transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-1.5 h-6 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-sm truncate">{skill.name}</span>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={() => openEdit(skill)}
                          className="p-1 text-slate-400 hover:text-slate-100"
                          title="Modifier"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => deleteSkill(skill)}
                          className="p-1 text-slate-400 hover:text-red-400"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {cat.skills.length === 0 && (
                  <p className="text-sm text-slate-500 col-span-full">
                    Aucune competence dans cette famille.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Family dialog */}
      <Dialog open={familyOpen} onOpenChange={setFamilyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle famille de competences</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <div className="bg-red-900/30 text-red-400 px-3 py-2 rounded-lg text-sm border border-red-800/50">
                {error}
              </div>
            )}
            <div>
              <Label>Nom *</Label>
              <Input
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="ex: Streaming / Diffusion"
              />
            </div>
            <div>
              <Label>Couleur</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={familyColor}
                  onChange={(e) => setFamilyColor(e.target.value)}
                  className="h-9 w-14 rounded border border-slate-600 bg-slate-800"
                />
                <span className="text-sm text-slate-400">{familyColor}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button onClick={saveFamily} disabled={savingFamily || !familyName.trim()}>
              {savingFamily && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Creer la famille
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Skill dialog (add / edit) */}
      <Dialog open={skillOpen} onOpenChange={setSkillOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {skillMode === "add" ? "Nouvelle competence" : "Modifier la competence"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <div className="bg-red-900/30 text-red-400 px-3 py-2 rounded-lg text-sm border border-red-800/50">
                {error}
              </div>
            )}
            <div>
              <Label>Nom *</Label>
              <Input
                value={skillForm.name}
                onChange={(e) =>
                  setSkillForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="ex: Encodage NDI"
              />
            </div>
            <div>
              <Label>Famille de competences *</Label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-50 text-sm"
                value={skillForm.categoryId}
                onChange={(e) =>
                  setSkillForm((f) => ({ ...f, categoryId: e.target.value }))
                }
              >
                <option value="">Selectionner une famille...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={skillForm.description}
                onChange={(e) =>
                  setSkillForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Optionnel"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button
              onClick={saveSkill}
              disabled={savingSkill || !skillForm.name.trim() || !skillForm.categoryId}
            >
              {savingSkill && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {skillMode === "add" ? "Ajouter" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
