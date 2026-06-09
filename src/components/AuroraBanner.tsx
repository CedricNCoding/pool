"use client";

import { Loader2, CheckCircle, AlertTriangle, Sparkles } from "lucide-react";

type AuroraState = "idle" | "loading" | "done" | "error";

// Bandeau aurore Spektalis : tout appel IA affiche l'aurore (searching -> done/error),
// jamais un simple spinner.
export default function AuroraBanner({
  state,
  label,
}: {
  state: AuroraState;
  label?: string;
}) {
  if (state === "idle") return null;

  const gradient =
    state === "error"
      ? "linear-gradient(90deg,#7f1d1d,#b91c1c,#f97316,#b91c1c,#7f1d1d)"
      : state === "done"
        ? "linear-gradient(90deg,#065f46,#10b981,#06b6d4,#10b981,#065f46)"
        : "linear-gradient(90deg,#7c3aed,#2563eb,#06b6d4,#10b981,#7c3aed)";

  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-700">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: gradient,
          backgroundSize: "300% 100%",
          animation: state === "loading" ? "avpool-aurora 2.5s linear infinite" : "none",
        }}
      />
      <div className="relative flex items-center gap-2 px-3 py-2.5 text-sm text-slate-100">
        {state === "loading" && <Loader2 className="w-4 h-4 animate-spin text-fuchsia-300" />}
        {state === "done" && <CheckCircle className="w-4 h-4 text-emerald-300" />}
        {state === "error" && <AlertTriangle className="w-4 h-4 text-red-300" />}
        {state === "loading" && <Sparkles className="w-4 h-4 text-blue-300" />}
        <span>{label}</span>
      </div>
      <style>{`@keyframes avpool-aurora{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}`}</style>
    </div>
  );
}
