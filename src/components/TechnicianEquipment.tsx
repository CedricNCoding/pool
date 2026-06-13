"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HardHat, Plus, Loader2, Undo2 } from "lucide-react";

interface Equip { id: string; name: string; category: string; serialNumber: string | null; brand: string | null; model: string | null; expiryDate: string | null; nextCheckDate: string | null; status: string }
interface Assignment { id: string; assignedAt: string; returnedAt: string | null; equipment: Equip }

const CAT_LABEL: Record<string, string> = { epi: "EPI", outillage: "Outillage", electroportatif: "Électroportatif", instrument: "Instrument", vehicule: "Véhicule", autre: "Autre" };
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");
function dateClass(d: string | null) {
  if (!d) return "text-ink-400";
  const t = new Date(d).getTime();
  if (t < Date.now()) return "text-red-600 font-medium";
  if (t < Date.now() + 60 * 86400000) return "text-amber-600";
  return "text-ink-500";
}

export default function TechnicianEquipment({ technicianId }: { technicianId: string }) {
  const [current, setCurrent] = useState<Assignment[]>([]);
  const [past, setPast] = useState<Assignment[]>([]);
  const [available, setAvailable] = useState<Equip[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [pick, setPick] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/technicians/${technicianId}/equipment`).then((r) => r.json()).then((d) => { setCurrent(d.current || []); setPast(d.past || []); }).finally(() => setLoading(false));
    fetch(`/api/equipment`).then((r) => r.json()).then((d) => setAvailable((Array.isArray(d) ? d : []).filter((e: Equip) => e.status === "disponible"))).catch(() => {});
  }, [technicianId]);
  useEffect(() => { load(); }, [load]);

  async function assign() {
    if (!pick) return;
    setAdding(true);
    await fetch(`/api/equipment/${pick}/assign`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ technicianId }) });
    setAdding(false); setPick(""); load();
  }
  async function ret(equipmentId: string) {
    if (!confirm("Restituer cet équipement ?")) return;
    await fetch(`/api/equipment/${equipmentId}/assign`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ return: true }) });
    load();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 className="font-semibold text-ink-900 flex items-center gap-2"><HardHat className="w-4 h-4 text-signal-500" /> Dotation en cours</h3>
            <div className="flex items-center gap-2">
              <select className="px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm" value={pick} onChange={(e) => setPick(e.target.value)}>
                <option value="">Attribuer un équipement…</option>
                {available.map((e) => <option key={e.id} value={e.id}>{e.name}{e.serialNumber ? ` (${e.serialNumber})` : ""}</option>)}
              </select>
              <Button size="sm" onClick={assign} disabled={!pick || adding}>{adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}</Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-ink-400"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
          ) : current.length === 0 ? (
            <p className="text-sm text-ink-400">Aucun équipement attribué. Utilisez le menu ci-dessus, ou le <Link href="/epi" className="text-signal-600 hover:underline">registre EPI</Link>.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-xs text-ink-500 border-b border-ink-900/10">
                <tr><th className="text-left py-1.5">Équipement</th><th className="text-left py-1.5">N° série</th><th className="text-left py-1.5">Attribué le</th><th className="text-left py-1.5">Proch. VGP</th><th></th></tr>
              </thead>
              <tbody>
                {current.map((a) => (
                  <tr key={a.id} className="border-b border-ink-900/10">
                    <td className="py-2">
                      <div className="font-medium text-ink-900">{a.equipment.name}</div>
                      <div className="text-xs text-ink-400">{CAT_LABEL[a.equipment.category] ?? a.equipment.category}{(a.equipment.brand || a.equipment.model) ? ` · ${[a.equipment.brand, a.equipment.model].filter(Boolean).join(" ")}` : ""}</div>
                    </td>
                    <td className="py-2 font-mono text-xs">{a.equipment.serialNumber || "—"}</td>
                    <td className="py-2 text-ink-500">{fmt(a.assignedAt)}</td>
                    <td className={`py-2 ${dateClass(a.equipment.nextCheckDate)}`}>{fmt(a.equipment.nextCheckDate)}</td>
                    <td className="py-2 text-right"><Button size="sm" variant="outline" onClick={() => ret(a.equipment.id)}><Undo2 className="w-3.5 h-3.5 mr-1" />Restituer</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {past.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-ink-900 mb-3 text-sm">Historique des restitutions</h3>
            <div className="divide-y divide-ink-900/5">
              {past.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="text-ink-700">{a.equipment.name}{a.equipment.serialNumber ? ` · ${a.equipment.serialNumber}` : ""}</span>
                  <span className="text-xs text-ink-400">{fmt(a.assignedAt)} → {fmt(a.returnedAt)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
