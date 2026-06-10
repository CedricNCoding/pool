"use client";

import Link from "next/link";
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
import { Building2, Plus, Users, MapPin, Loader2 } from "lucide-react";
import { COUNTRIES } from "@/lib/constants";
import { useSession } from "@/lib/hooks";

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
  agencies: { id: string; name: string; city: string | null }[];
  _count: { technicians: number };
}

const COMPANY_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#6366F1", "#14B8A6",
];

export default function CompaniesPage() {
  const { user } = useSession();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", siret: "", address: "", city: "", country: "France",
    postalCode: "", lat: "", lng: "", phone: "", email: "", color: "#3B82F6",
  });

  function loadCompanies() {
    setLoading(true);
    fetch("/api/companies")
      .then((r) => r.json())
      .then(setCompanies)
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadCompanies(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        lat: form.lat ? parseFloat(form.lat) : null,
        lng: form.lng ? parseFloat(form.lng) : null,
      }),
    });
    if (res.ok) {
      setShowNew(false);
      setForm({ name: "", siret: "", address: "", city: "", country: "France", postalCode: "", lat: "", lng: "", phone: "", email: "", color: "#3B82F6" });
      loadCompanies();
    }
    setSaving(false);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-ink-600" />
          <h1 className="text-2xl font-bold">Entreprises</h1>
          <Badge variant="secondary">{companies.length}</Badge>
        </div>
        {user?.role === "admin" && (
          <Dialog open={showNew} onOpenChange={setShowNew}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle entreprise
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nouvelle entreprise</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nom *</Label>
                    <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
                  </div>
                  <div>
                    <Label>SIRET</Label>
                    <Input value={form.siret} onChange={(e) => setForm(f => ({ ...f, siret: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <Label>Adresse</Label>
                    <Input value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Ville</Label>
                    <Input value={form.city} onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Code postal</Label>
                    <Input value={form.postalCode} onChange={(e) => setForm(f => ({ ...f, postalCode: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Pays</Label>
                    <select className="w-full px-3 py-2 rounded-lg border border-ink-900/15 bg-white text-ink-900 text-sm" value={form.country} onChange={(e) => setForm(f => ({ ...f, country: e.target.value }))}>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Telephone</Label>
                    <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Latitude</Label>
                    <Input type="number" step="any" value={form.lat} onChange={(e) => setForm(f => ({ ...f, lat: e.target.value }))} placeholder="48.8566" />
                  </div>
                  <div>
                    <Label>Longitude</Label>
                    <Input type="number" step="any" value={form.lng} onChange={(e) => setForm(f => ({ ...f, lng: e.target.value }))} placeholder="2.3522" />
                  </div>
                  <div className="col-span-2">
                    <Label>Couleur</Label>
                    <div className="flex gap-2 mt-1">
                      {COMPANY_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 transition ${form.color === c ? "border-slate-900 scale-110" : "border-transparent"}`}
                          style={{ backgroundColor: c }}
                          onClick={() => setForm(f => ({ ...f, color: c }))}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Annuler</Button>
                  </DialogClose>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Creer
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-ink-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <Link key={company.id} href={`/companies/${company.id}`} className="block">
            <Card className="hover:shadow-lg hover:border-ink-900/15 transition cursor-pointer h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: company.color }}
                    >
                      {company.name.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="text-base">{company.name}</CardTitle>
                      {company.city && (
                        <p className="text-sm text-ink-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {company.city}, {company.country}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-ink-500">
                    <Users className="w-4 h-4" />
                    <span>{company._count.technicians} technicien{company._count.technicians > 1 ? "s" : ""}</span>
                  </div>
                  {company.agencies.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {company.agencies.length} agence{company.agencies.length > 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>
                {company.siret && (
                  <p className="text-xs text-ink-500 mt-2">SIRET: {company.siret}</p>
                )}
              </CardContent>
            </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
