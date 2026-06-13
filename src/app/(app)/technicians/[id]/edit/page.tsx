"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Loader2, Trash2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { CONTRACT_TYPES, SERVICES, AVAILABILITY } from "@/lib/constants";
import { CITIES, findCity, nearestCity } from "@/lib/cities";

interface Company {
  id: string;
  name: string;
  color: string;
  lat: number | null;
  lng: number | null;
  agencies: { id: string; name: string; lat: number | null; lng: number | null }[];
}

interface Technician {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  service: string;
  contractType: string;
  contractStart: string | null;
  contractEnd: string | null;
  isActive: boolean;
  departureDate: string | null;
  availabilityStatus: string;
  availableUntil: string | null;
  notes: string | null;
  medicalVisitDate: string | null;
  medicalVisitPeriodicityMonths: number;
  drivingLicenses: string | null;
  medicalAptitude: string | null;
  medicalRestrictions: string | null;
  medicalRestrictionUntil: string | null;
  interventionCenterLat: number | null;
  interventionCenterLng: number | null;
  interventionRadiusKm: number;
  companyId: string;
  agencyId: string | null;
  company: { id: string; name: string; color: string };
  tags?: { name: string }[];
}

function isoToInput(d: string | null): string {
  if (!d) return "";
  return new Date(d).toISOString().split("T")[0];
}

