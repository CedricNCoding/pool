"use client";

import { useState, useEffect, useCallback } from "react";
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

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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

  function go(item: Item) {
    setOpen(false);
    router.push(item.href);
  }

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center justify-center w-9 rounded-lg text-ink-500 bg-paper-2 hover:bg-white hover:text-white transition-colors"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {total > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed left-[16.5rem] top-20 z-50 w-[370px] max-h-[70vh] overflow-hidden rounded-xl border border-ink-900/10 bg-paper-bone shadow-2xl flex flex-col">
            <div className="px-4 py-3 border-b border-ink-900/10 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink-900">Notifications</span>
              <span className="text-xs text-ink-9000">{total} a traiter</span>
            </div>
            <div className="overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-ink-9000">
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
        </>
      )}
    </>
  );
}
