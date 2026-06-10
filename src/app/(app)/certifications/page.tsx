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
import { Award, Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { CERT_CATEGORIES } from "@/lib/constants";
import { useSession } from "@/lib/hooks";

interface Certification {
  id: string;
  name: string;
  issuer: string;
  description: string | null;
  validityMonths: number | null;
  category: string;
  color: string;
  level: string;
}

const LEVEL_LABELS: Record<string, string> = {
  foundation: "Foundation",
  standard: "Standard",
  advanced: "Advanced",
  expert: "Expert",
};

const EMPTY_FORM = {
  name: "",
  issuer: "",
  category: "general",
  level: "standard",
  validityMonths: "",
  description: "",
};

export default function CertificationsPage() {
  const { user } = useSession();
  const isAdmin = user?.role === "admin";

  const [certs, setCerts] = useState<Certification[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchCerts = useCallback(() => {
    fetch("/api/certifications")
      .then((r) => r.json())
      .then(setCerts)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCerts();
  }, [fetchCerts]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setDialogOpen(true);
  }
  function openEdit(cert: Certification) {
    setEditingId(cert.id);
    setForm({
      name: cert.name,
      issuer: cert.issuer,
      category: cert.category,
      level: cert.level,
      validityMonths: cert.validityMonths != null ? String(cert.validityMonths) : "",
      description: cert.description ?? "",
    });
    setError("");
    setDialogOpen(true);
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.issuer.trim()) {
      setError("Nom et organisme sont obligatoires");
      return;
    }
    setSaving(true);
    setError("");
    const color =
      CERT_CATEGORIES.find((c) => c.value === form.category)?.color ?? "#6366F1";
    const res = await fetch(
      editingId ? `/api/certifications/${editingId}` : "/api/certifications",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, color }),
      }
    );
    if (res.ok) {
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      fetchCerts();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Erreur lors de l'enregistrement");
    }
    setSaving(false);
  }

  async function handleDelete(cert: Certification) {
    if (!confirm(`Supprimer la certification "${cert.name}" du referentiel ?`)) return;
    const res = await fetch(`/api/certifications/${cert.id}`, { method: "DELETE" });
    if (res.ok) fetchCerts();
    else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Suppression impossible");
    }
  }

  const grouped = CERT_CATEGORIES.map((cat) => ({
    ...cat,
    certs: certs.filter((c) => c.category === cat.value),
  })).filter((g) => g.certs.length > 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Award className="w-6 h-6 text-ink-600" />
          <h1 className="text-2xl font-bold">Referentiel des certifications</h1>
          <Badge variant="secondary">{certs.length} certifications</Badge>
        </div>

        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter une certification
          </Button>
        )}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Modifier la certification" : "Nouvelle certification"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {error && (
                  <div className="bg-red-900/30 text-red-400 px-3 py-2 rounded-lg text-sm border border-red-800/50">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nom *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="ex: Dante Level 2"
                    />
                  </div>
                  <div>
                    <Label>Organisme *</Label>
                    <Input
                      value={form.issuer}
                      onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))}
                      placeholder="ex: Audinate"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Categorie</Label>
                    <select
                      className="w-full px-3 py-2 rounded-lg border border-ink-900/15 bg-white text-ink-900 text-sm"
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    >
                      {CERT_CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Niveau</Label>
                    <select
                      className="w-full px-3 py-2 rounded-lg border border-ink-900/15 bg-white text-ink-900 text-sm"
                      value={form.level}
                      onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
                    >
                      {Object.entries(LEVEL_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <Label>Validite (mois)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.validityMonths}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, validityMonths: e.target.value }))
                    }
                    placeholder="ex: 24 — laisser vide = sans expiration"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
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
                  onClick={handleSubmit}
                  disabled={saving || !form.name.trim() || !form.issuer.trim()}
                >
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? "Enregistrer" : "Ajouter"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      </div>

      <div className="space-y-6">
        {grouped.map((group) => (
          <Card key={group.value}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: group.color }}
                />
                {group.label}
                <Badge variant="outline" className="ml-2">
                  {group.certs.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.certs.map((cert) => (
                  <div
                    key={cert.id}
                    className="group flex items-start gap-3 p-3 rounded-lg border border-ink-900/10 hover:border-ink-900/15 transition"
                  >
                    <div
                      className="w-2 h-full min-h-[40px] rounded-full flex-shrink-0"
                      style={{ backgroundColor: cert.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{cert.name}</p>
                      <p className="text-xs text-ink-9000">{cert.issuer}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge
                          variant="outline"
                          className="text-xs"
                          style={{
                            borderColor: cert.color,
                            color: cert.color,
                          }}
                        >
                          {LEVEL_LABELS[cert.level] || cert.level}
                        </Badge>
                        {cert.validityMonths ? (
                          <span className="text-xs text-ink-500">
                            Validite {cert.validityMonths} mois
                          </span>
                        ) : (
                          <span className="text-xs text-green-500">
                            Sans expiration
                          </span>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex flex-col gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => openEdit(cert)} className="text-ink-9000 hover:text-ink-800" title="Modifier">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(cert)} className="text-ink-9000 hover:text-red-400" title="Supprimer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
