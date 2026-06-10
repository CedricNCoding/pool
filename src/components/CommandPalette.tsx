"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, Building2, FolderKanban, GraduationCap, CornerDownLeft } from "lucide-react";

interface Item {
  id: string;
  label: string;
  sub: string;
  href: string;
}
interface Results {
  technicians: Item[];
  companies: Item[];
  projects: Item[];
  modules: Item[];
}
const EMPTY: Results = { technicians: [], companies: [], projects: [], modules: [] };

const GROUPS: { key: keyof Results; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "technicians", label: "Techniciens", icon: Users },
  { key: "companies", label: "Entreprises", icon: Building2 },
  { key: "projects", label: "Projets", icon: FolderKanban },
  { key: "modules", label: "Formation", icon: GraduationCap },
];

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Results>(EMPTY);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Liste a plat pour la navigation clavier
  const flat: Item[] = GROUPS.flatMap((g) => results[g.key]);

  // Raccourci Cmd/Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("avpool-command-open", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("avpool-command-open", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      setQ("");
      setResults(EMPTY);
      setActive(0);
    }
  }, [open]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (q.trim().length < 2) {
      setResults(EMPTY);
      return;
    }
    debounce.current = setTimeout(() => {
      fetch(`/api/search/global?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d: Results) => {
          setResults(d);
          setActive(0);
        })
        .catch(() => {});
    }, 200);
  }, [q]);

  const go = useCallback(
    (item: Item) => {
      setOpen(false);
      router.push(item.href);
    },
    [router]
  );

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(flat.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && flat[active]) {
      e.preventDefault();
      go(flat[active]);
    }
  }

  if (!open) return null;

  let flatIndex = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-black/60 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-ink-900/10 bg-paper-bone shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 border-b border-ink-900/10">
          <Search className="w-4 h-4 text-ink-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Rechercher un technicien, une entreprise, un projet..."
            className="flex-1 bg-transparent py-3.5 text-sm text-ink-900 outline-none placeholder:text-ink-400"
          />
          <kbd className="text-[10px] text-ink-400 border border-ink-900/10 rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        <div className="max-h-[55vh] overflow-y-auto py-2">
          {q.trim().length < 2 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-400">
              Tapez au moins 2 caracteres.
            </p>
          ) : flat.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-400">Aucun resultat.</p>
          ) : (
            GROUPS.map((g) => {
              const items = results[g.key];
              if (items.length === 0) return null;
              return (
                <div key={g.key} className="mb-1">
                  <p className="px-4 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400 flex items-center gap-1.5">
                    <g.icon className="w-3 h-3" /> {g.label}
                  </p>
                  {items.map((item) => {
                    flatIndex++;
                    const isActive = flatIndex === active;
                    return (
                      <button
                        key={item.id}
                        onClick={() => go(item)}
                        onMouseEnter={() => setActive(flat.indexOf(item))}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-2 text-left ${isActive ? "bg-white" : ""}`}
                      >
                        <span className="min-w-0">
                          <span className="block text-sm text-ink-900 truncate">{item.label}</span>
                          {item.sub && <span className="block text-xs text-ink-400 truncate">{item.sub}</span>}
                        </span>
                        {isActive && <CornerDownLeft className="w-3.5 h-3.5 text-ink-400 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
