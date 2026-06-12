"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { HelpingHand, Loader2, Check, X } from "lucide-react";
import { useSession } from "@/lib/hooks";

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "En attente", color: "#B45309", bg: "rgba(232,155,44,0.12)" },
  accepted: { label: "Acceptée", color: "#047857", bg: "rgba(16,185,129,0.12)" },
  declined: { label: "Refusée", color: "#B91C1C", bg: "rgba(239,68,68,0.10)" },
};

interface Row {
  id: string;
  status: string;
  statusLabel: string;
  message: string;
  adminNote: string | null;
  createdAt: string;
  // vue gestionnaire
  code?: string;
  service?: string;
  company?: string | null;
  companyColor?: string | null;
  // vue admin
  technician?: {
    id: string; firstName: string; lastName: string; email: string; phone: string | null;
    service: string; company: { name: string; color: string };
  };
  requesterCompany?: { name: string; color: string } | null;
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.pending;
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium" style={{ color: s.color, backgroundColor: s.bg }}>
      {s.label}
    </span>
  );
}

export default function RenfortsPage() {
  const { user } = useSession();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolve, setResolve] = useState<{ row: Row; status: "accepted" | "declined" } | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/assistance")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  function openResolve(row: Row, status: "accepted" | "declined") {
    setResolve({ row, status });
    setNote("");
  }
  async function confirmResolve() {
    if (!resolve) return;
    setSaving(true);
    await fetch(`/api/assistance/${resolve.row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: resolve.status, adminNote: note }),
    });
    setSaving(false);
    setResolve(null);
    load();
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <HelpingHand className="w-6 h-6 text-ink-600" />
        <h1 className="text-2xl font-bold">{isAdmin ? "Demandes de renfort" : "Mes demandes de renfort"}</h1>
        <Badge variant="secondary">{rows.length}</Badge>
      </div>

      {!isAdmin && (
        <p className="text-sm text-ink-500 max-w-2xl">
          Demandes émises depuis « Chercher une équipe » pour un technicien d&apos;une autre société.
          L&apos;identité reste masquée ; l&apos;administrateur organise la mise en relation.
        </p>
      )}

      {loading ? (
        <div className="text-ink-500">Chargement…</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-ink-400">
          {isAdmin ? "Aucune demande de renfort." : "Vous n'avez pas encore émis de demande de renfort."}
        </CardContent></Card>
      ) : isAdmin ? (
        /* ----- Vue admin : arbitrage (identité réelle) ----- */
        <Card><CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-ink-500 border-b border-ink-900/10">
              <tr>
                <th className="text-left py-2.5 px-4">Demandeur</th>
                <th className="text-left py-2.5 px-4">Technicien sollicité</th>
                <th className="text-left py-2.5 px-4">Besoin</th>
                <th className="text-left py-2.5 px-4">Statut</th>
                <th className="text-right py-2.5 px-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-ink-900/10 align-top">
                  <td className="py-3 px-4">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.requesterCompany?.color }} />
                      {r.requesterCompany?.name ?? "—"}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-ink-900">{r.technician?.firstName} {r.technician?.lastName}</div>
                    <div className="text-xs text-ink-500 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.technician?.company.color }} />
                      {r.technician?.company.name} · {r.technician?.service}
                    </div>
                    <div className="text-xs text-ink-400 mt-0.5">{r.technician?.email}{r.technician?.phone ? ` · ${r.technician.phone}` : ""}</div>
                  </td>
                  <td className="py-3 px-4 text-ink-600 max-w-[320px]">
                    {r.message}
                    {r.adminNote && <div className="text-xs text-ink-400 mt-1">Note : {r.adminNote}</div>}
                  </td>
                  <td className="py-3 px-4"><StatusBadge status={r.status} /></td>
                  <td className="py-3 px-4 text-right">
                    {r.status === "pending" ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button size="sm" onClick={() => openResolve(r, "accepted")}>
                          <Check className="w-3.5 h-3.5 mr-1" />Accepter
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openResolve(r, "declined")}>
                          <X className="w-3.5 h-3.5 mr-1" />Refuser
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-ink-400">traitée</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      ) : (
        /* ----- Vue gestionnaire : ses demandes (anonymisé) ----- */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-medium text-ink-900">{r.code}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div className="text-xs text-ink-500 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: r.companyColor ?? "#999" }} />
                  {r.company} · {r.service}
                </div>
                <p className="text-sm text-ink-600">{r.message}</p>
                {r.adminNote && (
                  <p className="text-xs text-ink-500 border-t border-ink-900/10 pt-2">
                    <span className="font-medium">Réponse de l&apos;administrateur :</span> {r.adminNote}
                  </p>
                )}
                <p className="text-[11px] text-ink-400">{new Date(r.createdAt).toLocaleDateString("fr-FR")}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog admin : accepter / refuser + note */}
      <Dialog open={!!resolve} onOpenChange={(o) => !o && setResolve(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{resolve?.status === "accepted" ? "Accepter la demande" : "Refuser la demande"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-ink-500">
              {resolve?.status === "accepted"
                ? "Vous organisez la mise en relation. L'identité du technicien n'est pas révélée au demandeur."
                : "Le demandeur sera informé du refus."}
            </p>
            <div>
              <Label>Note pour le demandeur (optionnel)</Label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm"
                placeholder="ex : OK, je vous recontacte pour caler les dates."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose>
            <Button onClick={confirmResolve} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {resolve?.status === "accepted" ? "Accepter" : "Refuser"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
