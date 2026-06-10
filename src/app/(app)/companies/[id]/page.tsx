"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
import { ArrowLeft, Save, Trash2, MapPin, Plus, Pencil, Users, Building2, Loader2 } from "lucide-react";
import { COUNTRIES } from "@/lib/constants";
import { useSession } from "@/lib/hooks";

interface Agency {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
}
interface Company {
  id: string;
  name: string;
  siret: string | null;
  address: string | null;
  city: string | null;
  country: string;
  postalCode: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  email: string | null;
  color: string;
  agencies: Agency[];
  _count: { technicians: number };
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316", "#6366F1", "#14B8A6"];
const EMPTY_AGENCY = { name: "", address: "", city: "", postalCode: "", lat: "", lng: "", phone: "" };

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useSession();
  const isAdmin = user?.role === "admin";

  const [company, setCompany] = useState<Company | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Agency dialog
  const [agOpen, setAgOpen] = useState(false);
  const [agEditId, setAgEditId] = useState<string | null>(null);
  const [agForm, setAgForm] = useState<Record<string, string>>(EMPTY_AGENCY);
  const [savingAg, setSavingAg] = useState(false);

  const fetchCompany = useCallback(async () => {
    const res = await fetch(`/api/companies/${id}`);
    if (res.ok) {
      const c: Company = await res.json();
      setCompany(c);
      setForm({
        name: c.name, siret: c.siret ?? "", address: c.address ?? "", city: c.city ?? "",
        postalCode: c.postalCode ?? "", country: c.country, lat: c.lat?.toString() ?? "",
        lng: c.lng?.toString() ?? "", phone: c.phone ?? "", email: c.email ?? "", color: c.color,
      });
      setDirty(false);
    }
  }, [id]);

