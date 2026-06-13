import { Info } from "lucide-react";

// Encadré d'aide en tête de page : explique en une phrase à quoi sert l'écran
// et comment l'utiliser. Sobre, sur la charte (paper-2 + accent signal).
export default function PageHelp({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-ink-900/10 bg-paper-2 px-4 py-3 text-sm text-ink-600 mb-5">
      <Info className="w-4 h-4 mt-0.5 shrink-0 text-signal-500" />
      <p className="leading-relaxed">{children}</p>
    </div>
  );
}
