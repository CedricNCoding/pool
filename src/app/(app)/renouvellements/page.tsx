"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { RefreshCw, Loader2, CalendarClock, CheckCircle } from "lucide-react";
import PageHelp from "@/components/PageHelp";

interface Row {
  id: string; expiryDate: string | null; renewalStatus: string; renewalDate: string | null; renewalOrganism: string | null;
  certification: { name: string };
  technician: { id: string; firstName: string; lastName: string; company: { name: string; color: string } | null };
}
const RSTATUS: Record<string, { label: string; color: string }> = {
  ok: { label: "À détecter", color: "#94A3B8" }, a_planifier: { label: "À planifier", color: "#E89B2C" },
  convoque: { label: "Convoqué", color: "#3B82F6" }, realise: { label: "Réalisé", color: "#10B981" },
};
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");
function expClass(d: string | null) {
  if (!d) return "text-ink-400";
  const t = new Date(d).getTime();
  if (t < Date.now()) return "text-red-600 font-medium";
  if (t < Date.now() + 30 * 86400000) return "text-amber-600";
  return "text-ink-600";
}

export default function RenouvellementsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [days, setDays] = useState("120");
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => { setLoading(true); fetch(`/api/renewals?days=${days}`).then((r) => r.json()).then((d) => setRows(Array.isArray(d) ? d : [])).finally(() => setLoading(false)); }, [days]);
  useEffect(() => { load(); }, [load]);

  async function quick(id: string, renewalStatus: string) {
    await fetch(`/api/renewals/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ renewalStatus }) });
    load();
  }

  const [act, setAct] = useState<{ row: Row; mode: "convoque" | "realise" } | null>(null);
  const [f, setF] = useState({ renewalDate: "", renewalOrganism: "", newExpiryDate: "" });
  function openAct(row: Row, mode: "convoque" | "realise") { setAct({ row, mode }); setF({ renewalDate: "", renewalOrganism: "", newExpiryDate: "" }); }
  async function saveAct() {
    if (!act) return;
    const body = act.mode === "convoque"
      ? { renewalStatus: "convoque", renewalDate: f.renewalDate, renewalOrganism: f.renewalOrganism }
      : { renewalStatus: "realise", renewalDate: f.renewalDate, newExpiryDate: f.newExpiryDate };
    await fetch(`/api/renewals/${act.row.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setAct(null); load();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3"><RefreshCw className="w-6 h-6 text-ink-600" /><h1 className="text-2xl font-bold">Renouvellements d&apos;habilitations</h1></div>
        <select className="px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm" value={days} onChange={(e) => setDays(e.target.value)}>
          <option value="30">Échéance &lt; 30 j</option><option value="60">&lt; 60 j</option><option value="90">&lt; 90 j</option><option value="120">&lt; 120 j</option>
        </select>
      </div>
      <PageHelp>
        Anticipez les recyclages des habilitations sécurité <strong>avant</strong> qu&apos;elles n&apos;expirent (une fois expirées, elles bloquent l&apos;affectation aux missions). Réglez l&apos;horizon en haut à droite, puis faites avancer chaque titre : <strong>Planifier → Convoquer</strong> (date + organisme) <strong>→ Réalisé</strong> (saisit la nouvelle date d&apos;expiration).
      </PageHelp>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-ink-500 border-b border-ink-900/10">
              <tr><th className="text-left py-2 px-4">Technicien</th><th className="text-left py-2 px-3">Habilitation</th><th className="text-left py-2 px-3">Expire</th><th className="text-left py-2 px-3">Suivi</th><th className="text-right py-2 px-4">Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const st = RSTATUS[r.renewalStatus] ?? RSTATUS.ok;
                return (
                  <tr key={r.id} className="border-b border-ink-900/10">
                    <td className="py-2 px-4"><Link href={`/technicians/${r.technician.id}`} className="font-medium hover:underline">{r.technician.firstName} {r.technician.lastName}</Link></td>
                    <td className="py-2 px-3 text-ink-600">{r.certification.name}</td>
                    <td className={`py-2 px-3 ${expClass(r.expiryDate)}`}>{fmt(r.expiryDate)}</td>
                    <td className="py-2 px-3"><Badge variant="outline" style={{ color: st.color, borderColor: st.color + "55" }}>{st.label}</Badge>{r.renewalOrganism ? <span className="text-xs text-ink-400 ml-1">{r.renewalOrganism}</span> : ""}</td>
                    <td className="py-2 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(r.renewalStatus === "ok") && <Button size="sm" variant="outline" onClick={() => quick(r.id, "a_planifier")}>Planifier</Button>}
                        {r.renewalStatus !== "convoque" && <Button size="sm" variant="outline" onClick={() => openAct(r, "convoque")}><CalendarClock className="w-3.5 h-3.5 mr-1" />Convoquer</Button>}
                        <Button size="sm" onClick={() => openAct(r, "realise")}><CheckCircle className="w-3.5 h-3.5 mr-1" />Réalisé</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={5} className="text-center py-10 text-ink-400">{loading ? "Chargement…" : "Aucune habilitation à renouveler sur cet horizon."}</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={!!act} onOpenChange={(o) => !o && setAct(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{act?.mode === "convoque" ? "Convoquer au recyclage" : "Marquer comme réalisé"} — {act?.row.certification.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>{act?.mode === "convoque" ? "Date de session" : "Date de réalisation"}</Label><Input type="date" value={f.renewalDate} onChange={(e) => setF((x) => ({ ...x, renewalDate: e.target.value }))} /></div>
            {act?.mode === "convoque" && <div><Label>Organisme</Label><Input value={f.renewalOrganism} onChange={(e) => setF((x) => ({ ...x, renewalOrganism: e.target.value }))} placeholder="ex: APAVE, Bureau Veritas…" /></div>}
            {act?.mode === "realise" && <div><Label>Nouvelle date d&apos;expiration</Label><Input type="date" value={f.newExpiryDate} onChange={(e) => setF((x) => ({ ...x, newExpiryDate: e.target.value }))} /></div>}
          </div>
          <DialogFooter><DialogClose asChild><Button variant="outline">Annuler</Button></DialogClose><Button onClick={saveAct}>Enregistrer</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
