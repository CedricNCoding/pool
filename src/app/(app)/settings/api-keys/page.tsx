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
import { Key, Plus, Trash2, Copy, CheckCircle, Loader2, Webhook, Power } from "lucide-react";

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

interface WebhookItem {
  id: string;
  url: string;
  events: string;
  secret: string;
  isActive: boolean;
  lastStatus: number | null;
  lastError: string | null;
  lastFiredAt: string | null;
  createdAt: string;
}

// Doit refléter WEBHOOK_EVENTS côté serveur (lib/webhooks). Dupliqué ici car
// lib/webhooks importe Prisma (serveur) et ne peut pas être chargé côté client.
const WEBHOOK_EVENTS = [
  { value: "assistance.created", label: "Demande de renfort créée" },
  { value: "assistance.resolved", label: "Demande de renfort arbitrée" },
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ name: "", permissions: "read", expiresInDays: "" });

  const [hooks, setHooks] = useState<WebhookItem[]>([]);
  const [showNewHook, setShowNewHook] = useState(false);
  const [savingHook, setSavingHook] = useState(false);
  const [hookForm, setHookForm] = useState<{ url: string; events: string[] }>({ url: "", events: [] });
  const [hookError, setHookError] = useState<string | null>(null);

  function loadKeys() {
    setLoading(true);
    fetch("/api/settings/api-keys")
      .then((r) => r.json())
      .then(setKeys)
      .finally(() => setLoading(false));
  }

  function loadHooks() {
    fetch("/api/settings/webhooks").then((r) => r.json()).then(setHooks).catch(() => {});
  }

  useEffect(() => { loadKeys(); loadHooks(); }, []);

  async function handleCreateHook(e: React.FormEvent) {
    e.preventDefault();
    setSavingHook(true);
    setHookError(null);
    const res = await fetch("/api/settings/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: hookForm.url, events: hookForm.events }),
    });
    if (res.ok) {
      setShowNewHook(false);
      setHookForm({ url: "", events: [] });
      loadHooks();
    } else {
      const d = await res.json().catch(() => ({}));
      setHookError(d.error || "Échec de l'enregistrement");
    }
    setSavingHook(false);
  }

  async function toggleHook(id: string, isActive: boolean) {
    await fetch("/api/settings/webhooks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    loadHooks();
  }

  async function deleteHook(id: string) {
    if (!confirm("Supprimer ce webhook ?")) return;
    await fetch("/api/settings/webhooks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadHooks();
  }

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

  const origin = typeof window !== "undefined" ? window.location.origin : "https://praxis.spektalis.net";

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

      {/* --- Webhooks --- */}
      <div className="flex items-center justify-between mt-10 mb-4">
        <div className="flex items-center gap-3">
          <Webhook className="w-5 h-5 text-ink-600" />
          <h2 className="text-lg font-semibold">Webhooks</h2>
        </div>
        <Dialog open={showNewHook} onOpenChange={(open) => { setShowNewHook(open); if (!open) { setHookError(null); setHookForm({ url: "", events: [] }); } }}>
          <DialogTrigger asChild>
            <Button variant="outline"><Plus className="w-4 h-4 mr-2" />Nouveau webhook</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau webhook</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateHook} className="space-y-4">
              <div>
                <Label>URL de destination (https) *</Label>
                <Input type="url" value={hookForm.url} onChange={(e) => setHookForm(f => ({ ...f, url: e.target.value }))} placeholder="https://exemple.com/hooks/praxis" required />
                <p className="text-xs text-ink-400 mt-1">Doit être en https public. Les cibles internes/privées sont refusées.</p>
              </div>
              <div>
                <Label>Évènements</Label>
                <div className="space-y-2 mt-1">
                  {WEBHOOK_EVENTS.map((ev) => (
                    <label key={ev.value} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={hookForm.events.includes(ev.value)}
                        onChange={(e) => setHookForm(f => ({
                          ...f,
                          events: e.target.checked ? [...f.events, ev.value] : f.events.filter(x => x !== ev.value),
                        }))}
                      />
                      {ev.label} <code className="text-xs text-ink-400">{ev.value}</code>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-ink-400 mt-1">Aucune case = tous les évènements.</p>
              </div>
              {hookError && <p className="text-sm text-red-600">{hookError}</p>}
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Annuler</Button></DialogClose>
                <Button type="submit" disabled={savingHook}>
                  {savingHook && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Enregistrer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>URL</TableHead>
                <TableHead>Évènements</TableHead>
                <TableHead>Secret</TableHead>
                <TableHead>Dernier envoi</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hooks.map((h) => (
                <TableRow key={h.id} className={h.isActive ? "" : "opacity-50"}>
                  <TableCell className="font-mono text-xs break-all max-w-[220px]">{h.url}</TableCell>
                  <TableCell className="text-xs">{h.events === "all" ? "Tous" : h.events.split(",").join(", ")}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      className="font-mono text-xs text-ink-400 hover:text-ink-700"
                      title="Copier le secret de signature"
                      onClick={() => { navigator.clipboard.writeText(h.secret); }}
                    >
                      {h.secret.slice(0, 12)}… <Copy className="inline w-3 h-3" />
                    </button>
                  </TableCell>
                  <TableCell className="text-xs text-ink-400">
                    {h.lastFiredAt ? (
                      <span className={h.lastStatus && h.lastStatus >= 200 && h.lastStatus < 300 ? "text-green-600" : "text-red-600"}>
                        {h.lastStatus || "err"} · {new Date(h.lastFiredAt).toLocaleDateString("fr-FR")}
                      </span>
                    ) : "Jamais"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" title={h.isActive ? "Désactiver" : "Activer"} onClick={() => toggleHook(h.id, h.isActive)}>
                        <Power className={`w-4 h-4 ${h.isActive ? "text-green-600" : "text-ink-300"}`} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteHook(h.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {hooks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-ink-500">
                    Aucun webhook
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* --- Documentation API --- */}
      <Card className="mt-10">
        <CardHeader>
          <CardTitle className="text-base">Documentation API</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          <div>
            <p className="font-medium mb-1">Authentification</p>
            <p className="text-ink-500 mb-2">En-tête <code>Authorization</code> (ou <code>?key=</code> pour les intégrations sans en-têtes, comme un agenda). La clé limite l’accès à son tenant — et à sa société si elle en porte une.</p>
            <code className="block bg-paper-bone p-3 rounded-lg text-xs">Authorization: Bearer avp_votre_cle_ici</code>
          </div>

          <div>
            <p className="font-medium mb-1">Lister les techniciens <Badge variant="secondary">GET</Badge></p>
            <code className="block bg-paper-bone p-3 rounded-lg text-xs">{origin}/api/v1/technicians</code>
            <p className="text-ink-500 mt-1">Renvoie <code>{`{ data: [...] }`}</code> : identité, service, disponibilité, compétences (niveau) et certifications (échéance).</p>
          </div>

          <div>
            <p className="font-medium mb-1">Rechercher une équipe <Badge variant="secondary">GET</Badge></p>
            <code className="block bg-paper-bone p-3 rounded-lg text-xs">{origin}/api/v1/search?skill=Dante&amp;lat=48.85&amp;lng=2.35&amp;radius=100&amp;minLevel=2</code>
            <p className="text-ink-500 mt-1">Paramètres : <code>skill</code>, <code>certification</code>, <code>lat</code>, <code>lng</code>, <code>radius</code> (km), <code>minLevel</code> (1-6).</p>
          </div>

          <div>
            <p className="font-medium mb-1">Échéances au format iCal <Badge variant="secondary">GET</Badge></p>
            <p className="text-ink-500 mb-2">Abonnez votre agenda (Google, Outlook, Apple) à cette URL : visites médicales, certifications et documents qui arrivent à échéance. La clé passe en paramètre car les agendas n’envoient pas d’en-tête.</p>
            <code className="block bg-paper-bone p-3 rounded-lg text-xs break-all">{origin}/api/v1/echeances?key=avp_votre_cle_ici</code>
          </div>

          <div>
            <p className="font-medium mb-1">Webhooks — vérifier la signature</p>
            <p className="text-ink-500 mb-2">Chaque envoi POST porte l’en-tête <code>X-Praxis-Signature: sha256=…</code>, HMAC-SHA256 du corps brut avec le secret du webhook. Recalculez-le pour authentifier l’appel.</p>
            <code className="block bg-paper-bone p-3 rounded-lg text-xs whitespace-pre-wrap">{`POST  votre-url
X-Praxis-Event: assistance.created
X-Praxis-Signature: sha256=<hmac>
{ "event": "...", "sentAt": "...", "data": { ... } }`}</code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
