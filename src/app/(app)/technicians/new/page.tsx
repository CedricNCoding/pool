"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { CONTRACT_TYPES, SERVICES, COUNTRIES } from "@/lib/constants";
import Link from "next/link";

interface Company {
  id: string;
  name: string;
  color: string;
  lat: number | null;
  lng: number | null;
  agencies: { id: string; name: string; lat: number | null; lng: number | null }[];
}

export default function NewTechnicianPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    companyId: "",
    agencyId: "",
    service: "tech",
    contractType: "CDI",
    contractStart: "",
    contractEnd: "",
    interventionCenterLat: "",
    interventionCenterLng: "",
    interventionRadiusKm: "50",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then(setCompanies)
      .catch(() => {});
  }, []);

  const selectedCompany = companies.find((c) => c.id === form.companyId);

  function handleCompanyChange(companyId: string) {
    const company = companies.find((c) => c.id === companyId);
    setForm((f) => ({
      ...f,
      companyId,
      agencyId: "",
      interventionCenterLat: company?.lat?.toString() || f.interventionCenterLat,
      interventionCenterLng: company?.lng?.toString() || f.interventionCenterLng,
    }));
  }

  function handleAgencyChange(agencyId: string) {
    const agency = selectedCompany?.agencies.find((a) => a.id === agencyId);
    if (agency?.lat && agency?.lng) {
      setForm((f) => ({
        ...f,
        agencyId,
        interventionCenterLat: agency.lat!.toString(),
        interventionCenterLng: agency.lng!.toString(),
      }));
    } else {
      setForm((f) => ({ ...f, agencyId }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch("/api/technicians", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        interventionCenterLat: form.interventionCenterLat
          ? parseFloat(form.interventionCenterLat)
          : null,
        interventionCenterLng: form.interventionCenterLng
          ? parseFloat(form.interventionCenterLng)
          : null,
        interventionRadiusKm: parseInt(form.interventionRadiusKm) || 50,
        contractStart: form.contractStart || null,
        contractEnd: form.contractEnd || null,
      }),
    });

    if (res.ok) {
      const tech = await res.json();
      router.push(`/technicians/${tech.id}`);
    } else {
      const data = await res.json();
      setError(data.error || "Erreur lors de la creation");
    }
    setSaving(false);
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/technicians">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Nouveau technicien</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Identite</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prenom *</Label>
              <Input
                value={form.firstName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, firstName: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <Label>Nom *</Label>
              <Input
                value={form.lastName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lastName: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <Label>Telephone</Label>
              <Input
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Entreprise & Poste</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label>Entreprise *</Label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-ink-900/15 bg-white text-ink-900 text-sm"
                value={form.companyId}
                onChange={(e) => handleCompanyChange(e.target.value)}
                required
              >
                <option value="">Selectionner...</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Agence</Label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-ink-900/15 bg-white text-ink-900 text-sm"
                value={form.agencyId}
                onChange={(e) => handleAgencyChange(e.target.value)}
                disabled={!selectedCompany?.agencies.length}
              >
                <option value="">Siege / Aucune</option>
                {selectedCompany?.agencies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Service</Label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-ink-900/15 bg-white text-ink-900 text-sm"
                value={form.service}
                onChange={(e) =>
                  setForm((f) => ({ ...f, service: e.target.value }))
                }
              >
                {SERVICES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Type de contrat</Label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-ink-900/15 bg-white text-ink-900 text-sm"
                value={form.contractType}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contractType: e.target.value }))
                }
              >
                {CONTRACT_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Date debut contrat</Label>
              <Input
                type="date"
                value={form.contractStart}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contractStart: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Date fin contrat</Label>
              <Input
                type="date"
                value={form.contractEnd}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contractEnd: e.target.value }))
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Zone d&apos;intervention</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div>
              <Label>Latitude</Label>
              <Input
                type="number"
                step="any"
                value={form.interventionCenterLat}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    interventionCenterLat: e.target.value,
                  }))
                }
                placeholder="48.8566"
              />
            </div>
            <div>
              <Label>Longitude</Label>
              <Input
                type="number"
                step="any"
                value={form.interventionCenterLng}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    interventionCenterLng: e.target.value,
                  }))
                }
                placeholder="2.3522"
              />
            </div>
            <div>
              <Label>Rayon (km)</Label>
              <Input
                type="number"
                value={form.interventionRadiusKm}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    interventionRadiusKm: e.target.value,
                  }))
                }
              />
            </div>
            <p className="col-span-3 text-xs text-ink-400">
              Les coordonnees sont pre-remplies depuis l&apos;adresse de l&apos;entreprise ou de l&apos;agence selectionnee.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="Notes internes (non visibles via l'API)..."
              rows={4}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/technicians">
            <Button variant="outline">Annuler</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            <Save className="w-4 h-4 mr-2" />
            Creer le technicien
          </Button>
        </div>
      </form>
    </div>
  );
}
