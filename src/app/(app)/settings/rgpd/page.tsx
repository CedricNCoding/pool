"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Shield, Trash2, Clock, AlertTriangle, Loader2, FileText } from "lucide-react";

interface PendingDeletion {
  id: string;
  firstName: string;
  lastName: string;
  company: { name: string };
  departureDate: string;
  scheduledDeletionDate: string;
  daysLeft: number;
}

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: { name: string } | null;
}

export default function RgpdPage() {
  const [pending, setPending] = useState<PendingDeletion[]>([]);
  const [audits, setAudits] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings/rgpd").then((r) => r.json()),
      fetch("/api/settings/rgpd/audit").then((r) => r.json()),
    ])
      .then(([p, a]) => {
        setPending(p);
        setAudits(a);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleDeleteNow(id: string) {
    if (!confirm("Supprimer definitivement ce technicien et toutes ses donnees ? Cette action est irreversible.")) return;
    await fetch(`/api/technicians/${id}`, { method: "DELETE" });
    setPending((p) => p.filter((t) => t.id !== id));
  }

  const actionLabels: Record<string, string> = {
    login: "Connexion",
    create: "Creation",
    update: "Modification",
    delete: "Suppression",
    export: "Export",
    import: "Import",
    api_access: "Acces API",
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-6 h-6 text-slate-700" />
        <h1 className="text-2xl font-bold">Conformite RGPD</h1>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Suppressions programmees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500 mb-4">
              Les donnees des techniciens sont conservees 12 mois apres leur depart, conformement a la politique de retention RGPD.
            </p>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : pending.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">
                Aucune suppression programmee
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Technicien</TableHead>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Date de depart</TableHead>
                    <TableHead>Suppression prevue</TableHead>
                    <TableHead>Jours restants</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">
                        {t.firstName} {t.lastName}
                      </TableCell>
                      <TableCell>{t.company.name}</TableCell>
                      <TableCell>
                        {new Date(t.departureDate).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>
                        {new Date(t.scheduledDeletionDate).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            t.daysLeft <= 30
                              ? "bg-red-50 text-red-700 border-red-200"
                              : t.daysLeft <= 90
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-slate-50 text-slate-700 border-slate-200"
                          }
                        >
                          {t.daysLeft}j
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteNow(t.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Supprimer maintenant
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Journal d&apos;audit (50 dernieres actions)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audits.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {new Date(a.createdAt).toLocaleString("fr-FR")}
                      </TableCell>
                      <TableCell className="text-sm">{a.user?.name || "Systeme"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{actionLabels[a.action] || a.action}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{a.entityType}</TableCell>
                      <TableCell className="text-sm text-slate-500 max-w-xs truncate">
                        {a.details}
                      </TableCell>
                      <TableCell className="text-xs text-slate-400 font-mono">{a.ipAddress}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Politique de donnees
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 space-y-2">
            <p><strong>Donnees collectees :</strong> Nom, prenom, email, telephone, entreprise, competences, certifications, zone d&apos;intervention.</p>
            <p><strong>Retention :</strong> 12 mois apres la date de depart du technicien.</p>
            <p><strong>Droit a l&apos;effacement :</strong> Un administrateur peut supprimer les donnees a tout moment.</p>
            <p><strong>Droit d&apos;acces :</strong> Export CSV disponible pour les techniciens du perimetre.</p>
            <p><strong>Journal d&apos;audit :</strong> Toutes les operations sont tracees avec l&apos;identite de l&apos;utilisateur et l&apos;adresse IP.</p>
            <p><strong>Securite :</strong> Authentification par token JWT, mots de passe haches (bcrypt), cles API hashees (SHA-256).</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