  useEffect(() => { fetchCompany(); }, [fetchCompany]);

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); setDirty(true); }

  async function save() {
    setSaving(true);
    setError("");
    const res = await fetch(`/api/companies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) fetchCompany();
    else setError((await res.json().catch(() => ({}))).error || "Erreur");
  }

  async function removeCompany() {
    if (!company || !confirm(`Supprimer l'entreprise "${company.name}" ?`)) return;
    const res = await fetch(`/api/companies/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/companies");
    else setError((await res.json().catch(() => ({}))).error || "Suppression impossible");
  }

  // Agencies
  function openNewAgency() { setAgEditId(null); setAgForm(EMPTY_AGENCY); setAgOpen(true); }
  function openEditAgency(a: Agency) {
    setAgEditId(a.id);
    setAgForm({
      name: a.name, address: a.address ?? "", city: a.city ?? "", postalCode: a.postalCode ?? "",
      lat: a.lat?.toString() ?? "", lng: a.lng?.toString() ?? "", phone: a.phone ?? "",
    });
    setAgOpen(true);
  }
  async function saveAgency() {
    if (!agForm.name.trim()) return;
    setSavingAg(true);
    const url = agEditId ? `/api/agencies/${agEditId}` : `/api/companies/${id}/agencies`;
    const method = agEditId ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(agForm) });
    setSavingAg(false);
    if (res.ok) { setAgOpen(false); fetchCompany(); }
  }
  async function deleteAgency(a: Agency) {
    if (!confirm(`Supprimer l'agence "${a.name}" ? Les techniciens repassent au siege.`)) return;
    await fetch(`/api/agencies/${a.id}`, { method: "DELETE" });
    fetchCompany();
  }

  if (!company) return <div className="p-8 text-ink-500">Chargement...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Link href="/companies"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: company.color }} />
              {company.name}
            </h1>
            <p className="text-sm text-ink-500 flex items-center gap-1 mt-1">
              <Users className="w-4 h-4" /> {company._count.technicians} technicien{company._count.technicians > 1 ? "s" : ""}
              {company.city && <> · {company.city}</>}
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button variant="outline" size="sm" className="text-red-400 border-red-400/30 hover:bg-red-400/10" onClick={removeCompany}>
            <Trash2 className="w-4 h-4 mr-1" /> Supprimer
          </Button>
        )}
      </div>

      {error && <div className="bg-red-900/30 text-red-400 px-4 py-3 rounded-lg text-sm border border-red-800/50">{error}</div>}

      {/* Edition entreprise */}
      <Card>
        <CardHeader><CardTitle>Informations</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Nom *</Label><Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} disabled={!isAdmin} /></div>
            <div><Label>SIRET</Label><Input value={form.siret ?? ""} onChange={(e) => set("siret", e.target.value)} disabled={!isAdmin} /></div>
            <div className="col-span-2"><Label>Adresse</Label><Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} disabled={!isAdmin} /></div>
            <div><Label>Code postal</Label><Input value={form.postalCode ?? ""} onChange={(e) => set("postalCode", e.target.value)} disabled={!isAdmin} /></div>
            <div><Label>Ville</Label><Input value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} disabled={!isAdmin} /></div>
            <div>
              <Label>Pays</Label>
              <select className="w-full px-3 py-2 rounded-lg border border-ink-900/15 bg-white text-ink-900 text-sm disabled:opacity-60" value={form.country ?? "France"} onChange={(e) => set("country", e.target.value)} disabled={!isAdmin}>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><Label>Telephone</Label><Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} disabled={!isAdmin} /></div>
            <div><Label>Latitude</Label><Input type="number" step="any" value={form.lat ?? ""} onChange={(e) => set("lat", e.target.value)} disabled={!isAdmin} /></div>
            <div><Label>Longitude</Label><Input type="number" step="any" value={form.lng ?? ""} onChange={(e) => set("lng", e.target.value)} disabled={!isAdmin} /></div>
            <div className="col-span-2"><Label>Email</Label><Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} disabled={!isAdmin} /></div>
          </div>
          {isAdmin && (
            <div>
              <Label>Couleur</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button key={c} onClick={() => set("color", c)} className={`w-7 h-7 rounded-full border-2 ${form.color === c ? "border-white" : "border-transparent"}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          )}
          {isAdmin && (
            <div className="flex justify-end">
              <Button size="sm" disabled={!dirty || saving} onClick={save}>
                <Save className="w-4 h-4 mr-1" /> {saving ? "Sauvegarde..." : "Enregistrer"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agences */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Agences ({company.agencies.length})</CardTitle>
          {isAdmin && <Button size="sm" variant="outline" onClick={openNewAgency}><Plus className="w-4 h-4 mr-1" /> Ajouter une agence</Button>}
        </CardHeader>
        <CardContent>
          {company.agencies.length === 0 ? (
            <p className="text-sm text-ink-9000">Aucune agence. L&apos;entreprise n&apos;a que son siege.</p>
          ) : (
            <div className="space-y-2">
              {company.agencies.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-paper-2 group">
                  <div>
                    <div className="font-medium text-ink-900">{a.name}</div>
                    <div className="text-xs text-ink-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {[a.address, a.postalCode, a.city].filter(Boolean).join(", ") || "Adresse non renseignee"}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => openEditAgency(a)} className="p-1.5 text-ink-500 hover:text-ink-900"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => deleteAgency(a)} className="p-1.5 text-ink-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog agence */}
      <Dialog open={agOpen} onOpenChange={setAgOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{agEditId ? "Modifier l'agence" : "Nouvelle agence"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><Label>Nom *</Label><Input value={agForm.name} onChange={(e) => setAgForm((f) => ({ ...f, name: e.target.value }))} placeholder="ex: Agence Lyon" /></div>
              <div className="col-span-2"><Label>Adresse</Label><Input value={agForm.address} onChange={(e) => setAgForm((f) => ({ ...f, address: e.target.value }))} /></div>
              <div><Label>Code postal</Label><Input value={agForm.postalCode} onChange={(e) => setAgForm((f) => ({ ...f, postalCode: e.target.value }))} /></div>
              <div><Label>Ville</Label><Input value={agForm.city} onChange={(e) => setAgForm((f) => ({ ...f, city: e.target.value }))} /></div>
              <div><Label>Latitude</Label><Input type="number" step="any" value={agForm.lat} onChange={(e) => setAgForm((f) => ({ ...f, lat: e.target.value }))} placeholder="45.76" /></div>
              <div><Label>Longitude</Label><Input type="number" step="any" value={agForm.lng} onChange={(e) => setAgForm((f) => ({ ...f, lng: e.target.value }))} placeholder="4.83" /></div>
              <div className="col-span-2"><Label>Telephone</Label><Input value={agForm.phone} onChange={(e) => setAgForm((f) => ({ ...f, phone: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={saveAgency} disabled={savingAg || !agForm.name.trim()}>
              {savingAg && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{agEditId ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
