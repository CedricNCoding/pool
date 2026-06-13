"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Bell, Award, FileText, GraduationCap, Clock, AlertTriangle } from "lucide-react";

interface Item {
  id: string;
  kind: string;
  label: string;
  sub: string;
  href: string;
  days: number;
}

const KIND: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  cert: { icon: Award, color: "#10B981" },
  doc: { icon: FileText, color: "#06B6D4" },
  validation: { icon: GraduationCap, color: "#8B5CF6" },
  contract: { icon: Clock, color: "#F59E0B" },
  dossier: { icon: AlertTriangle, color: "#F97316" },
};

const PANEL_W = 360;

export default function NotificationBell() {
  const router = useRouter();
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);

  const load = useCallback(() => {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : { total: 0, items: [] }))
      .then((d) => {
        setItems(d.items || []);
        setTotal(d.total || 0);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  // Ancre le panneau (fixed) sur le bouton, quel que soit l'état de la sidebar
  // (repliée 68px / dépliée 264px / overlay mobile). Le panneau s'ouvre à droite
  // de la cloche et bascule à gauche s'il déborde du viewport.
  const place = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let left = r.right + 8;
    if (left + PANEL_W > window.innerWidth - 8) left = r.left - PANEL_W - 8;
    if (left < 8) left = Math.max(8, window.innerWidth - PANEL_W - 8);
    const top = Math.max(8, Math.min(r.top, window.innerHeight - 360));
    setPos({ top, left });
  }, []);

  function toggle() {
    if (!open) {
      place();
      load();
    }
    setOpen((o) => !o);
  }

  useEffect(() => {
    if (!open) return;
    const onResize = () => place();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, place]);

  function go(item: Item) {
    setOpen(false);
    router.push(item.href);
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="relative flex items-center justify-center h-9 w-9 shrink-0 rounded-md text-ink-300 bg-[rgba(245,242,235,0.04)] hover:bg-[rgba(245,242,235,0.08)] hover:text-paper transition-colors"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {total > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {/* Rendu via portal sur document.body : la sidebar a transform + overflow-hidden,
          ce qui « capturerait » un position:fixed enfant et le rognerait. */}
      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[61] w-[min(360px,calc(100vw-16px))] max-h-[70vh] overflow-hidden rounded-xl border border-ink-900/10 bg-paper-bone shadow-2xl flex flex-col"
            style={{ top: pos.top, left: pos.left }}
          >
            <div className="px-4 py-3 border-b border-ink-900/10 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink-900">Notifications</span>
              <span className="text-xs text-ink-400">{total} a traiter</span>
            </div>
            <div className="overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-ink-400">
                  Rien a signaler. Tout est a jour.
                </p>
              ) : (
                items.map((item) => {
                  const k = KIND[item.kind] ?? KIND.cert;
                  return (
                    <button
                      key={item.id}
                      onClick={() => go(item)}
                      className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-white border-b border-ink-900/10"
                    >
                      <span
                        className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: k.color + "20" }}
                      >
                        <k.icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm text-ink-900 truncate">{item.label}</span>
                        <span className="block text-xs" style={{ color: k.color }}>{item.sub}</span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}
