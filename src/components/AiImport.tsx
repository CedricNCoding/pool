"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Sparkles, Loader2 } from "lucide-react";
import AuroraBanner from "@/components/AuroraBanner";

interface Suggest {
  skills: { id: string; name: string; color: string; family: string }[];
  certs: { id: string; name: string; issuer: string; color: string }[];
  tags: string[];
  mode: string;
}
type AuroraState = "idle" | "loading" | "done" | "error";

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  let text = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it) => ("str" in it ? it.str : "")).join(" ") + "\n";
  }
  return text;
}

export default function AiImport({
  technicianId,
  onApplied,
}: {
  technicianId: string;
  onApplied: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pasted, setPasted] = useState("");
  const [aurora, setAurora] = useState<AuroraState>("idle");
  const [auroraLabel, setAuroraLabel] = useState("");
  const [suggest, setSuggest] = useState<Suggest | null>(null);
  const [selSkills, setSelSkills] = useState<Set<string>>(new Set());
  const [selCerts, setSelCerts] = useState<Set<string>>(new Set());
  const [selTags, setSelTags] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);

  function reset() {
    setSuggest(null);
    setPasted("");
    setAurora("idle");
    setSelSkills(new Set());
    setSelCerts(new Set());
    setSelTags(new Set());
  }

  async function analyze(file?: File) {
    setAurora("loading");
    setAuroraLabel("Analyse du document en cours...");
    setSuggest(null);
    let text = pasted;
    if (file) {
      try {
        text = await extractPdfText(file);
      } catch {
        setAurora("error");
        setAuroraLabel("Lecture du PDF impossible — collez le texte ci-dessous.");
        return;
      }
    }
    if (!text || text.trim().length < 10) {
      setAurora("error");
      setAuroraLabel("Texte insuffisant. Choisissez un PDF ou collez le contenu.");
      return;
    }
    try {
      const res = await fetch("/api/ai/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data: Suggest = await res.json();
      setSuggest(data);
      setSelSkills(new Set(data.skills.map((s) => s.id)));
      setSelCerts(new Set(data.certs.map((c) => c.id)));
      setSelTags(new Set(data.tags));
      const n = data.skills.length + data.certs.length + data.tags.length;
      setAurora(n > 0 ? "done" : "error");
      setAuroraLabel(
        n > 0
          ? `${n} element(s) detecte(s)${data.mode === "ai" ? " (IA)" : ""}.`
          : "Aucune correspondance trouvee dans le referentiel."
      );
    } catch {
      setAurora("error");
      setAuroraLabel("Echec de l'analyse.");
    }
  }

  async function apply() {
    if (!suggest) return;
    setApplying(true);
    try {
      const tech = await fetch(`/api/technicians/${technicianId}`).then((r) => r.json());

      // Competences : fusion avec l'existant (nouvelles au niveau 2), envoi complet
      const map = new Map<string, number>(
        (tech.skills ?? []).map((s: { skillId: string; level: number }) => [s.skillId, s.level])
      );
      selSkills.forEach((id) => {
        if (!map.has(id)) map.set(id, 2);
      });
      await fetch(`/api/technicians/${technicianId}/skills`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills: [...map].map(([skillId, level]) => ({ skillId, level })) }),
      });

      // Etiquettes : fusion
      const tags = [
        ...new Set([
          ...((tech.tags ?? []) as { name: string }[]).map((t) => t.name),
          ...selTags,
        ]),
      ];
      await fetch(`/api/technicians/${technicianId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags }),
      });

      // Certifications : ajout avec date du jour (a affiner ensuite)
      const today = new Date().toISOString().slice(0, 10);
      await Promise.all(
        [...selCerts].map((certificationId) =>
          fetch(`/api/technicians/${technicianId}/certifications`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ certificationId, obtainedDate: today }),
          })
        )
      );

      setApplying(false);
      setOpen(false);
      reset();
      onApplied();
    } catch {
      setApplying(false);
    }
  }

  function toggle(set: Set<string>, setter: (s: Set<string>) => void, id: string) {
    const n = new Set(set);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setter(n);
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="no-print"
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <Sparkles className="w-4 h-4 mr-1" /> Importer (IA)
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-fuchsia-400" /> Extraction depuis un CV / certificat
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <p className="text-sm text-slate-400">
              Deposez un PDF (CV, attestation) ou collez le texte. Les competences,
              certifications et attributs reconnus dans le referentiel sont proposes.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) analyze(f);
                }}
                className="text-sm text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-700 file:text-slate-100 file:cursor-pointer"
              />
            </div>

            <div>
              <Label>...ou coller le texte</Label>
              <Textarea
                rows={4}
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                placeholder="Coller ici le contenu d'un CV ou d'une attestation..."
              />
              <Button size="sm" variant="outline" className="mt-2" disabled={pasted.trim().length < 10} onClick={() => analyze()}>
                <Sparkles className="w-4 h-4 mr-1" /> Analyser le texte
              </Button>
            </div>

            <AuroraBanner state={aurora} label={auroraLabel} />

            {suggest && (aurora === "done") && (
              <div className="space-y-4">
                {suggest.skills.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 mb-1.5">Competences</p>
                    <div className="flex flex-wrap gap-2">
                      {suggest.skills.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => toggle(selSkills, setSelSkills, s.id)}
                          className={`text-xs px-2 py-1 rounded-full border transition ${selSkills.has(s.id) ? "" : "opacity-40"}`}
                          style={{ borderColor: s.color + "66", color: s.color }}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {suggest.certs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 mb-1.5">Certifications / habilitations</p>
                    <div className="flex flex-wrap gap-2">
                      {suggest.certs.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => toggle(selCerts, setSelCerts, c.id)}
                          className={`text-xs px-2 py-1 rounded-full border transition ${selCerts.has(c.id) ? "" : "opacity-40"}`}
                          style={{ borderColor: c.color + "66", color: c.color }}
                          title={c.issuer}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {suggest.tags.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 mb-1.5">Etiquettes</p>
                    <div className="flex flex-wrap gap-2">
                      {suggest.tags.map((t) => (
                        <button
                          key={t}
                          onClick={() => toggle(selTags, setSelTags, t)}
                          className={`text-xs px-2 py-1 rounded-full border border-slate-600 text-slate-200 transition ${selTags.has(t) ? "" : "opacity-40"}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-slate-500">
                  Cliquez pour (de)selectionner. Les competences ajoutees le sont au niveau 2
                  (a ajuster), les certifications avec la date du jour.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Fermer</Button>
            <Button
              onClick={apply}
              disabled={applying || !suggest || aurora !== "done" || (selSkills.size + selCerts.size + selTags.size === 0)}
            >
              {applying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Appliquer a la fiche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