export default function EditTechnicianPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);

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
    isActive: true,
    departureDate: "",
    availabilityStatus: "disponible",
    availableUntil: "",
    medicalVisitDate: "",
    medicalVisitPeriodicityMonths: "24",
    drivingLicenses: "",
    medicalAptitude: "",
    medicalRestrictions: "",
    medicalRestrictionUntil: "",
  });

  function addTag(name: string) {
    const n = name.trim();
    if (n && !tags.includes(n)) setTags((t) => [...t, n]);
    setTagInput("");
  }
  function removeTag(name: string) {
    setTags((t) => t.filter((x) => x !== name));
  }

  const fetchTech = useCallback(async () => {
    try {
      const res = await fetch(`/api/technicians/${id}`);
      if (!res.ok) {
        setError("Technicien introuvable");
        setLoading(false);
        return;
      }
      const tech: Technician = await res.json();
      setForm({
        firstName: tech.firstName,
        lastName: tech.lastName,
        email: tech.email,
        phone: tech.phone || "",
        companyId: tech.companyId,
        agencyId: tech.agencyId || "",
        service: tech.service,
        contractType: tech.contractType,
        contractStart: isoToInput(tech.contractStart),
        contractEnd: isoToInput(tech.contractEnd),
        interventionCenterLat: tech.interventionCenterLat?.toString() || "",
        interventionCenterLng: tech.interventionCenterLng?.toString() || "",
        interventionRadiusKm: tech.interventionRadiusKm.toString(),
        notes: tech.notes || "",
        medicalVisitDate: isoToInput(tech.medicalVisitDate),
        medicalVisitPeriodicityMonths: String(tech.medicalVisitPeriodicityMonths ?? 24),
        drivingLicenses: tech.drivingLicenses || "",
        medicalAptitude: tech.medicalAptitude || "",
        medicalRestrictions: tech.medicalRestrictions || "",
        medicalRestrictionUntil: isoToInput(tech.medicalRestrictionUntil),
        isActive: tech.isActive,
        departureDate: isoToInput(tech.departureDate),
        availabilityStatus: tech.availabilityStatus || "disponible",
        availableUntil: isoToInput(tech.availableUntil),
      });
      setTags((tech.tags ?? []).map((t) => t.name));
    } catch {
      setError("Erreur reseau");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTech();
  }, [fetchTech]);

  useEffect(() => {
    fetch("/api/companies")
      .then((r) => r.json())
      .then(setCompanies)
      .catch(() => {});
    fetch("/api/tags")
      .then((r) => r.json())
      .then((d: { name: string }[]) => setTagSuggestions(d.map((t) => t.name)))
      .catch(() => {});
  }, []);

  const selectedCompany = companies.find((c) => c.id === form.companyId);

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

    const res = await fetch(`/api/technicians/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || null,
        agencyId: form.agencyId || null,
        service: form.service,
        contractType: form.contractType,
        contractStart: form.contractStart || null,
        contractEnd: form.contractEnd || null,
        interventionCenterLat: form.interventionCenterLat
          ? parseFloat(form.interventionCenterLat)
          : null,
        interventionCenterLng: form.interventionCenterLng
          ? parseFloat(form.interventionCenterLng)
          : null,
        interventionRadiusKm: parseInt(form.interventionRadiusKm) || 50,
        notes: form.notes || null,
        medicalVisitDate: form.medicalVisitDate || null,
        medicalVisitPeriodicityMonths: parseInt(form.medicalVisitPeriodicityMonths) || 24,
        drivingLicenses: form.drivingLicenses || null,
        medicalAptitude: form.medicalAptitude || null,
        medicalRestrictions: form.medicalRestrictions || null,
        medicalRestrictionUntil: form.medicalRestrictionUntil || null,
        isActive: form.isActive,
        departureDate: form.departureDate || null,
        availabilityStatus: form.availabilityStatus,
        availableUntil: form.availableUntil || null,
        tags,
      }),
    });

    if (res.ok) {
      router.push(`/technicians/${id}`);
    } else {
      const data = await res.json();
      setError(data.error || "Erreur lors de la mise a jour");
    }
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/technicians/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/technicians");
    } else {
      setError("Erreur lors de la suppression");
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-ink-500" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href={`/technicians/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Modifier le technicien</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-red-400 border-red-400/30 hover:bg-red-400/10"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Supprimer
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-900/30 text-red-400 px-4 py-3 rounded-lg text-sm border border-red-800/50">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              Identite
              <Badge
                variant="outline"
                style={{
                  backgroundColor: form.isActive ? "#10B98120" : "#EF444420",
                  color: form.isActive ? "#10B981" : "#EF4444",
                  borderColor: form.isActive ? "#10B98140" : "#EF444440",
                }}
              >
                {form.isActive ? "Actif" : "Inactif"}
              </Badge>
            </CardTitle>
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
              <Label>Entreprise</Label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-ink-900/10 bg-paper-2 text-sm">
                {selectedCompany && (
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                    style={{ backgroundColor: selectedCompany.color }}
                  />
                )}
                <span>{selectedCompany?.name || "..."}</span>
              </div>
              <p className="text-xs text-ink-400 mt-1">
                Le changement d&apos;entreprise n&apos;est pas permis. Recrez la fiche si necessaire.
              </p>
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
            <CardTitle>Statut</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label>Actif</Label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-ink-900/15 bg-white text-ink-900 text-sm"
                value={form.isActive ? "true" : "false"}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.value === "true" }))
                }
              >
                <option value="true">Actif</option>
                <option value="false">Inactif (depart)</option>
              </select>
              {!form.isActive && (
                <p className="text-xs text-amber-400 mt-1">
                  Le passage en inactif programme automatiquement la suppression RGPD dans 12 mois.
                </p>
              )}
            </div>
            <div>
              <Label>Date de depart</Label>
              <Input
                type="date"
                value={form.departureDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, departureDate: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Disponibilite</Label>
              <select
                className="w-full px-3 py-2 rounded-lg border border-ink-900/15 bg-white text-ink-900 text-sm"
                value={form.availabilityStatus}
                onChange={(e) =>
                  setForm((f) => ({ ...f, availabilityStatus: e.target.value }))
                }
              >
                {AVAILABILITY.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>
                {form.availabilityStatus === "en_mission" ? "En mission jusqu'au" : "Indisponible jusqu'au"}
              </Label>
              <Input
                type="date"
                disabled={form.availabilityStatus === "disponible"}
                value={form.availableUntil}
                onChange={(e) =>
                  setForm((f) => ({ ...f, availableUntil: e.target.value }))
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
            <div className="col-span-2">
              <Label>Ville de rattachement</Label>
              <select
                className="w-full px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm h-10"
                value={(() => {
                  const lat = parseFloat(form.interventionCenterLat);
                  const lng = parseFloat(form.interventionCenterLng);
                  return Number.isFinite(lat) && Number.isFinite(lng)
                    ? nearestCity(lat, lng)?.name ?? ""
                    : "";
                })()}
                onChange={(e) => {
                  const c = findCity(e.target.value);
                  setForm((f) => ({
                    ...f,
                    interventionCenterLat: c ? String(c.lat) : "",
                    interventionCenterLng: c ? String(c.lng) : "",
                  }));
                }}
              >
                <option value="">— Choisir une ville —</option>
                {CITIES.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
              <p className="text-xs text-ink-400 mt-1">
                Centre de la zone d&apos;intervention. La recherche d&apos;equipe par ville s&apos;appuie dessus.
              </p>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Suivi medical &amp; permis</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div>
              <Label>Derniere visite medicale</Label>
              <Input
                type="date"
                value={form.medicalVisitDate}
                onChange={(e) => setForm((f) => ({ ...f, medicalVisitDate: e.target.value }))}
              />
            </div>
            <div>
              <Label>Periodicite</Label>
              <select
                className="w-full px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm h-10"
                value={form.medicalVisitPeriodicityMonths}
                onChange={(e) => setForm((f) => ({ ...f, medicalVisitPeriodicityMonths: e.target.value }))}
              >
                <option value="24">24 mois (suivi renforce)</option>
                <option value="36">36 mois (nuit / jeune)</option>
                <option value="48">48 mois (aptitude SIR)</option>
                <option value="60">60 mois (suivi standard)</option>
              </select>
              <p className="text-xs text-ink-400 mt-1">Prochaine echeance = date + periodicite.</p>
            </div>
            <div>
              <Label>Permis de conduire</Label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {["B", "BE", "C", "CE", "D"].map((cat) => {
                  const has = form.drivingLicenses.split(",").map((s) => s.trim()).includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() =>
                        setForm((f) => {
                          const set = new Set(f.drivingLicenses.split(",").map((s) => s.trim()).filter(Boolean));
                          if (set.has(cat)) set.delete(cat); else set.add(cat);
                          return { ...f, drivingLicenses: Array.from(set).join(",") };
                        })
                      }
                      className={`px-3 py-1.5 rounded-md text-sm font-medium border transition ${
                        has ? "bg-signal-500 border-signal-600 text-[#0B1220]" : "border-ink-900/15 text-ink-500 hover:border-signal-500"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-ink-400 mt-1">Le scan du permis et le CV se deposent dans l&apos;onglet Documents.</p>
            </div>

            <div className="col-span-3 border-t border-ink-900/10 pt-4">
              <Label>Aptitude (medecin du travail)</Label>
              <div className="grid grid-cols-3 gap-4 mt-1">
                <select
                  className="px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm h-10"
                  value={form.medicalAptitude}
                  onChange={(e) => setForm((f) => ({ ...f, medicalAptitude: e.target.value }))}
                >
                  <option value="">Non renseignee</option>
                  <option value="apte">Apte</option>
                  <option value="apte_restrictions">Apte avec restrictions</option>
                  <option value="inapte_temp">Inapte temporaire</option>
                  <option value="inapte">Inapte</option>
                </select>
                {form.medicalAptitude === "inapte_temp" && (
                  <div>
                    <Input type="date" value={form.medicalRestrictionUntil} onChange={(e) => setForm((f) => ({ ...f, medicalRestrictionUntil: e.target.value }))} />
                    <p className="text-xs text-ink-400 mt-1">Inaptitude jusqu&apos;au</p>
                  </div>
                )}
              </div>
              {(form.medicalAptitude === "apte_restrictions" || form.medicalAptitude === "inapte_temp") && (
                <div className="flex flex-wrap gap-1.5 pt-3">
                  {[["hauteur", "Travail en hauteur"], ["charges", "Port de charges"], ["conduite", "Conduite"], ["vision", "Taches visuelles"], ["nuit", "Travail de nuit"]].map(([val, lbl]) => {
                    const has = form.medicalRestrictions.split(",").map((s) => s.trim()).includes(val);
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setForm((f) => {
                          const set = new Set(f.medicalRestrictions.split(",").map((s) => s.trim()).filter(Boolean));
                          if (set.has(val)) set.delete(val); else set.add(val);
                          return { ...f, medicalRestrictions: Array.from(set).join(",") };
                        })}
                        className={`px-3 py-1.5 rounded-md text-sm border transition ${has ? "bg-amber-500 border-amber-600 text-[#0B1220]" : "border-ink-900/15 text-ink-500 hover:border-amber-500"}`}
                      >
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-ink-400 mt-2">Secret medical : aucune donnee de diagnostic. Un &laquo; Inapte &raquo; bloque l&apos;affectation aux missions.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Etiquettes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <span key={t} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-paper-2 text-ink-900">
                  {t}
                  <button type="button" onClick={() => removeTag(t)} className="text-ink-500 hover:text-red-400">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {tags.length === 0 && <span className="text-xs text-ink-400">Aucune etiquette.</span>}
            </div>
            <div className="flex gap-2">
              <Input
                list="tag-suggestions"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); }
                }}
                placeholder="ex: vehicule, habilite hauteur, anglais, permis B..."
              />
              <datalist id="tag-suggestions">
                {tagSuggestions.map((s) => <option key={s} value={s} />)}
              </datalist>
              <Button type="button" variant="outline" onClick={() => addTag(tagInput)} disabled={!tagInput.trim()}>
                Ajouter
              </Button>
            </div>
            <p className="text-xs text-ink-400">Entree ou « Ajouter ». Les etiquettes sont cherchables.</p>
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
          <Link href={`/technicians/${id}`}>
            <Button variant="outline">Annuler</Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            <Save className="w-4 h-4 mr-2" />
            Enregistrer
          </Button>
        </div>
      </form>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-ink-500 py-4">
            Cette action est irreversible. Le technicien{" "}
            <strong className="text-ink-800">
              {form.firstName} {form.lastName}
            </strong>{" "}
            sera definitivement supprime avec toutes ses competences et
            certifications.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Annuler</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? "Suppression..." : "Supprimer definitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
