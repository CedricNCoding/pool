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
import { Building, Plus, Users, Building2, Wrench, Pause, Play, Loader2, ShieldCheck } from "lucide-react";
import { useSession } from "@/lib/hooks";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  _count: { users: number; companies: number; technicians: number };
}

export default function SuperadminPage() {
  const { user } = useSession();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", adminName: "", adminEmail: "", adminPassword: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    fetch("/api/tenants").then((r) => (r.ok ? r.json() : [])).then(setTenants).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create() {
    setError("");
    if (!form.name.trim() || !form.adminEmail.trim() || form.adminPassword.length < 8) {
      setError("Nom, email et mot de passe (8+ car.) requis");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      const d = await res.json();
      setOpen(false);
      setForm({ name: "", adminName: "", adminEmail: "", adminPassword: "" });
      setMsg(`Tenant « ${d.tenant.name} » cree (referentiel cloné : ${d.cloned.skills} compétences, ${d.cloned.certifications} certifs).`);
      load();
    } else {
      setError((await res.json().catch(() => ({}))).error || "Echec de la creation");
    }
  }

  async function toggle(t: Tenant) {
    const status = t.status === "active" ? "suspended" : "active";
    await fetch(`/api/tenants/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  if (user && user.role !== "superadmin") {
    return (
      <div className="p-8">
        <Card><CardContent className="py-12 text-center text-ink-500">
          <ShieldCheck className="w-10 h-10 mx-auto mb-3" />
          Espace reserve aux super administrateurs.
        </CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building className="w-6 h-6 text-ink-600" />
          <h1 className="text-2xl font-bold">Tenants</h1>
          <Badge variant="secondary">{tenants.length}</Badge>
        </div>
        <Button onClick={() => { setMsg(""); setOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Creer un tenant
        </Button>
      </div>

      {msg && (
        <div className="rounded-lg border border-emerald-700/50 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{msg}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tenants.map((t) => (
          <Card key={t.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {t.name}
                <Badge
                  variant="outline"
                  style={t.status === "active"
                    ? { color: "#34D399", borderColor: "#10B98155" }
                    : { color: "#F87171", borderColor: "#EF444455" }}
                >
                  {t.status === "active" ? "Actif" : "Suspendu"}
                </Badge>
              </CardTitle>
              <button onClick={() => toggle(t)} className="text-ink-500 hover:text-ink-900" title={t.status === "active" ? "Suspendre" : "Reactiver"}>
                {t.status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-ink-400 mb-3">/{t.slug}</p>
              <div className="flex items-center gap-4 text-sm text-ink-600">
                <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{t._count.companies}</span>
                <span className="flex items-center gap-1"><Wrench className="w-3.5 h-3.5" />{t._count.technicians}</span>
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{t._count.users}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau tenant</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            {error && <div className="bg-red-900/30 text-red-400 px-3 py-2 rounded-lg text-sm border border-red-800/50">{error}</div>}
            <div>
              <Label>Nom de l&apos;entreprise cliente *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="ex: Lumiere & Son SAS" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom de l&apos;admin</Label>
                <Input value={form.adminName} onChange={(e) => setForm((f) => ({ ...f, adminName: e.target.value }))} placeholder="Administrateur" />
              </div>
              <div>
                <Label>Email admin *</Label>
                <Input type="email" value={form.adminEmail} onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))} placeholder="admin@client.fr" />
              </div>
            </div>
            <div>
              <Label>Mot de passe admin *</Label>
              <Input type="text" value={form.adminPassword} onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))} placeholder="8 caracteres minimum" />
            </div>
            <p className="text-xs text-ink-400">Le referentiel (competences, certifications) est copie depuis le tenant Demo.</p>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={create} disabled={saving}>{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Creer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
