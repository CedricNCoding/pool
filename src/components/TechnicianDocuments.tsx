"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  FileText,
  Upload,
  Download,
  Eye,
  Trash2,
  Plus,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { DOC_CATEGORIES } from "@/lib/uploads";
import { dossierStatus, docCategoryLabel } from "@/lib/dossier";

interface Doc {
  id: string;
  category: string;
  title: string;
  originalName: string;
  mimeType: string;
  size: number;
  expiryDate: string | null;
  createdAt: string;
}

function catLabel(v: string) {
  return DOC_CATEGORIES.find((c) => c.value === v)?.label ?? v;
}
function fmtSize(n: number) {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}
function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString("fr-FR") : null;
}
function expiryBadge(d: string | null) {
  if (!d) return null;
  const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (days < 0) return { color: "#EF4444", Icon: AlertTriangle, label: "Expire" };
  if (days <= 60) return { color: "#F59E0B", Icon: Clock, label: `Expire dans ${days}j` };
  return { color: "#10B981", Icon: CheckCircle, label: "Valide" };
}

export default function TechnicianDocuments({
  technicianId,
  service = "",
}: {
  technicianId: string;
  service?: string;
}) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: "contrat", title: "", expiryDate: "" });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchDocs = useCallback(() => {
    fetch(`/api/technicians/${technicianId}/documents`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setDocs)
      .catch(() => {});
  }, [technicianId]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  async function upload() {
    if (!file) {
      setError("Selectionnez un fichier");
      return;
    }
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", form.title || file.name);
    fd.append("category", form.category);
    if (form.expiryDate) fd.append("expiryDate", form.expiryDate);

    const res = await fetch(`/api/technicians/${technicianId}/documents`, {
      method: "POST",
      body: fd,
    });
    setUploading(false);
    if (res.ok) {
      setOpen(false);
      setForm({ category: "contrat", title: "", expiryDate: "" });
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      fetchDocs();
    } else {
      setError((await res.json().catch(() => ({}))).error || "Echec de l'envoi");
    }
  }

  async function remove(d: Doc) {
    if (!confirm(`Supprimer le document "${d.title}" ?`)) return;
    await fetch(`/api/documents/${d.id}`, { method: "DELETE" });
    fetchDocs();
  }

  // Regroupe par categorie (dans l'ordre du referentiel)
  const grouped = DOC_CATEGORIES.map((c) => ({
    ...c,
    docs: docs.filter((d) => d.category === c.value),
  })).filter((g) => g.docs.length > 0);

  const present = [...new Set(docs.map((d) => d.category))];
  const status = dossierStatus(service, present);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between no-print">
        <p className="text-sm text-ink-500">
          {docs.length} document{docs.length > 1 ? "s" : ""} — contrat, identite, visite
          medicale, habilitations, certificats...
        </p>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Ajouter un document
        </Button>
      </div>

      {/* Dossier complet / incomplet (documents obligatoires par service) */}
      <div
        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
        style={
          status.complete
            ? { borderColor: "#10B98155", backgroundColor: "#10B98115", color: "#34D399" }
            : { borderColor: "#F59E0B55", backgroundColor: "#F59E0B15", color: "#FBBF24" }
        }
      >
        {status.complete ? (
          <>
            <CheckCircle className="w-4 h-4" /> Dossier complet
          </>
        ) : (
          <>
            <AlertTriangle className="w-4 h-4" />
            Dossier incomplet — manque : {status.missing.map(docCategoryLabel).join(", ")}
          </>
        )}
      </div>

      {docs.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-ink-9000">
            <FileText className="w-10 h-10 mx-auto mb-2" />
            Aucun document. Deposez contrats, pieces d&apos;identite, visites medicales,
            habilitations...
          </CardContent>
        </Card>
      ) : (
        grouped.map((g) => (
          <Card key={g.value} className="print-break">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-ink-600 mb-3">{g.label}</h3>
              <div className="space-y-2">
                {g.docs.map((d) => {
                  const exp = expiryBadge(d.expiryDate);
                  return (
                    <div key={d.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-paper-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-5 h-5 text-ink-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-ink-900 truncate">{d.title}</div>
                          <div className="text-xs text-ink-9000 flex items-center gap-2">
                            <span className="truncate">{d.originalName}</span>
                            <span>· {fmtSize(d.size)}</span>
                            {d.expiryDate && <span>· exp. {fmtDate(d.expiryDate)}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {exp && (
                          <Badge variant="outline" className="text-[10px] mr-1" style={{ color: exp.color, borderColor: exp.color + "55" }}>
                            <exp.Icon className="w-3 h-3 mr-1" />
                            {exp.label}
                          </Badge>
                        )}
                        <a href={`/api/documents/${d.id}/file`} target="_blank" rel="noopener noreferrer" className="p-1.5 text-ink-500 hover:text-ink-900 no-print" title="Voir">
                          <Eye className="w-4 h-4" />
                        </a>
                        <a href={`/api/documents/${d.id}/file?download=1`} className="p-1.5 text-ink-500 hover:text-ink-900 no-print" title="Telecharger">
                          <Download className="w-4 h-4" />
                        </a>
                        <button onClick={() => remove(d)} className="p-1.5 text-ink-500 hover:text-red-400 no-print" title="Supprimer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Dialog upload */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {error && (
              <div className="bg-red-900/30 text-red-400 px-3 py-2 rounded-lg text-sm border border-red-800/50">{error}</div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categorie</Label>
                <select
                  className="w-full px-3 py-2 rounded-lg border border-ink-900/15 bg-white text-ink-900 text-sm"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {DOC_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Date d&apos;expiration</Label>
                <Input type="date" value={form.expiryDate} onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Intitule</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={file ? file.name : "ex: Contrat CDI signe"}
              />
            </div>
            <div>
              <Label>Fichier (PDF, image, Word — max 10 Mo)</Label>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setFile(f);
                  if (f && !form.title) setForm((s) => ({ ...s, title: f.name }));
                }}
                className="w-full text-sm text-ink-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-paper-2 file:text-ink-900 file:cursor-pointer"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={upload} disabled={uploading || !file}>
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
