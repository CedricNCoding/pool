"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Key, Plus, Trash2, Copy, CheckCircle, Loader2 } from "lucide-react";

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string;
  companyId: string | null;
  company: { name: string } | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ name: "", permissions: "read", expiresInDays: "" });

  function loadKeys() {
    setLoading(true);
    fetch("/api/settings/api-keys")
      .then((r) => r.json())
      .then(setKeys)
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadKeys(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/settings/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const data = await res.json();
      setNewKey(data.key);
      loadKeys();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette cle API ?")) return;
    await fetch(`/api/settings/api-keys`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadKeys();
  }

  function copyKey() {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Key className="w-6 h-6 text-ink-600" />
          <h1 className="text-2xl font-bold">Cles API</h1>
        </div>
        <Dialog open={showNew} onOpenChange={(open) => { setShowNew(open); if (!open) { setNewKey(null); setForm({ name: "", permissions: "read", expiresInDays: "" }); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nouvelle cle</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{newKey ? "Cle API generee" : "Nouvelle cle API"}</DialogTitle>
            </DialogHeader>
            {newKey ? (
              <div className="space-y-4">
                <div className="bg-paper-bone text-green-400 p-4 rounded-lg font-mono text-sm break-all">
                  {newKey}
                </div>
                <p className="text-sm text-amber-600 font-medium">
                  Copiez cette cle maintenant. Elle ne sera plus affichee.
                </p>
                <Button onClick={copyKey} className="w-full">
                  {copied ? <CheckCircle className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? "Copie !" : "Copier la cle"}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label>Nom de la cle *</Label>
                  <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Integration planning" required />
                </div>
                <div>
                  <Label>Permissions</Label>
                  <select className="w-full px-3 py-2 rounded-lg border border-ink-900/15 bg-white text-ink-900 text-sm" value={form.permissions} onChange={(e) => setForm(f => ({ ...f, permissions: e.target.value }))}>
                    <option value="read">Lecture seule</option>
                    <option value="write">Lecture + ecriture</option>
                  </select>
                </div>
                <div>
                  <Label>Expiration (jours, vide = jamais)</Label>
                  <Input type="number" value={form.expiresInDays} onChange={(e) => setForm(f => ({ ...f, expiresInDays: e.target.value }))} placeholder="365" />
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Generer
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Prefixe</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Derniere utilisation</TableHead>
                <TableHead>Expire</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell className="font-mono text-sm">{key.keyPrefix}...</TableCell>
                  <TableCell>
                    <Badge variant={key.permissions === "read" ? "secondary" : "default"}>
                      {key.permissions}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-ink-400">
                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString("fr-FR") : "Jamais"}
                  </TableCell>
                  <TableCell className="text-sm text-ink-400">
                    {key.expiresAt ? new Date(key.expiresAt).toLocaleDateString("fr-FR") : "Jamais"}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(key.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {keys.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-ink-500">
                    Aucune cle API
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Documentation API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Endpoint de recherche :</p>
          <code className="block bg-slate-100 p-3 rounded-lg text-xs">
            GET /api/v1/search?skill=Dante&amp;lat=48.85&amp;lng=2.35&amp;radius=100&amp;minLevel=2
          </code>
          <p>Authentification :</p>
          <code className="block bg-slate-100 p-3 rounded-lg text-xs">
            Authorization: Bearer avp_votre_cle_ici
          </code>
          <p>Parametres disponibles : <code>skill</code>, <code>certification</code>, <code>lat</code>, <code>lng</code>, <code>radius</code> (km), <code>minLevel</code> (1-4)</p>
        </CardContent>
      </Card>
    </div>
  );
}
