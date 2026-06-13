"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plug, Loader2, CheckCircle, AlertTriangle, ArrowUpFromLine, ArrowDownToLine, Save } from "lucide-react";
import PageHelp from "@/components/PageHelp";

interface Cfg { configured: boolean; url?: string; db?: string; login?: string; model?: string; defaultProject?: string | null; enabled?: boolean; hasKey?: boolean; lastSyncAt?: string | null; lastStatus?: string | null; lastError?: string | null }

export default function OdooPage() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [form, setForm] = useState({ url: "", db: "", login: "", apiKey: "", model: "project.task", defaultProject: "", enabled: false });
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<"" | "test" | "push" | "pull">("");
  const [diag, setDiag] = useState<Record<string, unknown> | null>(null);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(() => {
    fetch("/api/settings/odoo").then((r) => r.json()).then((d: Cfg) => {
      setCfg(d);
      if (d.configured) setForm((f) => ({ ...f, url: d.url ?? "", db: d.db ?? "", login: d.login ?? "", model: d.model ?? "project.task", defaultProject: d.defaultProject ?? "", enabled: !!d.enabled, apiKey: "" }));
    }).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true); setMsg(null);
    const res = await fetch("/api/settings/odoo", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    if (res.ok) { setMsg({ kind: "ok", text: "Configuration enregistrée." }); load(); }
    else setMsg({ kind: "err", text: (await res.json().catch(() => ({}))).error || "Échec" });
  }
  async function test() {
    setBusy("test"); setDiag(null); setMsg(null);
    const res = await fetch("/api/settings/odoo/test", { method: "POST" });
    setBusy("");
    const d = await res.json().catch(() => ({}));
    if (res.ok) setDiag(d); else setMsg({ kind: "err", text: d.error || "Échec de connexion" });
  }
  async function sync(direction: "push" | "pull") {
    setBusy(direction); setMsg(null);
    const res = await fetch("/api/settings/odoo/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ direction }) });
    setBusy("");
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      const txt = direction === "push" ? `${d.pushed} tâche(s) exportée(s)${d.errors?.length ? `, ${d.errors.length} erreur(s)` : ""}` : `${d.pulled} créneau(x) importé(s)${d.skipped?.length ? `, ${d.skipped.length} ignoré(s)` : ""}`;
      setMsg({ kind: "ok", text: txt });
      load();
    } else setMsg({ kind: "err", text: d.error || "Échec de synchronisation" });
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Plug className="w-6 h-6 text-ink-600" />
        <h1 className="text-2xl font-bold">Connecteur Odoo</h1>
        <Badge variant="outline" style={{ color: "#E89B2C", borderColor: "#E89B2C66" }}>Béta</Badge>
      </div>

      <PageHelp>
        <strong>Fonctionnalité en bêta.</strong> Synchronise le planning de Praxis avec les tâches Odoo (<code>project.task</code>) via l&apos;API. Crée une <strong>clé API</strong> dans Odoo (Préférences → Sécurité du compte) et colle-la ici (elle est <strong>chiffrée</strong>). ⚠️ Le serveur doit pouvoir joindre <code>*.odoo.com</code> (autorisation egress). Teste d&apos;abord la connexion avant d&apos;activer la synchro.
      </PageHelp>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Connexion</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>URL Odoo *</Label><Input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://masociete.odoo.com" /></div>
            <div><Label>Base de données *</Label><Input value={form.db} onChange={(e) => setForm((f) => ({ ...f, db: e.target.value }))} placeholder="masociete" /></div>
            <div><Label>Identifiant (e-mail) *</Label><Input value={form.login} onChange={(e) => setForm((f) => ({ ...f, login: e.target.value }))} /></div>
            <div><Label>Clé API {cfg?.hasKey && <span className="text-xs text-ink-400">(enregistrée — laisser vide pour conserver)</span>}</Label><Input type="password" value={form.apiKey} onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))} placeholder={cfg?.hasKey ? "••••••••" : "clé API Odoo"} /></div>
            <div><Label>Modèle</Label><Input value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} placeholder="project.task" /></div>
            <div><Label>Projet Odoo cible (export)</Label><Input value={form.defaultProject} onChange={(e) => setForm((f) => ({ ...f, defaultProject: e.target.value }))} placeholder="ex: Planning des tech." /></div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.enabled} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} /> Activer le connecteur</label>
          {msg && <p className={`text-sm ${msg.kind === "ok" ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>}
          <div className="flex gap-2">
            <Button onClick={save} disabled={saving || !form.url || !form.db || !form.login}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}<Save className="w-4 h-4 mr-1" /> Enregistrer</Button>
            <Button variant="outline" onClick={test} disabled={busy !== "" || !cfg?.configured}>{busy === "test" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />} Tester la connexion</Button>
          </div>
        </CardContent>
      </Card>

      {diag && (
        <Card className="mb-6 border-green-300">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Connexion réussie</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>Serveur Odoo : <strong>{String(diag.serverVersion)}</strong></p>
            <p>Modèle <code>{String(diag.model)}</code> : <strong>{String(diag.taskCount)}</strong> tâche(s)</p>
            <p>Dates de planning (Gantt) : {diag.hasPlannedDates ? <span className="text-green-600">disponibles</span> : <span className="text-amber-600">non détectées (planned_date_begin absent)</span>}</p>
            <p>Type : {diag.isFieldService ? "Field Service" : "Projet"}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Synchronisation</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => sync("push")} disabled={busy !== "" || !cfg?.enabled}>{busy === "push" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowUpFromLine className="w-4 h-4 mr-1" />} Exporter Praxis → Odoo</Button>
            <Button variant="outline" onClick={() => sync("pull")} disabled={busy !== "" || !cfg?.enabled}>{busy === "pull" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowDownToLine className="w-4 h-4 mr-1" />} Importer Odoo → Praxis</Button>
          </div>
          <p className="text-xs text-ink-400">Export : pousse les créneaux des 90 prochains jours comme tâches Odoo. Import : crée/maj des créneaux à partir des tâches planifiées Odoo (technicien rapproché par e-mail, projet par nom). Synchro idempotente (pas de doublon).</p>
          {cfg?.lastStatus && (
            <div className="text-sm rounded-lg bg-paper-2 p-3">
              <p className="flex items-center gap-2">{cfg.lastError ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-green-600" />} {cfg.lastStatus}</p>
              {cfg.lastSyncAt && <p className="text-xs text-ink-400 mt-0.5">Dernière synchro : {new Date(cfg.lastSyncAt).toLocaleString("fr-FR")}</p>}
              {cfg.lastError && <p className="text-xs text-red-600 mt-1">{cfg.lastError}</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
