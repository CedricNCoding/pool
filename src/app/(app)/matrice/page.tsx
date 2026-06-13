"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Grid3x3, Loader2, FileDown, Search } from "lucide-react";
import { useSession } from "@/lib/hooks";

interface Cat { id: string; name: string; color: string; skills: { id: string; name: string }[] }
interface Row { id: string; firstName: string; lastName: string; service: string; company: { name: string; color: string } | null; levels: Record<string, number> }

const LEVEL_COLORS = ["#E5E7EB", "#Fde9cf", "#Fbd38d", "#F6ad55", "#ED8936", "#D97706"];
function cellColor(n: number) { return LEVEL_COLORS[Math.max(0, Math.min(5, n))]; }

export default function MatricePage() {
  const { user } = useSession();
  const isAdmin = user?.role === "admin";
  const [cats, setCats] = useState<Cat[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [catId, setCatId] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/skills-matrix").then((r) => r.json()).then((d) => {
      setCats(d.categories || []); setRows(d.technicians || []);
      if (d.categories?.[0] && !catId) setCatId(d.categories[0].id);
    }).finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const cat = cats.find((c) => c.id === catId);
  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return rows.filter((r) => !s || `${r.firstName} ${r.lastName}`.toLowerCase().includes(s));
  }, [rows, q]);

  async function setLevel(techId: string, skillId: string, level: number) {
    setRows((rs) => rs.map((r) => r.id === techId ? { ...r, levels: { ...r.levels, [skillId]: level } } : r));
    await fetch("/api/skills-matrix", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ technicianId: techId, skillId, level }) });
  }
  function cycle(techId: string, skillId: string, cur: number) { if (isAdmin) setLevel(techId, skillId, (cur + 1) % 6); }

  function exportCsv() {
    if (!cat) return;
    const header = ["Technicien", ...cat.skills.map((s) => s.name)];
    const lines = [header.join(";")];
    for (const r of filtered) lines.push([`${r.firstName} ${r.lastName}`, ...cat.skills.map((s) => r.levels[s.id] ?? 0)].join(";"));
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `matrice_${cat.name}.csv`; a.click();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3"><Grid3x3 className="w-6 h-6 text-ink-600" /><h1 className="text-2xl font-bold">Matrice de compétences</h1></div>
        <Button variant="outline" onClick={exportCsv} disabled={!cat}><FileDown className="w-4 h-4 mr-2" /> Export CSV</Button>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <select className="px-3 py-2 rounded-md border border-ink-900/15 bg-white text-ink-900 text-sm" value={catId} onChange={(e) => setCatId(e.target.value)}>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.skills.length})</option>)}
        </select>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <Input className="pl-8 w-56" placeholder="Filtrer un technicien…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-ink-400" />}
        <span className="text-xs text-ink-400 ml-auto">{isAdmin ? "Cliquez une case pour faire évoluer le niveau (0→5)." : "Lecture seule."}</span>
      </div>

      <Card>
        <CardContent className="p-0 overflow-auto max-h-[70vh]">
          <table className="text-sm border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-paper-bone">
                <th className="text-left py-2 px-3 sticky left-0 bg-paper-bone min-w-[170px] border-b border-ink-900/10">Technicien</th>
                {cat?.skills.map((s) => (
                  <th key={s.id} className="py-2 px-1 border-b border-ink-900/10 align-bottom h-28">
                    <div className="writing-vertical text-xs text-ink-600 font-medium" style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", whiteSpace: "nowrap", maxHeight: "100px" }}>{s.name}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-ink-900/5">
                  <td className="py-1 px-3 sticky left-0 bg-paper-bone">
                    <Link href={`/technicians/${r.id}`} className="font-medium hover:underline text-ink-900">{r.firstName} {r.lastName}</Link>
                    {r.company && <span className="block text-[10px] text-ink-400">{r.company.name}</span>}
                  </td>
                  {cat?.skills.map((s) => {
                    const lvl = r.levels[s.id] ?? 0;
                    return (
                      <td key={s.id} className="p-0.5 text-center">
                        <button
                          onClick={() => cycle(r.id, s.id, lvl)}
                          className={`w-8 h-8 rounded text-[11px] font-semibold ${isAdmin ? "cursor-pointer hover:ring-2 ring-signal-500/50" : "cursor-default"} ${lvl >= 4 ? "text-white" : "text-ink-700"}`}
                          style={{ backgroundColor: cellColor(lvl) }}
                          title={`${s.name} — niveau ${lvl}`}
                        >{lvl || ""}</button>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={(cat?.skills.length ?? 0) + 1} className="text-center py-10 text-ink-400">{loading ? "Chargement…" : "Aucun technicien."}</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
